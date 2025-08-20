use actix_web::{web, HttpResponse};
use serde::Deserialize;

use crate::services::compiler::DeploymentResult;
use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct DeployRequest {
    pub user_id: String,
    pub project_id: String,
    pub bytecode: Option<String>,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/deploy")
            .route(web::post().to(deploy_contract))
    );
}

async fn deploy_contract(
    data: web::Data<AppState>,
    req: web::Json<DeployRequest>,
) -> HttpResponse {
    // If no bytecode provided, we need to compile first
    let bytecode = if let Some(bc) = &req.bytecode {
        bc.clone()
    } else {
        // For now, return error. In production, you might want to compile first
        return HttpResponse::BadRequest().json(ApiResponse::<DeploymentResult> {
            success: false,
            message: "Bytecode required for deployment".to_string(),
            data: None,
            error: Some(ApiError {
                code: "MISSING_BYTECODE".to_string(),
                message: "Contract bytecode is required for deployment".to_string(),
                details: None,
            }),
        });
    };

    match data.compiler.deploy_contract(&req.user_id, &req.project_id, &bytecode).await {
        Ok(result) => {
            HttpResponse::Ok().json(ApiResponse {
                success: result.success,
                message: if result.success {
                    "Deployment successful".to_string()
                } else {
                    "Deployment failed".to_string()
                },
                data: Some(result),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<DeploymentResult> {
                success: false,
                message: "Deployment error".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "DEPLOYMENT_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}