use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PrepareDeploymentRequest {
    pub user_id: String,
    pub project_id: String,
    pub deployment_mode: DeploymentMode,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentMode {
    Wizard,
    User,
}

#[derive(Debug, Serialize)]
pub struct PrepareDeploymentResponse {
    pub wasm_hex: String,
    pub salt: String,
    pub arbwasm_address: String,
    pub predicted_address: String,
    pub chain_id: u64,
    pub abi: Option<String>,
    pub deployment_info: DeploymentInfo,
}

#[derive(Debug, Serialize)]
pub struct DeploymentInfo {
    pub network_name: String,
    pub is_testnet: bool,
    pub explorer_url: String,
}

// Arbitrum Sepolia addresses
const ARBITRUM_SEPOLIA_CHAIN_ID: u64 = 421614;
const ARBITRUM_SEPOLIA_ARBWASM: &str = "0x0000000000000000000000000000000000000071";

// For mainnet (Arbitrum One)
const ARBITRUM_ONE_CHAIN_ID: u64 = 42161;
const ARBITRUM_ONE_ARBWASM: &str = "0x0000000000000000000000000000000000000071";

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/deployments/prepare")
            .route(web::post().to(prepare_deployment))
    );
}

async fn prepare_deployment(
    data: web::Data<AppState>,
    req: web::Json<PrepareDeploymentRequest>,
) -> HttpResponse {
    // Get WASM bytecode and salt
    let (wasm_hex, salt) = match tokio::try_join!(
        data.local_compiler.get_wasm_hex(&req.user_id, &req.project_id),
        data.local_compiler.get_wasm_salt(&req.user_id, &req.project_id)
    ) {
        Ok((wasm, salt)) => (wasm, salt),
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<PrepareDeploymentResponse> {
                success: false,
                message: "Failed to get WASM bytecode".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "WASM_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Get ABI
    let abi = data.local_compiler.export_abi_json(&req.user_id, &req.project_id).await.ok();

    // For now, we'll use Arbitrum Sepolia (testnet)
    let (arbwasm_address, chain_id, deployment_info) = match req.deployment_mode {
        DeploymentMode::Wizard | DeploymentMode::User => (
            ARBITRUM_SEPOLIA_ARBWASM.to_string(),
            ARBITRUM_SEPOLIA_CHAIN_ID,
            DeploymentInfo {
                network_name: "Arbitrum Sepolia".to_string(),
                is_testnet: true,
                explorer_url: "https://sepolia.arbiscan.io".to_string(),
            },
        ),
    };

    // For Stylus contracts, we'll use a placeholder for predicted address
    // The actual deployment address depends on the ArbWasm precompile logic
    let predicted_address = "TBD_ON_DEPLOYMENT".to_string();

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Deployment prepared successfully".to_string(),
        data: Some(PrepareDeploymentResponse {
            wasm_hex,
            salt,
            arbwasm_address,
            predicted_address,
            chain_id,
            abi,
            deployment_info,
        }),
        error: None,
    })
}

fn calculate_create2_address(deployer: &str, salt: &str, bytecode: &str) -> String {
    use sha3::{Digest, Keccak256};
    
    // Remove 0x prefix if present
    let deployer = deployer.strip_prefix("0x").unwrap_or(deployer);
    let salt = salt.strip_prefix("0x").unwrap_or(salt);
    let bytecode = bytecode.strip_prefix("0x").unwrap_or(bytecode);
    
    // Decode hex strings
    let deployer_bytes = hex::decode(deployer).unwrap_or_default();
    let salt_bytes = hex::decode(salt).unwrap_or_default();
    let bytecode_bytes = hex::decode(bytecode).unwrap_or_default();
    
    // Hash the bytecode
    let mut bytecode_hasher = Keccak256::new();
    bytecode_hasher.update(&bytecode_bytes);
    let bytecode_hash = bytecode_hasher.finalize();
    
    // CREATE2 formula: keccak256(0xFF + deployer + salt + keccak256(bytecode))
    let mut hasher = Keccak256::new();
    hasher.update(&[0xFF]);
    hasher.update(&deployer_bytes);
    hasher.update(&salt_bytes);
    hasher.update(&bytecode_hash);
    let address_hash = hasher.finalize();
    
    // Take last 20 bytes (40 hex chars) for the address
    let address = &address_hash[12..];
    format!("0x{}", hex::encode(address))
}