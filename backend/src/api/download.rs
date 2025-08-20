use actix_web::{web, HttpResponse};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::services::local_compiler::WasmAnalysisResult;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct DownloadRequest {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AbiDownloadRequest {
    pub user_id: String,
    pub project_id: String,
    pub format: Option<String>, // "json" or "solidity" (default)
}

#[derive(Debug, Serialize)]
pub struct WasmDownloadResponse {
    pub filename: String,
    pub content: String, // base64 encoded
    pub size: usize,
}

#[derive(Debug, Serialize)]
pub struct AbiDownloadResponse {
    pub filename: String,
    pub content: String,
    pub format: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("download/wasm")
            .route(web::post().to(download_wasm))
    )
    .service(
        web::resource("download/abi")
            .route(web::post().to(download_abi))
    )
    .service(
        web::resource("download/analyze-wasm")
            .route(web::post().to(analyze_wasm))
    );
}

async fn download_wasm(
    data: web::Data<AppState>,
    req: web::Json<DownloadRequest>,
) -> HttpResponse {
    // First try to compile to get fresh WASM
    let compile_request = crate::services::local_compiler::LocalCompilationRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
    };

    match data.local_compiler.compile_project(compile_request).await {
        Ok(result) if result.wasm.is_some() => {
            // Return WASM if it exists, regardless of compilation status
            let wasm_bytes = result.wasm.unwrap();
            let encoded_content = STANDARD.encode(&wasm_bytes);
            let filename = format!("{}.wasm", req.project_id);
            
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "WASM binary retrieved successfully".to_string(),
                data: Some(WasmDownloadResponse {
                    filename,
                    content: encoded_content,
                    size: wasm_bytes.len(),
                }),
                error: None,
            })
        }
        Ok(result) => {
            // Provide helpful message based on what happened
            let details = if !result.output.is_empty() {
                Some(result.output.lines().take(5).collect::<Vec<_>>().join("\n"))
            } else {
                None
            };
            
            HttpResponse::BadRequest().json(ApiResponse::<WasmDownloadResponse> {
                success: false,
                message: "No WASM binary available. Check compilation output for details.".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "NO_WASM".to_string(),
                    message: "WASM generation failed".to_string(),
                    details,
                }),
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<WasmDownloadResponse> {
                success: false,
                message: "Failed to get WASM binary".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "WASM_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn download_abi(
    data: web::Data<AppState>,
    req: web::Json<AbiDownloadRequest>,
) -> HttpResponse {
    let format = req.format.as_deref().unwrap_or("solidity");
    let is_json = format == "json";
    
    // First compile to get fresh ABI
    let compile_request = crate::services::local_compiler::LocalCompilationRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
    };

    match data.local_compiler.compile_project(compile_request).await {
        Ok(result) => {
            // Try to get ABI regardless of compilation status
            let abi_content = if is_json {
                result.abi_json
            } else {
                result.abi_solidity
            };

            if let Some(content) = abi_content {
                let file_extension = if is_json { "json" } else { "sol" };
                let filename = format!("{}.abi.{}", req.project_id, file_extension);
                
                HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    message: "ABI exported successfully".to_string(),
                    data: Some(AbiDownloadResponse {
                        filename,
                        content,
                        format: format.to_string(),
                    }),
                    error: None,
                })
            } else {
                // Provide context about why ABI might not be available
                let details = if !result.output.is_empty() {
                    Some(result.output.lines().take(5).collect::<Vec<_>>().join("\n"))
                } else {
                    None
                };
                
                HttpResponse::BadRequest().json(ApiResponse::<AbiDownloadResponse> {
                    success: false,
                    message: "No ABI available. Contract may have compilation errors.".to_string(),
                    data: None,
                    error: Some(ApiError {
                        code: "NO_ABI".to_string(),
                        message: "ABI export failed".to_string(),
                        details,
                    }),
                })
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<AbiDownloadResponse> {
                success: false,
                message: "Failed to export ABI".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "ABI_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn analyze_wasm(
    data: web::Data<AppState>,
    req: web::Json<DownloadRequest>,
) -> HttpResponse {
    match data.local_compiler.analyze_wasm(&req.user_id, &req.project_id).await {
        Ok(analysis_result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "WASM analysis completed successfully".to_string(),
                data: Some(analysis_result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<WasmAnalysisResult> {
                success: false,
                message: "Failed to analyze WASM binary".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "ANALYSIS_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}