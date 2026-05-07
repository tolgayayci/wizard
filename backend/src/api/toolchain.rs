use actix_web::{web, HttpResponse};
use serde::Deserialize;
use std::path::PathBuf;

use crate::AppState;
use crate::services::toolchain;

#[derive(Debug, Deserialize)]
pub struct VersionsQuery {
    pub user_id: String,
    pub project_id: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/toolchain/versions")
            .route(web::get().to(get_versions))
    );
}

async fn get_versions(
    data: web::Data<AppState>,
    query: web::Query<VersionsQuery>,
) -> HttpResponse {
    let project_path = PathBuf::from(&data.config.storage.path)
        .join(&query.user_id)
        .join(&query.project_id);

    if !project_path.exists() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "error": "Project not found"
        }));
    }

    match toolchain::get_versions(&project_path).await {
        Ok(versions) => HttpResponse::Ok().json(versions),
        Err(e) => {
            log::error!("Failed to read toolchain versions: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e.to_string()
            }))
        }
    }
}
