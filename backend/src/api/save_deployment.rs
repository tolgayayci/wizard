use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;
use std::fs;
use std::path::PathBuf;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct SaveDeploymentRequest {
    pub user_id: String,
    pub project_id: String,
    pub deployment: DeploymentData,
}

#[derive(Debug, Deserialize)]
pub struct DeploymentData {
    pub success: bool,
    pub transaction: Option<TransactionData>,
    pub deployment_time: Option<f64>,
    pub gas_used: Option<String>,
    pub deployment_cost: Option<String>,
    pub verification_status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionData {
    pub deployment_tx_hash: String,
    pub activation_tx_hash: Option<String>,
    pub contract_address: String,
    pub deployer_address: String,
    pub chain_id: u64,
}

#[derive(Debug, Serialize)]
pub struct SaveDeploymentResponse {
    pub success: bool,
    pub deployment_id: String,
    pub message: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/deployments/save")
            .route(web::post().to(save_deployment))
    );
}

async fn save_deployment(
    data: web::Data<AppState>,
    req: web::Json<SaveDeploymentRequest>,
) -> HttpResponse {
    // Extract transaction data
    let tx_data = match &req.deployment.transaction {
        Some(tx) => tx,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "success": false,
                "error": "No transaction data provided"
            }));
        }
    };
    
    // Determine deployment mode based on deployer address
    // If deployer matches our backend wallet, it's wizard mode, otherwise user mode
    let deployment_mode = if is_wizard_wallet(&tx_data.deployer_address) {
        "wizard"
    } else {
        "user"
    };
    
    // Build network info based on chain ID
    let network_info = get_network_info(tx_data.chain_id);
    let explorer_base_url = get_explorer_url(tx_data.chain_id);
    
    // Get ABI from the project if available
    let abi = data.local_compiler
        .export_abi_json(&req.user_id, &req.project_id)
        .await
        .ok();
    
    // Build deployment data
    let deployment_id = Uuid::new_v4();
    let deployment_data = json!({
        "id": deployment_id.to_string(),
        "project_id": req.project_id,
        "user_id": req.user_id,
        "contract_address": tx_data.contract_address,
        "chain_id": tx_data.chain_id,
        "chain_name": network_info.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown"),
        "tx_hash": tx_data.deployment_tx_hash,
        "activation_tx_hash": tx_data.activation_tx_hash,
        "deployment_mode": deployment_mode,
        "deployer_address": tx_data.deployer_address,
        "network_info": network_info,
        "explorer_base_url": explorer_base_url,
        "abi": abi.as_ref().and_then(|a| serde_json::from_str::<serde_json::Value>(a).ok()),
        "metadata": {
            "deployment_time": req.deployment.deployment_time,
            "gas_used": req.deployment.gas_used,
            "deployment_cost": req.deployment.deployment_cost,
        },
        "verification_status": req.deployment.verification_status.as_deref().unwrap_or("unverified"),
        "created_at": Utc::now().to_rfc3339(),
    });
    
    // Save deployment data to file for persistence
    let deployments_dir = PathBuf::from("projects")
        .join(&req.user_id)
        .join(&req.project_id)
        .join("deployments");
    
    // Create deployments directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&deployments_dir) {
        eprintln!("Failed to create deployments directory: {:?}", e);
    }
    
    // Save deployment data to JSON file
    let deployment_file = deployments_dir.join(format!("{}.json", deployment_id));
    if let Err(e) = fs::write(&deployment_file, deployment_data.to_string()) {
        eprintln!("Failed to save deployment file: {:?}", e);
    }
    
    // Return success response
    HttpResponse::Ok().json(SaveDeploymentResponse {
        success: true,
        deployment_id: deployment_id.to_string(),
        message: "Deployment saved successfully".to_string(),
    })
}

fn is_wizard_wallet(address: &str) -> bool {
    // Check if the address matches our backend wallet
    // First try to get from env var
    if let Ok(wizard_wallet) = std::env::var("WIZARD_WALLET_ADDRESS") {
        return address.to_lowercase() == wizard_wallet.to_lowercase();
    }
    
    // Fallback: derive address from private key using a simple implementation
    if let Ok(private_key) = std::env::var("CONTRACT_PRIVATE_KEY") {
        // For now, we'll use a known address derived from the private key
        // This should be replaced with proper key derivation
        let known_wizard_address = "0x4ea5ba5fdc9ea4c32e05ae5cc7a01e71e2e6e5c4"; // Replace with actual address
        return address.to_lowercase() == known_wizard_address.to_lowercase();
    }
    
    false
}

fn get_network_info(chain_id: u64) -> serde_json::Value {
    match chain_id {
        421614 => json!({
            "chain_id": 421614,
            "name": "Arbitrum Sepolia",
            "rpc_url": "https://sepolia-rollup.arbitrum.io/rpc",
            "explorer_url": "https://sepolia.arbiscan.io",
            "is_testnet": true,
            "currency": "ETH"
        }),
        42161 => json!({
            "chain_id": 42161,
            "name": "Arbitrum One",
            "rpc_url": "https://arb1.arbitrum.io/rpc",
            "explorer_url": "https://arbiscan.io",
            "is_testnet": false,
            "currency": "ETH"
        }),
        _ => json!({
            "chain_id": chain_id,
            "name": format!("Chain {}", chain_id),
            "is_testnet": true
        })
    }
}

fn get_explorer_url(chain_id: u64) -> Option<String> {
    match chain_id {
        421614 => Some("https://sepolia.arbiscan.io".to_string()),
        42161 => Some("https://arbiscan.io".to_string()),
        _ => None
    }
}