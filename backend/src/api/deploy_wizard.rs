use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::process::Command;
use log::{info, error};

use crate::AppState;
use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct WizardDeployRequest {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Serialize)]
pub struct WizardDeploymentResult {
    pub success: bool,
    pub contract_address: Option<String>,
    pub transaction_hash: Option<String>,
    pub activation_hash: Option<String>,
    pub deployment_output: String,
    pub chain_id: u64,
    pub network_name: String,
    pub explorer_url: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/deploy/wizard")
            .route(web::post().to(deploy_with_wizard))
    );
}

async fn deploy_with_wizard(
    data: web::Data<AppState>,
    req: web::Json<WizardDeployRequest>,
) -> HttpResponse {
    info!("Starting wizard deployment for project {}", req.project_id);
    
    // Get project path
    let project_path = PathBuf::from(&data.config.storage.path)
        .join(&req.user_id)
        .join(&req.project_id);
    
    // Check if project exists
    if !project_path.exists() {
        return HttpResponse::NotFound().json(ApiResponse::<WizardDeploymentResult> {
            success: false,
            message: "Project not found".to_string(),
            data: None,
            error: Some(ApiError {
                code: "PROJECT_NOT_FOUND".to_string(),
                message: "Project directory does not exist".to_string(),
                details: None,
            }),
        });
    }
    
    // Check if WASM exists
    let wasm_path = project_path
        .join("target")
        .join("wasm32-unknown-unknown")
        .join("release");
    
    // Find the WASM file
    let mut wasm_file = None;
    if wasm_path.exists() {
        if let Ok(mut entries) = tokio::fs::read_dir(&wasm_path).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("wasm") {
                    wasm_file = Some(path);
                    break;
                }
            }
        }
    }
    
    let wasm_file_path = match wasm_file {
        Some(path) => path,
        None => {
            error!("No WASM file found in project {}", req.project_id);
            return HttpResponse::BadRequest().json(ApiResponse::<WizardDeploymentResult> {
                success: false,
                message: "No compiled WASM found".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "NO_WASM".to_string(),
                    message: "Please compile your contract first".to_string(),
                    details: None,
                }),
            });
        }
    };
    
    info!("Found WASM file at: {:?}", wasm_file_path);
    
    // Get environment variables
    let private_key = std::env::var("CONTRACT_PRIVATE_KEY")
        .unwrap_or_else(|_| {
            error!("CONTRACT_PRIVATE_KEY not set");
            String::new()
        });
    
    let rpc_url = std::env::var("SUPERPOSITION_RPC_URL")
        .unwrap_or_else(|_| "https://testnet-rpc.superposition.so".to_string());
    
    if private_key.is_empty() {
        return HttpResponse::InternalServerError().json(ApiResponse::<WizardDeploymentResult> {
            success: false,
            message: "Deployment configuration error".to_string(),
            data: None,
            error: Some(ApiError {
                code: "CONFIG_ERROR".to_string(),
                message: "Private key not configured".to_string(),
                details: None,
            }),
        });
    }
    
    // Run cargo stylus deploy
    info!("Running cargo stylus deploy with RPC: {}", rpc_url);
    
    let output = Command::new("cargo")
        .args(&[
            "stylus",
            "deploy",
            "--wasm-file", wasm_file_path.to_str().unwrap(),
            "--private-key", &private_key,
            "--endpoint", &rpc_url,
            "--no-verify", // Skip Docker verification for local builds
        ])
        .current_dir(&project_path)
        .env("CARGO_TERM_COLOR", "never")
        .output()
        .await;
    
    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let combined_output = format!("{}\n{}", stdout, stderr);
            
            info!("Deployment output: {}", combined_output);
            
            // Parse the output for contract address and transaction hash
            let contract_address = parse_contract_address(&combined_output);
            let transaction_hash = parse_transaction_hash(&combined_output);
            let activation_hash = parse_activation_hash(&combined_output);
            
            let success = output.status.success() && contract_address.is_some();
            
            if success {
                info!("Deployment successful: contract={:?}, tx={:?}", 
                    contract_address, transaction_hash);
            } else {
                error!("Deployment failed: {}", combined_output);
            }
            
            HttpResponse::Ok().json(ApiResponse {
                success,
                message: if success {
                    "Contract deployed successfully".to_string()
                } else {
                    "Deployment failed".to_string()
                },
                data: Some(WizardDeploymentResult {
                    success,
                    contract_address,
                    transaction_hash,
                    activation_hash,
                    deployment_output: combined_output.clone(),
                    chain_id: 98985, // Superposition Testnet
                    network_name: "Superposition Testnet".to_string(),
                    explorer_url: "https://testnet-explorer.superposition.so".to_string(),
                }),
                error: if !success {
                    Some(ApiError {
                        code: "DEPLOYMENT_FAILED".to_string(),
                        message: "Failed to deploy contract".to_string(),
                        details: Some(combined_output),
                    })
                } else {
                    None
                },
            })
        }
        Err(e) => {
            error!("Failed to execute cargo stylus deploy: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<WizardDeploymentResult> {
                success: false,
                message: "Failed to execute deployment command".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "EXECUTION_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

fn parse_contract_address(output: &str) -> Option<String> {
    // Look for patterns like:
    // "deployed code at address: 0x..."
    // "contract address: 0x..."
    // "Contract deployed at: 0x..."
    for line in output.lines() {
        let lower = line.to_lowercase();
        if (lower.contains("deployed") || lower.contains("contract")) && lower.contains("address") {
            // Find the 0x address in the line
            if let Some(start) = line.find("0x") {
                let address_part = &line[start..];
                // Take the address (42 characters including 0x)
                if address_part.len() >= 42 {
                    return Some(address_part[..42].to_string());
                }
            }
        }
    }
    None
}

fn parse_transaction_hash(output: &str) -> Option<String> {
    // Look for patterns like:
    // "transaction hash: 0x..."
    // "tx hash: 0x..."
    // "deployment tx: 0x..."
    for line in output.lines() {
        let lower = line.to_lowercase();
        if (lower.contains("transaction") || lower.contains("tx")) && lower.contains("hash") {
            // Find the 0x hash in the line
            if let Some(start) = line.find("0x") {
                let hash_part = &line[start..];
                // Take the hash (66 characters including 0x)
                if hash_part.len() >= 66 {
                    return Some(hash_part[..66].to_string());
                }
            }
        }
    }
    None
}

fn parse_activation_hash(output: &str) -> Option<String> {
    // Look for patterns like:
    // "activation hash: 0x..."
    // "activated at tx: 0x..."
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("activation") || lower.contains("activated") {
            // Find the 0x hash in the line
            if let Some(start) = line.find("0x") {
                let hash_part = &line[start..];
                // Take the hash (66 characters including 0x)
                if hash_part.len() >= 66 {
                    return Some(hash_part[..66].to_string());
                }
            }
        }
    }
    None
}