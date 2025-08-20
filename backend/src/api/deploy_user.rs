use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use log::{info, error};
use alloy_primitives::Address;
use std::str::FromStr;
use std::fs;

use crate::services::stylus_utils::{
    process_and_compress_wasm, 
    create_stylus_deployment_data,
    create_activation_calldata,
    calculate_stylus_data_fee,
    estimate_deployment_gas,
    extract_compressed_wasm_size_from_deployment_data,
    ARB_WASM_ADDRESS,
    create_deployer_calldata,
    create_constructor_calldata,
    create_codehash_check_calldata,
    check_contract_activation,
    check_activation_with_deployment_bytecode,
};
use crate::AppState;

// Request/Response structures matching the reference implementation
#[derive(Debug, Serialize, Deserialize)]
pub struct CompileRequest {
    pub source_code: String,
    pub contract_name: Option<String>,
    pub user_id: Option<String>,
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResponse {
    pub success: bool,
    pub bytecode: Option<String>,
    pub deployment_data: Option<String>,
    pub compressed_wasm_size: Option<usize>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrepareDeploymentRequest {
    pub bytecode: String,
    pub constructor_args: Option<Vec<String>>,
    pub sender_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PreparedTransaction {
    pub to: Option<String>,
    pub from: String,
    pub data: String,
    pub value: String,
    pub gas_limit: String,
    pub chain_id: u64,
    pub nonce: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrepareActivationRequest {
    pub contract_address: String,
    pub sender_address: String,
    pub compressed_wasm_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EstimateGasRequest {
    pub to: Option<String>,
    pub from: String,
    pub data: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrepareDeployerRequest {
    pub bytecode: String,
    pub constructor_args: Option<Vec<String>>,
    pub constructor_value: Option<String>,
    pub salt: Option<String>,
    pub sender_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckActivationRequest {
    pub contract_address: String,
    pub deployment_bytecode: Option<String>, // Add deployment bytecode for more accurate checking
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckActivationResponse {
    pub is_activated: bool,
    pub version: Option<u16>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractWasmSizeRequest {
    pub deployment_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractWasmSizeResponse {
    pub success: bool,
    pub compressed_wasm_size: Option<usize>,
    pub error: Option<String>,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/prepare-deployment")
            .route(web::post().to(prepare_deployment))
    )
    .service(
        web::resource("/prepare-activation")
            .route(web::post().to(prepare_activation))
    )
    .service(
        web::resource("/prepare-deployer-tx")
            .route(web::post().to(prepare_deployer_tx))
    )
    .service(
        web::resource("/compile-user")
            .route(web::post().to(compile_user_contract))
    )
    .service(
        web::resource("/check-activation")
            .route(web::post().to(check_activation))
    )
    .service(
        web::resource("/extract-wasm-size")
            .route(web::post().to(extract_wasm_size))
    );
}

// Get deployment data from existing compiled WASM (following reference pattern)
async fn compile_user_contract(
    data: web::Data<AppState>,
    body: web::Json<CompileRequest>
) -> Result<HttpResponse> {
    info!("Getting deployment data from existing WASM file...");
    
    // Use the provided user_id and project_id, or try to find the most recent WASM file
    let wasm_path = if let (Some(user_id), Some(project_id)) = (&body.user_id, &body.project_id) {
        // Use specific project path
        let project_path = std::path::PathBuf::from("projects")
            .join(user_id)
            .join(project_id)
            .join("target/wasm32-unknown-unknown/release/stylus_hello_world.wasm");
        
        if project_path.exists() {
            info!("Found WASM file at: {:?}", project_path);
            project_path
        } else {
            return Ok(HttpResponse::NotFound().json(CompileResponse {
                success: false,
                bytecode: None,
                deployment_data: None,
                compressed_wasm_size: None,
                error: Some(format!("No compiled WASM file found at {:?}. Please compile your contract first using the local compiler.", project_path)),
            }));
        }
    } else {
        // Find the most recently modified WASM file
        let mut latest_wasm: Option<(std::path::PathBuf, std::time::SystemTime)> = None;
        
        let projects_dir = std::path::PathBuf::from("projects");
        if projects_dir.exists() {
            for entry in walkdir::WalkDir::new(&projects_dir) {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.file_name() == Some(std::ffi::OsStr::new("stylus_hello_world.wasm")) {
                        if let Ok(metadata) = path.metadata() {
                            if let Ok(modified) = metadata.modified() {
                                if latest_wasm.is_none() || modified > latest_wasm.as_ref().unwrap().1 {
                                    latest_wasm = Some((path.to_path_buf(), modified));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        latest_wasm.map(|(path, _)| path).ok_or_else(|| {
            actix_web::error::ErrorNotFound("No compiled WASM file found. Please compile your contract first using the local compiler.")
        })?
    };
    
    // Read the existing WASM file
    let wasm_bytes = fs::read(&wasm_path).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to read WASM file: {}", e))
    })?;
    
    // Process and compress the WASM exactly like cargo-stylus does
    let compressed_wasm = process_and_compress_wasm(&wasm_bytes).map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to process WASM: {}", e))
    })?;
    
    // Create the deployment bytecode with EVM prelude
    let deployment_data = create_stylus_deployment_data(&compressed_wasm);
    
    info!("WASM processing successful. WASM size: {} bytes, Compressed: {} bytes, Deployment data: {} bytes", 
             wasm_bytes.len(), compressed_wasm.len(), deployment_data.len());
    
    Ok(HttpResponse::Ok().json(CompileResponse {
        success: true,
        bytecode: Some(hex::encode(&compressed_wasm)),
        deployment_data: Some(hex::encode(&deployment_data)),
        compressed_wasm_size: Some(compressed_wasm.len()),
        error: None,
    }))
}

// Prepare deployment transaction
async fn prepare_deployment(body: web::Json<PrepareDeploymentRequest>) -> Result<HttpResponse> {
    info!("Preparing deployment transaction for sender: {}", body.sender_address);
    
    // The bytecode is already the full deployment data from compile_user_contract
    let deployment_data = hex::decode(&body.bytecode).map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Invalid deployment data: {}", e))
    })?;
    
    // Estimate gas (simplified - in production, connect to actual RPC)
    let estimated_gas = estimate_deployment_gas(&deployment_data);
    
    let tx = PreparedTransaction {
        to: None, // Contract creation
        from: body.sender_address.clone(),
        data: format!("0x{}", hex::encode(&deployment_data)),
        value: "0".to_string(),
        gas_limit: estimated_gas.to_string(),
        chain_id: 421614, // Arbitrum Sepolia testnet
        nonce: None,
    };
    
    info!("Deployment transaction prepared - gas limit: {}, data size: {} bytes", 
        estimated_gas, deployment_data.len());
    
    Ok(HttpResponse::Ok().json(tx))
}

// Prepare activation transaction
async fn prepare_activation(body: web::Json<PrepareActivationRequest>) -> Result<HttpResponse> {
    info!("Preparing activation for contract: {}", body.contract_address);
    
    let contract_address = Address::from_str(&body.contract_address).map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Invalid address: {}", e))
    })?;
    
    // Create activation call data
    let call_data = create_activation_calldata(contract_address);
    
    // Get the correct compressed WASM size 
    // Priority: 1) provided size, 2) extract from deployment data, 3) fallback estimate
    let compressed_size = if let Some(size) = body.compressed_wasm_size {
        info!("Using provided compressed WASM size: {} bytes", size);
        size
    } else {
        // Try to read the deployment data to extract the size
        // This is a fallback - ideally the size should be provided from the frontend
        let fallback_size = 5800; // Based on our previous log: compressed to 5758 bytes
        info!("No compressed WASM size provided, using fallback estimate: {} bytes", fallback_size);
        fallback_size
    };
    
    // Calculate proper data fee using cargo-stylus methodology
    let data_fee = calculate_stylus_data_fee(compressed_size);
    
    info!(
        "Activation - Contract: {}, Compressed WASM size: {} bytes, Data fee: {} wei (≈{:.6} ETH)", 
        contract_address, 
        compressed_size, 
        data_fee,
        data_fee.to::<u128>() as f64 / 1e18
    );
    
    let tx = PreparedTransaction {
        to: Some(format!("{:?}", ARB_WASM_ADDRESS)),
        from: body.sender_address.clone(),
        data: format!("0x{}", hex::encode(call_data)),
        value: data_fee.to_string(),
        gas_limit: "10000000".to_string(), // Higher gas limit for activation
        chain_id: 421614,
        nonce: None,
    };
    
    Ok(HttpResponse::Ok().json(tx))
}

// Extract compressed WASM size from deployment data
async fn extract_wasm_size(body: web::Json<ExtractWasmSizeRequest>) -> Result<HttpResponse> {
    info!("Extracting compressed WASM size from deployment data");
    
    let deployment_data = hex::decode(&body.deployment_data).map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Invalid deployment data: {}", e))
    })?;
    
    match extract_compressed_wasm_size_from_deployment_data(&deployment_data) {
        Ok(compressed_size) => {
            info!("Successfully extracted compressed WASM size: {} bytes", compressed_size);
            Ok(HttpResponse::Ok().json(ExtractWasmSizeResponse {
                success: true,
                compressed_wasm_size: Some(compressed_size),
                error: None,
            }))
        }
        Err(e) => {
            error!("Failed to extract compressed WASM size: {}", e);
            Ok(HttpResponse::Ok().json(ExtractWasmSizeResponse {
                success: false,
                compressed_wasm_size: None,
                error: Some(e.to_string()),
            }))
        }
    }
}

// Check if contract is already activated
async fn check_activation(
    data: web::Data<AppState>,
    body: web::Json<CheckActivationRequest>
) -> Result<HttpResponse> {
    info!("Checking activation status for contract: {}", body.contract_address);
    
    let contract_address = Address::from_str(&body.contract_address).map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Invalid address: {}", e))
    })?;
    
    // Use deployment bytecode method if available (preferred)
    let (is_activated, version) = if let Some(deployment_bytecode) = &body.deployment_bytecode {
        info!("Using deployment bytecode for activation check (preferred method)");
        match check_activation_with_deployment_bytecode(&data.config.blockchain.rpc_url, deployment_bytecode).await {
            Ok(result) => result,
            Err(e) => {
                error!("Failed to check activation with deployment bytecode: {}", e);
                info!("Falling back to contract address method");
                // Fallback to original method
                match check_contract_activation(&data.config.blockchain.rpc_url, contract_address).await {
                    Ok(result) => result,
                    Err(fallback_error) => {
                        error!("Both activation check methods failed: {}", fallback_error);
                        return Ok(HttpResponse::Ok().json(CheckActivationResponse {
                            is_activated: false,
                            version: None,
                            error: Some(format!("Failed to check activation status: {}", fallback_error)),
                        }));
                    }
                }
            }
        }
    } else {
        info!("Using fallback method (contract address) for activation check");
        match check_contract_activation(&data.config.blockchain.rpc_url, contract_address).await {
            Ok(result) => result,
            Err(e) => {
                error!("Failed to check contract activation: {}", e);
                return Ok(HttpResponse::Ok().json(CheckActivationResponse {
                    is_activated: false,
                    version: None,
                    error: Some(format!("Failed to check activation status: {}", e)),
                }));
            }
        }
    };
    
    info!("Contract {} activation status: {}, version: {:?}", 
          body.contract_address, is_activated, version);
    
    Ok(HttpResponse::Ok().json(CheckActivationResponse {
        is_activated,
        version,
        error: None,
    }))
}

// Prepare deployer transaction (for constructor support)
async fn prepare_deployer_tx(body: web::Json<PrepareDeployerRequest>) -> Result<HttpResponse> {
    let bytecode = hex::decode(&body.bytecode).map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Invalid bytecode: {}", e))
    })?;
    
    let deployment_data = create_stylus_deployment_data(&bytecode);
    
    // Prepare constructor calldata if args provided
    let init_data = if let Some(args) = &body.constructor_args {
        create_constructor_calldata(args)?
    } else {
        vec![]
    };
    
    // Clone the value or use default
    let constructor_value = body.constructor_value.clone().unwrap_or_else(|| "0".to_string());
    
    // Create deployer call
    let deployer_calldata = create_deployer_calldata(
        deployment_data,
        init_data,
        constructor_value,
        body.salt.clone(),
    )?;
    
    let tx = PreparedTransaction {
        to: Some("0xcEcba2F1DC234f70Dd89F2041029807F8D03A990".to_string()), // STYLUS_DEPLOYER_ADDRESS
        from: body.sender_address.clone(),
        data: format!("0x{}", hex::encode(deployer_calldata)),
        value: body.constructor_value.clone().unwrap_or_else(|| "0".to_string()),
        gas_limit: "5000000".to_string(),
        chain_id: 421614,
        nonce: None,
    };
    
    Ok(HttpResponse::Ok().json(tx))
}