use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use reqwest;
use std::collections::HashMap;

use super::compile::{ApiResponse, ApiError};

#[derive(Debug, Deserialize)]
pub struct VerificationRequest {
    pub contract_address: String,
    pub source_code: String,
    pub contract_name: String,
    pub compiler_version: String,
    pub chain_id: u64,
}

#[derive(Debug, Deserialize)]
pub struct VerificationStatusRequest {
    pub guid: String,
    pub chain_id: u64,
}

#[derive(Debug, Serialize)]
pub struct VerificationResult {
    pub status: String, // 'pending', 'verified', 'failed'
    pub guid: Option<String>,
    pub message: String,
}

// Get Arbiscan API configuration based on chain ID
fn get_arbiscan_config(chain_id: u64) -> Option<(String, String)> {
    match chain_id {
        42161 => {
            // Arbitrum One
            let api_key = std::env::var("ARBISCAN_API_KEY").ok()?;
            Some(("https://api.arbiscan.io/v2/api".to_string(), api_key))
        }
        421614 => {
            // Arbitrum Sepolia  
            let api_key = std::env::var("ARBISCAN_SEPOLIA_API_KEY")
                .or_else(|_| std::env::var("ARBISCAN_API_KEY")).ok()?;
            Some(("https://api.arbiscan.io/v2/api".to_string(), api_key))
        }
        _ => None,
    }
}

pub async fn verify_contract(req: web::Json<VerificationRequest>) -> HttpResponse {
    let config = match get_arbiscan_config(req.chain_id) {
        Some(config) => config,
        None => {
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Verification not supported for this chain".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "UNSUPPORTED_CHAIN".to_string(),
                    message: "Unsupported chain ID".to_string(),
                    details: None,
                }),
            });
        }
    };

    let (api_url, api_key) = config;

    // Prepare form data for Arbiscan API
    let mut form_data = HashMap::new();
    form_data.insert("chainid", req.chain_id.to_string());
    form_data.insert("apikey", api_key);
    form_data.insert("module", "contract".to_string());
    form_data.insert("action", "verifysourcecode".to_string());
    form_data.insert("contractaddress", req.contract_address.clone());
    form_data.insert("sourceCode", req.source_code.clone());
    form_data.insert("codeformat", "solidity-single-file".to_string());
    form_data.insert("contractname", req.contract_name.clone());
    form_data.insert("compilerversion", req.compiler_version.clone());
    form_data.insert("optimizationUsed", "1".to_string());
    form_data.insert("runs", "200".to_string());
    form_data.insert("evmversion", "default".to_string());
    form_data.insert("licenseType", "3".to_string()); // MIT license

    // Make request to Arbiscan API
    let client = reqwest::Client::new();
    let response = match client.post(&api_url).form(&form_data).send().await {
        Ok(response) => response,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to submit verification request".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "REQUEST_FAILED".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    let response_body: serde_json::Value = match response.json().await {
        Ok(body) => body,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to parse API response".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "PARSE_FAILED".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Parse Arbiscan response
    if let Some(status) = response_body.get("status").and_then(|s| s.as_str()) {
        if status == "1" {
            if let Some(guid) = response_body.get("result").and_then(|r| r.as_str()) {
                let result = VerificationResult {
                    status: "pending".to_string(),
                    guid: Some(guid.to_string()),
                    message: "Verification submitted successfully".to_string(),
                };
                
                return HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    message: "Verification submitted".to_string(),
                    data: Some(result),
                    error: None,
                });
            }
        }
    }

    // If we get here, verification failed
    let error_message = response_body
        .get("result")
        .and_then(|r| r.as_str())
        .unwrap_or("Verification failed");

    let result = VerificationResult {
        status: "failed".to_string(),
        guid: None,
        message: error_message.to_string(),
    };

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Verification failed".to_string(),
        data: Some(result),
        error: None,
    })
}

pub async fn check_verification_status(req: web::Json<VerificationStatusRequest>) -> HttpResponse {
    let config = match get_arbiscan_config(req.chain_id) {
        Some(config) => config,
        None => {
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Chain not supported".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "UNSUPPORTED_CHAIN".to_string(),
                    message: "Unsupported chain ID".to_string(),
                    details: None,
                }),
            });
        }
    };

    let (api_url, api_key) = config;

    // Prepare query parameters
    let query_params = [
        ("chainid", req.chain_id.to_string()),
        ("apikey", api_key),
        ("module", "contract".to_string()),
        ("action", "checkverifystatus".to_string()),
        ("guid", req.guid.clone()),
    ];

    let client = reqwest::Client::new();
    let response = match client.get(&api_url).query(&query_params).send().await {
        Ok(response) => response,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to check verification status".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "REQUEST_FAILED".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    let response_body: serde_json::Value = match response.json().await {
        Ok(body) => body,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to parse API response".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "PARSE_FAILED".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Parse status response
    if let Some(status) = response_body.get("status").and_then(|s| s.as_str()) {
        let (verification_status, message) = if status == "1" {
            ("verified".to_string(), "Contract verified successfully".to_string())
        } else {
            let result_msg = response_body
                .get("result")
                .and_then(|r| r.as_str())
                .unwrap_or("Verification status unknown");
            
            if result_msg.contains("Pending") {
                ("pending".to_string(), "Verification is still pending".to_string())
            } else {
                ("failed".to_string(), result_msg.to_string())
            }
        };

        let result = VerificationResult {
            status: verification_status,
            guid: Some(req.guid.clone()),
            message,
        };

        return HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "Status retrieved".to_string(),
            data: Some(result),
            error: None,
        });
    }

    // Default to failed if we can't parse the response
    let result = VerificationResult {
        status: "failed".to_string(),
        guid: Some(req.guid.clone()),
        message: "Failed to determine verification status".to_string(),
    };

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Status check completed".to_string(),
        data: Some(result),
        error: None,
    })
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/verification/verify")
            .route(web::post().to(verify_contract))
    )
    .service(
        web::resource("/verification/status")
            .route(web::post().to(check_verification_status))
    );
}