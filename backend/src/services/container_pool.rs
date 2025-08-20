use anyhow::Result;
use bollard::container::{Config as ContainerConfig, CreateContainerOptions, RemoveContainerOptions, StartContainerOptions};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::Docker;
use futures_util::StreamExt;
use log::{error, info, warn};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};
use tokio::time::sleep;
use uuid::Uuid;

use crate::config::DockerConfig;

/// Container state in the pool
#[derive(Debug, Clone)]
pub enum ContainerState {
    Available,
    InUse { user_id: String, started_at: Instant },
    Warming,
    Draining,
}

/// Container information in the pool
#[derive(Debug, Clone)]
pub struct PooledContainer {
    pub id: String,
    pub name: String,
    pub state: ContainerState,
    pub created_at: Instant,
    pub last_used: Instant,
    pub use_count: u32,
}

/// Configuration for the container pool
#[derive(Debug, Clone)]
pub struct PoolConfig {
    pub min_pool_size: usize,
    pub max_pool_size: usize,
    pub max_container_age: Duration,
    pub max_container_uses: u32,
    pub idle_timeout: Duration,
    pub warmup_command: Vec<String>,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            min_pool_size: 5,
            max_pool_size: 20,
            max_container_age: Duration::from_secs(3600), // 1 hour
            max_container_uses: 50,
            idle_timeout: Duration::from_secs(300), // 5 minutes
            warmup_command: vec!["cargo".to_string(), "--version".to_string()],
        }
    }
}

/// Optimized container pool for handling multiple concurrent compilations
pub struct ContainerPool {
    docker: Docker,
    config: DockerConfig,
    pool_config: PoolConfig,
    containers: Arc<Mutex<HashMap<String, PooledContainer>>>,
    available_queue: Arc<Mutex<VecDeque<String>>>,
    semaphore: Arc<Semaphore>,
    shutdown: Arc<Mutex<bool>>,
}

impl ContainerPool {
    pub async fn new(docker: Docker, config: DockerConfig, pool_config: PoolConfig) -> Result<Self> {
        let max_pool_size = pool_config.max_pool_size;
        let pool = Self {
            docker,
            config,
            pool_config,
            containers: Arc::new(Mutex::new(HashMap::new())),
            available_queue: Arc::new(Mutex::new(VecDeque::new())),
            semaphore: Arc::new(Semaphore::new(max_pool_size)),
            shutdown: Arc::new(Mutex::new(false)),
        };

        // Initialize the pool with minimum containers
        pool.initialize_pool().await?;

        // Start background maintenance task
        pool.start_maintenance_task();

        Ok(pool)
    }

    /// Initialize the pool with minimum number of containers
    async fn initialize_pool(&self) -> Result<()> {
        info!("Initializing container pool with {} containers", self.pool_config.min_pool_size);
        
        for _ in 0..self.pool_config.min_pool_size {
            match self.create_container().await {
                Ok(container_id) => {
                    info!("Created container: {}", container_id);
                    self.mark_available(&container_id).await?;
                }
                Err(e) => {
                    error!("Failed to create container: {}", e);
                }
            }
        }

        Ok(())
    }

    /// Create a new container for the pool
    async fn create_container(&self) -> Result<String> {
        let container_name = format!("wizard-pool-{}", Uuid::new_v4());
        
        // Container configuration optimized for quick startup
        let mut tmpfs_map = HashMap::new();
        tmpfs_map.insert("/tmp".to_string(), "rw,noexec,nosuid,size=100m".to_string());
        tmpfs_map.insert("/workspace".to_string(), "rw,exec,size=400m".to_string());

        let host_config = bollard::models::HostConfig {
            memory: Some(parse_memory_limit(&self.config.memory_limit)?),
            cpu_quota: Some((self.config.cpu_limit * 100000.0) as i64),
            cpu_period: Some(100000),
            security_opt: Some(vec!["no-new-privileges".to_string()]),
            tmpfs: Some(tmpfs_map),
            auto_remove: Some(false), // Keep containers for reuse
            ..Default::default()
        };

        let config = ContainerConfig {
            image: Some(self.config.sandbox_image.clone()),
            host_config: Some(host_config),
            working_dir: Some("/workspace".to_string()),
            user: Some("wizard".to_string()),
            attach_stdin: Some(true),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            tty: Some(true),
            cmd: Some(vec!["/bin/bash".to_string()]), // Keep container running
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: container_name.clone(),
            platform: None,
        };

        let container = self.docker.create_container(Some(options), config).await?;
        
        // Start the container
        self.docker
            .start_container(&container.id, None::<StartContainerOptions<String>>)
            .await?;

        // Warm up the container
        self.warmup_container(&container.id).await?;

        // Store container information
        let mut containers = self.containers.lock().await;
        containers.insert(
            container.id.clone(),
            PooledContainer {
                id: container.id.clone(),
                name: container_name,
                state: ContainerState::Available,
                created_at: Instant::now(),
                last_used: Instant::now(),
                use_count: 0,
            },
        );

        Ok(container.id)
    }

