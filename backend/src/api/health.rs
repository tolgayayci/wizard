use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub message: String,
    pub timestamp: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("")
            .route(web::get().to(health_check))
    );
}

async fn health_check() -> HttpResponse {
    let response = HealthResponse {
        status: "ok".to_string(),
        message: "Wizard backend is running".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    
    HttpResponse::Ok().json(response)
}