use anyhow::Result;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use uuid::Uuid;

use super::container_pool::{ContainerPool, PoolConfig};
use super::docker::DockerService;

/// Cache entry for compilation results
#[derive(Debug, Clone)]
struct CacheEntry {
    result: CompilationResult,
    created_at: Instant,
    hit_count: u32,
}

/// Optimized compiler service with container pooling and caching
#[derive(Clone)]
pub struct OptimizedCompilerService {
    pool: Arc<ContainerPool>,
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    cache_ttl: std::time::Duration,
    max_cache_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationRequest {
    pub user_id: String,
    pub project_id: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationResult {
    pub success: bool,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub details: CompilationDetails,
    pub abi: Option<serde_json::Value>,
    pub bytecode: Option<String>,
    pub cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationDetails {
    pub status: String,
    pub compilation_time: f64,
    pub project_path: String,
    pub container_id: Option<String>,
    pub cache_hit: bool,
}

impl OptimizedCompilerService {
    pub async fn new(docker: DockerService) -> Result<Self> {
        // Configure container pool
        let pool_config = PoolConfig {
            min_pool_size: 5,
            max_pool_size: 20,
            max_container_age: std::time::Duration::from_secs(3600),
            max_container_uses: 50,
            idle_timeout: std::time::Duration::from_secs(300),
            warmup_command: vec![
                "cargo".to_string(),
                "stylus".to_string(),
                "--version".to_string(),
            ],
        };

        let pool = ContainerPool::new(
            docker.get_docker().clone(),
            docker.get_config().clone(),
            pool_config,
        ).await?;

        Ok(Self {
            pool: Arc::new(pool),
            cache: Arc::new(Mutex::new(HashMap::new())),
            cache_ttl: std::time::Duration::from_secs(1800), // 30 minutes
            max_cache_size: 1000,
        })
    }

    /// Compile a contract with caching and pooling
    pub async fn compile_contract(&self, request: CompilationRequest) -> Result<CompilationResult> {
        let start_time = Instant::now();
        
        // Generate cache key from code hash
        let cache_key = self.generate_cache_key(&request.code);
        
        // Check cache first
        if let Some(cached_result) = self.get_from_cache(&cache_key).await {
            info!("Cache hit for compilation request from user {}", request.user_id);
            return Ok(cached_result);
        }

        info!("Cache miss, compiling contract for user {}", request.user_id);
        
        // Acquire container from pool
        let container_id = self.pool
            .acquire(&request.user_id)
            .await
            .map_err(|e| {
                error!("Failed to acquire container: {}", e);
                e
            })?;

        info!("Acquired container {} for user {}", container_id, request.user_id);

        // Compile in the pooled container
        let result = match self.compile_in_container(&container_id, request.clone()).await {
            Ok(mut result) => {
                result.details.container_id = Some(container_id.clone());
                result.details.compilation_time = start_time.elapsed().as_secs_f64();
                result
            }
            Err(e) => {
                error!("Compilation failed: {}", e);
                // Release container even on error
                let _ = self.pool.release(&container_id).await;
                return Err(e);
            }
        };

        // Release container back to pool
        if let Err(e) = self.pool.release(&container_id).await {
            error!("Failed to release container {}: {}", container_id, e);
        }

        // Store in cache if successful
        if result.success {
            self.store_in_cache(cache_key, result.clone()).await;
        }

        Ok(result)
    }

    /// Compile in a specific container
    async fn compile_in_container(
        &self,
        container_id: &str,
        request: CompilationRequest,
    ) -> Result<CompilationResult> {
        let project_name = format!("project_{}", Uuid::new_v4().to_string().replace("-", ""));
        let project_path = format!("/workspace/{}", project_name);
        
        // Initialize project structure
        let init_commands = vec![
            vec!["mkdir".to_string(), "-p".to_string(), project_path.clone()],
            vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("cd /workspace && cargo stylus new {} --minimal", project_name),
            ],
        ];

        for cmd in init_commands {
            let (stdout, stderr) = self.pool.execute_in_container(container_id, cmd).await?;
            if !stderr.is_empty() && stderr.contains("error") {
                return Err(anyhow::anyhow!("Failed to initialize project: {}", stderr));
            }
        }

        // Write the user's code
        let write_code_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!(
                "cat > {}/src/lib.rs << 'EOCODE'\n{}\nEOCODE",
                project_path, request.code
            ),
        ];
        self.pool.execute_in_container(container_id, write_code_cmd).await?;

        // Update Cargo.toml with dependencies
        let update_cargo_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!(
                r#"cd {} && cat > Cargo.toml << 'EOTOML'
[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[dependencies]
stylus-sdk = "0.9.0"
alloy-primitives = "1.3"
alloy-sol-types = "1.3"

[features]
export-abi = ["stylus-sdk/export-abi"]

[profile.release]
codegen-units = 1
strip = true
lto = true
panic = "abort"
opt-level = "s"
EOTOML"#,
                project_path, project_name
            ),
        ];
        self.pool.execute_in_container(container_id, update_cargo_cmd).await?;

        // Compile the contract
        let compile_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("cd {} && cargo stylus check 2>&1", project_path),
        ];
        
        let (stdout, stderr) = self.pool.execute_in_container(container_id, compile_cmd).await?;
        let success = !stdout.contains("error") && !stderr.contains("error");
        
        let mut result = CompilationResult {
            success,
            exit_code: if success { 0 } else { 1 },
            stdout: stdout.clone(),
            stderr: stderr.clone(),
            details: CompilationDetails {
                status: if success { "success".to_string() } else { "failed".to_string() },
                compilation_time: 0.0, // Will be set by caller
                project_path: project_path.clone(),
                container_id: None, // Will be set by caller
                cache_hit: false,
            },
            abi: None,
            bytecode: None,
            cached: false,
        };

        // If successful, try to export ABI
        if success {
            let abi_cmd = vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("cd {} && cargo stylus export-abi 2>/dev/null", project_path),
            ];
            
            if let Ok((abi_output, _)) = self.pool.execute_in_container(container_id, abi_cmd).await {
                if !abi_output.trim().is_empty() {
                    if let Ok(abi) = serde_json::from_str(&abi_output) {
                        result.abi = Some(abi);
                    }
                }
            }

            // Build WASM bytecode
            let build_cmd = vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("cd {} && cargo stylus build --release 2>&1", project_path),
            ];
            
