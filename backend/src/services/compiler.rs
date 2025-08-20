use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::docker::DockerService;

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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilationDetails {
    pub status: String,
    pub compilation_time: f64,
    pub project_path: String,
}

#[derive(Clone)]
pub struct CompilerService {
    docker: DockerService,
}

impl CompilerService {
    pub fn new(docker: DockerService) -> Self {
        Self { docker }
    }

    pub async fn compile_contract(&self, request: CompilationRequest) -> Result<CompilationResult> {
        let start_time = std::time::Instant::now();
        
        // Create a sandbox container for compilation
        let container_id = self.docker
            .create_sandbox(&request.user_id, &request.project_id)
            .await?;

        // Create project directory structure
        let project_name = format!("project_{}", Uuid::new_v4());
        let project_path = format!("/home/wizard/{}", project_name);
        
        // Initialize Stylus project
        let init_commands = vec![
            vec!["mkdir".to_string(), "-p".to_string(), project_path.clone()],
            vec!["cargo".to_string(), "stylus".to_string(), "new".to_string(), project_name.clone(), "--minimal".to_string()],
        ];

        for cmd in init_commands {
            self.docker.execute_command(&container_id, cmd).await?;
        }

        // Write the user's code to src/lib.rs
        let write_code_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("cat > {}/src/lib.rs << 'EOF'\n{}\nEOF", project_path, request.code),
        ];
        self.docker.execute_command(&container_id, write_code_cmd).await?;

        // Add necessary dependencies to Cargo.toml
        let update_cargo_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!(
                r#"cd {} && cat >> Cargo.toml << 'EOF'
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
EOF"#,
                project_path
            ),
        ];
        self.docker.execute_command(&container_id, update_cargo_cmd).await?;

        // Compile the contract
        let compile_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("cd {} && cargo stylus check", project_path),
        ];
        
        let (stdout, stderr) = self.docker.execute_command(&container_id, compile_cmd).await?;
        let success = stderr.is_empty() || !stderr.contains("error");
        
        let mut result = CompilationResult {
            success,
            exit_code: if success { 0 } else { 1 },
            stdout: stdout.clone(),
            stderr: stderr.clone(),
            details: CompilationDetails {
                status: if success { "success".to_string() } else { "failed".to_string() },
                compilation_time: start_time.elapsed().as_secs_f64(),
                project_path: project_path.clone(),
            },
            abi: None,
            bytecode: None,
        };

        // If compilation succeeded, try to export ABI
        if success {
            let abi_cmd = vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("cd {} && cargo stylus export-abi", project_path),
            ];
            
            if let Ok((abi_output, _)) = self.docker.execute_command(&container_id, abi_cmd).await {
                if let Ok(abi) = serde_json::from_str(&abi_output) {
                    result.abi = Some(abi);
                }
            }

            // Build the WASM bytecode
            let build_cmd = vec![
                "sh".to_string(),
                "-c".to_string(),
                format!("cd {} && cargo stylus build --release", project_path),
            ];
            
            if let Ok((build_out, build_err)) = self.docker.execute_command(&container_id, build_cmd).await {
                if build_err.is_empty() || !build_err.contains("error") {
                    // Read the compiled WASM file
                    let read_wasm_cmd = vec![
                        "sh".to_string(),
                        "-c".to_string(),
                        format!("xxd -p {}/target/wasm32-unknown-unknown/release/*.wasm | tr -d '\\n'", project_path),
                    ];
                    
                    if let Ok((bytecode, _)) = self.docker.execute_command(&container_id, read_wasm_cmd).await {
                        result.bytecode = Some(bytecode.trim().to_string());
                    }
                }
            }
        }

        // Clean up the container
        self.docker.remove_sandbox(&container_id).await?;

        Ok(result)
    }

    pub async fn check_contract(&self, request: CompilationRequest) -> Result<CompilationResult> {
        // Similar to compile but only runs cargo stylus check
        self.compile_contract(request).await
    }

    pub async fn deploy_contract(
        &self,
        user_id: &str,
        project_id: &str,
        bytecode: &str,
    ) -> Result<DeploymentResult> {
        // Create deployment container
        let container_id = self.docker.create_sandbox(user_id, project_id).await?;

        // Write bytecode to a file
        let bytecode_file = "/tmp/contract.wasm";
        let write_bytecode_cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("echo '{}' | xxd -r -p > {}", bytecode, bytecode_file),
        ];
        self.docker.execute_command(&container_id, write_bytecode_cmd).await?;

        // Deploy using cargo stylus deploy
        let deploy_cmd = vec![
            "cargo".to_string(),
            "stylus".to_string(),
            "deploy".to_string(),
            "--wasm-file".to_string(),
            bytecode_file.to_string(),
            "--private-key".to_string(),
            std::env::var("CONTRACT_PRIVATE_KEY").unwrap_or_default(),
            "--endpoint".to_string(),
            std::env::var("SUPERPOSITION_RPC_URL")
                .or_else(|_| std::env::var("ARB_SEPOLIA_RPC_URL"))
                .unwrap_or_default(),
        ];

        let (stdout, stderr) = self.docker.execute_command(&container_id, deploy_cmd).await?;
        
        // Parse deployment output for contract address
        let contract_address = parse_contract_address(&stdout);
        
        // Clean up
        self.docker.remove_sandbox(&container_id).await?;

        Ok(DeploymentResult {
            success: contract_address.is_some(),
            contract_address,
            transaction_hash: parse_tx_hash(&stdout),
            stdout,
            stderr,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentResult {
    pub success: bool,
    pub contract_address: Option<String>,
    pub transaction_hash: Option<String>,
    pub stdout: String,
    pub stderr: String,
}

fn parse_contract_address(output: &str) -> Option<String> {
    // Parse the output to find contract address
    // This is a simple implementation, adjust based on actual output format
    for line in output.lines() {
        if line.contains("Contract deployed at:") || line.contains("address:") {
            if let Some(addr) = line.split_whitespace().last() {
                if addr.starts_with("0x") {
                    return Some(addr.to_string());
                }
            }
        }
    }
    None
}

fn parse_tx_hash(output: &str) -> Option<String> {
    // Parse transaction hash from output
    for line in output.lines() {
        if line.contains("Transaction hash:") || line.contains("tx:") {
            if let Some(hash) = line.split_whitespace().last() {
                if hash.starts_with("0x") && hash.len() == 66 {
                    return Some(hash.to_string());
                }
            }
        }
    }
    None
}