    /// Warm up a container by running initialization commands
    async fn warmup_container(&self, container_id: &str) -> Result<()> {
        if !self.pool_config.warmup_command.is_empty() {
            let exec_config = CreateExecOptions {
                cmd: Some(self.pool_config.warmup_command.clone()),
                attach_stdout: Some(true),
                attach_stderr: Some(true),
                ..Default::default()
            };

            let exec = self.docker.create_exec(container_id, exec_config).await?;
            
            if let StartExecResults::Attached { mut output, .. } = 
                self.docker.start_exec(&exec.id, None).await? 
            {
                // Consume output to complete the warmup
                while let Some(Ok(_)) = output.next().await {}
            }
        }

        Ok(())
    }

    /// Acquire a container from the pool
    pub async fn acquire(&self, user_id: &str) -> Result<String> {
        // Wait for permit (rate limiting)
        let _permit = self.semaphore.acquire().await?;

        // Try to get an available container
        let mut available_queue = self.available_queue.lock().await;
        
        if let Some(container_id) = available_queue.pop_front() {
            // Mark container as in use
            let mut containers = self.containers.lock().await;
            if let Some(container) = containers.get_mut(&container_id) {
                container.state = ContainerState::InUse {
                    user_id: user_id.to_string(),
                    started_at: Instant::now(),
                };
                container.last_used = Instant::now();
                container.use_count += 1;
                
                info!("Container {} acquired by user {}", container_id, user_id);
                return Ok(container_id);
            }
        }

        // No available containers, create a new one if below max
        let containers = self.containers.lock().await;
        if containers.len() < self.pool_config.max_pool_size {
            drop(containers); // Release lock before creating
            
            let container_id = self.create_container().await?;
            
            // Mark as in use immediately
            let mut containers = self.containers.lock().await;
            if let Some(container) = containers.get_mut(&container_id) {
                container.state = ContainerState::InUse {
                    user_id: user_id.to_string(),
                    started_at: Instant::now(),
                };
                container.use_count = 1;
            }
            
            info!("New container {} created and acquired by user {}", container_id, user_id);
            return Ok(container_id);
        }

        Err(anyhow::anyhow!("No containers available in pool"))
    }

    /// Release a container back to the pool
    pub async fn release(&self, container_id: &str) -> Result<()> {
        let mut containers = self.containers.lock().await;
        
        if let Some(container) = containers.get_mut(container_id) {
            // Check if container should be retired
            let should_retire = container.use_count >= self.pool_config.max_container_uses
                || container.created_at.elapsed() > self.pool_config.max_container_age;

            if should_retire {
                container.state = ContainerState::Draining;
                drop(containers);
                
                // Remove the container
                self.remove_container(container_id).await?;
                
                // Create a replacement if below minimum
                let containers = self.containers.lock().await;
                if containers.len() < self.pool_config.min_pool_size {
                    drop(containers);
                    self.create_container().await?;
                }
            } else {
                // Clean the container for reuse
                container.state = ContainerState::Warming;
                drop(containers);
                
                self.cleanup_container(container_id).await?;
                self.mark_available(container_id).await?;
            }
            
            info!("Container {} released", container_id);
        }

        Ok(())
    }

    /// Clean up a container for reuse
    async fn cleanup_container(&self, container_id: &str) -> Result<()> {
        // Remove any temporary files
        let cleanup_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            "rm -rf /workspace/* /tmp/* 2>/dev/null || true".to_string(),
        ];

        let exec_config = CreateExecOptions {
            cmd: Some(cleanup_cmd),
            attach_stdout: Some(false),
            attach_stderr: Some(false),
            ..Default::default()
        };

        let exec = self.docker.create_exec(container_id, exec_config).await?;
        self.docker.start_exec(&exec.id, None).await?;

