use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::services::formatter::{FormatRequest, FormatResult, LintRequest, LintResult};
use crate::AppState;

use super::compile::{ApiResponse, ApiError};

#[derive(Debug, Deserialize)]
pub struct FormatCodeRequest {
    pub user_id: String,
    pub project_id: String,
    pub file_path: Option<String>, // If None, format lib.rs
}

#[derive(Debug, Deserialize)]
pub struct LintCodeRequest {
    pub user_id: String,
    pub project_id: String,
    pub file_path: Option<String>, // If None, lint lib.rs
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/format")
            .route(web::post().to(format_code))
    )
    .service(
        web::resource("/lint")
            .route(web::post().to(lint_code))
    );
}

async fn format_code(
    data: web::Data<AppState>,
    req: web::Json<FormatCodeRequest>,
) -> HttpResponse {
    let request = FormatRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
        file_path: req.file_path.clone().unwrap_or_else(|| "src/lib.rs".to_string()),
    };

    match data.formatter.format_code(request).await {
        Ok(result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: result.success,
                message: if result.success {
                    "Code formatted successfully".to_string()
                } else {
                    "Failed to format code".to_string()
                },
                data: Some(result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<FormatResult> {
                success: false,
                message: "Formatting error".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "FORMAT_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn lint_code(
    data: web::Data<AppState>,
    req: web::Json<LintCodeRequest>,
) -> HttpResponse {
    let request = LintRequest {
        user_id: req.user_id.clone(),
        project_id: req.project_id.clone(),
        file_path: req.file_path.clone().unwrap_or_else(|| "src/lib.rs".to_string()),
    };

    match data.formatter.lint_code(request).await {
        Ok(result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: result.success,
                message: if result.success {
                    if result.issues.is_empty() {
                        "No issues found".to_string()
                    } else {
                        format!("Found {} issue(s)", result.issues.len())
                    }
                } else {
                    "Failed to lint code".to_string()
                },
                data: Some(result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<LintResult> {
                success: false,
                message: "Linting error".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "LINT_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}