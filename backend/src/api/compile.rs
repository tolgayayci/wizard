use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::services::compiler::{CompilationRequest, CompilationResult};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CompileRequest {
    pub user_id: String,
    pub project_id: String,
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/compile")
            .route(web::post().to(compile_contract))
    )
    .service(
        web::resource("/check")
            .route(web::post().to(check_contract))
    );
}

async fn compile_contract(
    data: web::Data<AppState>,
    req: web::Json<CompileRequest>,
) -> HttpResponse {
    let compilation_req = CompilationRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
        code: req.code.clone(),
    };

    match data.compiler.compile_contract(compilation_req).await {
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
            HttpResponse::InternalServerError().json(ApiResponse::<CompilationResult> {
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

async fn check_contract(
    data: web::Data<AppState>,
    req: web::Json<CompileRequest>,
) -> HttpResponse {
    let compilation_req = CompilationRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
        code: req.code.clone(),
    };

    match data.compiler.check_contract(compilation_req).await {
        Ok(result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: result.success,
                message: if result.success {
                    "Check successful".to_string()
                } else {
                    "Check failed".to_string()
                },
                data: Some(result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<CompilationResult> {
                success: false,
                message: "Check error".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "CHECK_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}