        Ok(())
    }

    /// Mark a container as available
    async fn mark_available(&self, container_id: &str) -> Result<()> {
        let mut containers = self.containers.lock().await;
        
        if let Some(container) = containers.get_mut(container_id) {
            container.state = ContainerState::Available;
            container.last_used = Instant::now();
            
            let mut available_queue = self.available_queue.lock().await;
            available_queue.push_back(container_id.to_string());
        }

        Ok(())
    }

    /// Remove a container from the pool
    async fn remove_container(&self, container_id: &str) -> Result<()> {
        // Remove from Docker
        let options = RemoveContainerOptions {
            force: true,
            ..Default::default()
        };
        
        self.docker.remove_container(container_id, Some(options)).await?;
        
        // Remove from pool
        let mut containers = self.containers.lock().await;
        containers.remove(container_id);
        
        // Remove from available queue if present
        let mut available_queue = self.available_queue.lock().await;
        available_queue.retain(|id| id != container_id);
        
        info!("Container {} removed from pool", container_id);
        Ok(())
    }

    /// Start background maintenance task
    fn start_maintenance_task(&self) {
        let containers = Arc::clone(&self.containers);
        let available_queue = Arc::clone(&self.available_queue);
        let shutdown = Arc::clone(&self.shutdown);
        let docker = self.docker.clone();
        let pool_config = self.pool_config.clone();
        let docker_config = self.config.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                // Check shutdown flag
                if *shutdown.lock().await {
                    break;
                }

                // Clean up idle containers
                let now = Instant::now();
                let mut to_remove = Vec::new();
                
                {
                    let containers_map = containers.lock().await;
                    for (id, container) in containers_map.iter() {
                        if matches!(container.state, ContainerState::Available) {
                            if now.duration_since(container.last_used) > pool_config.idle_timeout {
                                to_remove.push(id.clone());
                            }
                        }
                    }
                }

                // Remove idle containers
                for container_id in to_remove {
                    let options = RemoveContainerOptions {
                        force: true,
                        ..Default::default()
                    };
                    
                    if let Err(e) = docker.remove_container(&container_id, Some(options)).await {
                        error!("Failed to remove idle container {}: {}", container_id, e);
                    }
                    
                    let mut containers_map = containers.lock().await;
                    containers_map.remove(&container_id);
                    
                    let mut queue = available_queue.lock().await;
                    queue.retain(|id| id != &container_id);
                }

                // Ensure minimum pool size
                let current_size = containers.lock().await.len();
                if current_size < pool_config.min_pool_size {
                    let to_create = pool_config.min_pool_size - current_size;
                    info!("Pool size below minimum, creating {} containers", to_create);
                    
                    // Create containers in background
                    for _ in 0..to_create {
                        // Clone necessary values for the spawned task
                        let docker_clone = docker.clone();
                        let docker_config_clone = docker_config.clone();
                        let containers_clone = Arc::clone(&containers);
                        let available_queue_clone = Arc::clone(&available_queue);
                        
                        tokio::spawn(async move {
                            // Simplified container creation for maintenance
                            match create_maintenance_container(docker_clone, docker_config_clone).await {
                                Ok((container_id, container_name)) => {
                                    let mut containers_map = containers_clone.lock().await;
                                    containers_map.insert(
                                        container_id.clone(),
                                        PooledContainer {
                                            id: container_id.clone(),
                                            name: container_name,
                                            state: ContainerState::Available,
                                            created_at: Instant::now(),
                                            last_used: Instant::now(),
                                            use_count: 0,
                                        },
                                    );
                                    
                                    let mut queue = available_queue_clone.lock().await;
                                    queue.push_back(container_id);
                                }
                                Err(e) => {
                                    error!("Failed to create maintenance container: {}", e);
                                }
                            }
                        });
                    }
                }
            }
            
            info!("Container pool maintenance task shutting down");
        });
    }

    /// Execute a command in a pooled container
    pub async fn execute_in_container(
        &self,
        container_id: &str,
        command: Vec<String>,
    ) -> Result<(String, String)> {
        let exec_config = CreateExecOptions {
            cmd: Some(command),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        };

        let exec = self.docker.create_exec(container_id, exec_config).await?;
        
        if let StartExecResults::Attached { mut output, .. } = 
            self.docker.start_exec(&exec.id, None).await? 
        {
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();

            while let Some(Ok(msg)) = output.next().await {
                match msg {
                    bollard::container::LogOutput::StdOut { message } => {
                        stdout.extend_from_slice(&message);
                    }
                    bollard::container::LogOutput::StdErr { message } => {
                        stderr.extend_from_slice(&message);
                    }
                    _ => {}
                }
            }

            Ok((
                String::from_utf8_lossy(&stdout).to_string(),
                String::from_utf8_lossy(&stderr).to_string(),
            ))
        } else {
            Err(anyhow::anyhow!("Failed to attach to exec"))
        }
    }

    /// Shutdown the pool gracefully
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down container pool");
        
        // Set shutdown flag
        *self.shutdown.lock().await = true;
        
        // Wait a bit for maintenance task to stop
        sleep(Duration::from_secs(1)).await;
        
        // Remove all containers
        let containers = self.containers.lock().await;
        for container_id in containers.keys() {
            let options = RemoveContainerOptions {
                force: true,
                ..Default::default()
            };
            
            if let Err(e) = self.docker.remove_container(container_id, Some(options)).await {
                error!("Failed to remove container during shutdown: {}", e);
            }
        }
        
        info!("Container pool shutdown complete");
        Ok(())
    }

    /// Get pool statistics
    pub async fn get_stats(&self) -> PoolStats {
        let containers = self.containers.lock().await;
        let available_queue = self.available_queue.lock().await;
        
        let mut stats = PoolStats {
            total_containers: containers.len(),
            available_containers: available_queue.len(),
            in_use_containers: 0,
            warming_containers: 0,
            draining_containers: 0,
            average_use_count: 0.0,
        };

        let mut total_use_count = 0u32;
        for container in containers.values() {
            total_use_count += container.use_count;
            
            match &container.state {
                ContainerState::InUse { .. } => stats.in_use_containers += 1,
                ContainerState::Warming => stats.warming_containers += 1,
                ContainerState::Draining => stats.draining_containers += 1,
                _ => {}
            }
        }

        if !containers.is_empty() {
            stats.average_use_count = total_use_count as f64 / containers.len() as f64;
        }

        stats
    }
}