            if let Ok((build_out, build_err)) = self.pool.execute_in_container(container_id, build_cmd).await {
                if !build_out.contains("error") && !build_err.contains("error") {
                    // Read the compiled WASM file
                    let read_wasm_cmd = vec![
                        "sh".to_string(),
                        "-c".to_string(),
                        format!(
                            "find {}/target/wasm32-unknown-unknown/release -name '*.wasm' -type f | head -1 | xargs xxd -p | tr -d '\\n'",
                            project_path
                        ),
                    ];
                    
                    if let Ok((bytecode, _)) = self.pool.execute_in_container(container_id, read_wasm_cmd).await {
                        if !bytecode.trim().is_empty() {
                            result.bytecode = Some(bytecode.trim().to_string());
                        }
                    }
                }
            }
        }

        // Clean up project directory
        let cleanup_cmd = vec![
            "rm".to_string(),
            "-rf".to_string(),
            project_path,
        ];
        let _ = self.pool.execute_in_container(container_id, cleanup_cmd).await;

        Ok(result)
    }

    /// Generate cache key from code
    fn generate_cache_key(&self, code: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(code.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Get result from cache
    async fn get_from_cache(&self, key: &str) -> Option<CompilationResult> {
        let mut cache = self.cache.lock().await;
        
        if let Some(entry) = cache.get_mut(key) {
            // Check if entry is still valid
            if entry.created_at.elapsed() < self.cache_ttl {
                entry.hit_count += 1;
                let mut result = entry.result.clone();
                result.cached = true;
                result.details.cache_hit = true;
                return Some(result);
            } else {
                // Remove expired entry
                cache.remove(key);
            }
        }
        
        None
    }

    /// Store result in cache
    async fn store_in_cache(&self, key: String, result: CompilationResult) {
        let mut cache = self.cache.lock().await;
        
        // Implement LRU eviction if cache is full
        if cache.len() >= self.max_cache_size {
            // Find and remove least recently used entry
            if let Some(lru_key) = cache
                .iter()
                .min_by_key(|(_, entry)| entry.created_at)
                .map(|(k, _)| k.clone())
            {
                cache.remove(&lru_key);
            }
        }
        
        cache.insert(key, CacheEntry {
            result,
            created_at: Instant::now(),
            hit_count: 0,
        });
    }

    /// Get cache statistics
    pub async fn get_cache_stats(&self) -> CacheStats {
        let cache = self.cache.lock().await;
        
        let total_entries = cache.len();
        let total_hits: u32 = cache.values().map(|e| e.hit_count).sum();
        let avg_age = if !cache.is_empty() {
            let total_age: u64 = cache.values()
                .map(|e| e.created_at.elapsed().as_secs())
                .sum();
            total_age as f64 / cache.len() as f64
        } else {
            0.0
        };
        
        CacheStats {
            total_entries,
            total_hits,
            average_age_seconds: avg_age,
            cache_size_bytes: total_entries * std::mem::size_of::<CacheEntry>(), // Approximate
        }
    }

    /// Clear the cache
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.lock().await;
        cache.clear();
        info!("Compilation cache cleared");
    }

    /// Get pool statistics
    pub async fn get_pool_stats(&self) -> super::container_pool::PoolStats {
        self.pool.get_stats().await
    }

    /// Shutdown the service
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down optimized compiler service");
        self.pool.shutdown().await?;
        self.clear_cache().await;
        Ok(())
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub total_entries: usize,
    pub total_hits: u32,
    pub average_age_seconds: f64,
    pub cache_size_bytes: usize,
}