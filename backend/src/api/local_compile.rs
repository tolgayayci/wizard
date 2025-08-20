use actix_web::{web, HttpResponse};
use serde::Deserialize;

use crate::services::local_compiler::{LocalCompilationRequest, LocalCompilationResult};
use crate::AppState;

use super::compile::{ApiResponse, ApiError};

#[derive(Debug, Deserialize)]
pub struct CompileRequest {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AbiRequest {
    pub user_id: String,
    pub project_id: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/local/compile")
            .route(web::post().to(compile_local))
    )
    .service(
        web::resource("/local/export-abi")
            .route(web::post().to(export_abi))
    )
    .service(
        web::resource("/local/export-abi-json")
            .route(web::post().to(export_abi_json))
    );
}

async fn compile_local(
    data: web::Data<AppState>,
    req: web::Json<CompileRequest>,
) -> HttpResponse {
    let request = LocalCompilationRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
    };

    match data.local_compiler.compile_project(request).await {
        Ok(result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: result.success,
                message: if result.success {
                    "Compilation successful".to_string()
                } else {
                    "Compilation failed".to_string()
                },
                data: Some(result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<LocalCompilationResult> {
                success: false,
                message: "Compilation error".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "COMPILATION_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn export_abi(
    data: web::Data<AppState>,
    req: web::Json<AbiRequest>,
) -> HttpResponse {
    match data.local_compiler.export_abi(&req.user_id, &req.project_id).await {
        Ok(abi) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "ABI exported successfully".to_string(),
                data: Some(abi),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String> {
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

async fn export_abi_json(
    data: web::Data<AppState>,
    req: web::Json<AbiRequest>,
) -> HttpResponse {
    match data.local_compiler.export_abi_json(&req.user_id, &req.project_id).await {
        Ok(abi_json) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "ABI JSON exported successfully".to_string(),
                data: Some(abi_json),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String> {
                success: false,
                message: "Failed to export ABI JSON".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "ABI_JSON_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}