/// Pool statistics
#[derive(Debug, Clone)]
pub struct PoolStats {
    pub total_containers: usize,
    pub available_containers: usize,
    pub in_use_containers: usize,
    pub warming_containers: usize,
    pub draining_containers: usize,
    pub average_use_count: f64,
}

/// Helper function to parse memory limit string
fn parse_memory_limit(limit: &str) -> Result<i64> {
    let limit = limit.to_lowercase();
    let (value, unit) = if limit.ends_with("gb") || limit.ends_with("g") {
        (limit.trim_end_matches(|c| c == 'g' || c == 'b'), 1_073_741_824)
    } else if limit.ends_with("mb") || limit.ends_with("m") {
        (limit.trim_end_matches(|c| c == 'm' || c == 'b'), 1_048_576)
    } else if limit.ends_with("kb") || limit.ends_with("k") {
        (limit.trim_end_matches(|c| c == 'k' || c == 'b'), 1024)
    } else {
        (limit.as_str(), 1)
    };

    let value: i64 = value.parse()?;
    Ok(value * unit)
}

/// Helper function for creating containers in maintenance task
async fn create_maintenance_container(
    docker: Docker,
    config: DockerConfig,
) -> Result<(String, String)> {
    let container_name = format!("wizard-pool-{}", Uuid::new_v4());
    
    let mut tmpfs_map = HashMap::new();
    tmpfs_map.insert("/tmp".to_string(), "rw,noexec,nosuid,size=100m".to_string());
    tmpfs_map.insert("/workspace".to_string(), "rw,exec,size=400m".to_string());

    let host_config = bollard::models::HostConfig {
        memory: Some(parse_memory_limit(&config.memory_limit)?),
        cpu_quota: Some((config.cpu_limit * 100000.0) as i64),
        cpu_period: Some(100000),
        security_opt: Some(vec!["no-new-privileges".to_string()]),
        tmpfs: Some(tmpfs_map),
        auto_remove: Some(false),
        ..Default::default()
    };

    let container_config = ContainerConfig {
        image: Some(config.sandbox_image.clone()),
        host_config: Some(host_config),
        working_dir: Some("/workspace".to_string()),
        user: Some("wizard".to_string()),
        cmd: Some(vec!["/bin/bash".to_string()]),
        ..Default::default()
    };

    let options = CreateContainerOptions {
        name: container_name.clone(),
        platform: None,
    };

    let container = docker.create_container(Some(options), container_config).await?;
    docker.start_container(&container.id, None::<StartContainerOptions<String>>).await?;
    
    Ok((container.id, container_name))
}