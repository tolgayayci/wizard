use actix_web::{web, HttpResponse};
use log::{error, info};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::services::embed_parser::{EmbedParser, ParsedEmbed};
use crate::services::cargo_manager::CargoManager;
use crate::services::filesystem::FileSystemService;
use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct CreateEmbedProjectRequest {
    pub embed_data: String, // Base64 encoded EmbedData
    pub user_id: String,
    pub source_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ValidateEmbedRequest {
    pub embed_data: String, // Base64 encoded EmbedData
}

#[derive(Debug, Serialize)]
pub struct CreateEmbedProjectResponse {
    pub project_id: String,
    pub project_name: String,
}

#[derive(Debug, Serialize)]
pub struct ValidateEmbedResponse {
    pub valid: bool,
    pub parsed_data: Option<ParsedEmbed>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EmbedButtonResponse {
    pub html: String,
    pub script_url: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/embed/create")
            .route(web::post().to(create_embed_project))
    )
    .service(
        web::resource("/embed/validate")
            .route(web::post().to(validate_embed_data))
    )
    .service(
        web::resource("/embed/button")
            .route(web::get().to(generate_embed_button))
    );
}

async fn create_embed_project(
    data: web::Data<AppState>,
    req: web::Json<CreateEmbedProjectRequest>,
) -> HttpResponse {
    info!("Creating project from embed data for user {}", req.user_id);

    let parser = EmbedParser::new();
    let cargo_manager = CargoManager::new();
    let filesystem = FileSystemService::new(&data.config.storage);

    // Decode and parse embed data
    let embed_data = match EmbedParser::decode_embed_data(&req.embed_data) {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to decode embed data: {}", e);
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Invalid embed data".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "INVALID_EMBED_DATA".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Parse and validate the embed data
    let parsed = match parser.parse_embed_data(&embed_data) {
        Ok(parsed) => parsed,
        Err(e) => {
            error!("Failed to parse embed data: {}", e);
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Invalid code or dependencies".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "EMBED_PARSE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Create project ID (simplified version - no database persistence for now)
    let project_id = Uuid::new_v4();
    info!("Creating filesystem-only project {} for embed data", project_id);

    // Create project files
    let project_id_str = project_id.to_string();
    
    // Create lib.rs file with the embedded code
    if let Err(e) = filesystem.write_file(&req.user_id, &project_id_str, "src/lib.rs", &parsed.code).await {
        error!("Failed to create lib.rs: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to create project files".to_string(),
            data: None,
            error: Some(ApiError {
                code: "FILE_CREATION_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Create Cargo.toml with parsed dependencies
    if let Err(e) = filesystem.write_file(&req.user_id, &project_id_str, "Cargo.toml", &parsed.cargo_toml).await {
        error!("Failed to create Cargo.toml: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to create Cargo.toml".to_string(),
            data: None,
            error: Some(ApiError {
                code: "FILE_CREATION_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Create main.rs file
    let main_rs_content = r#"#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

use your_contract::YourContract;

fn main() {
    // This function is used for ABI export
}"#;

    if let Err(e) = filesystem.write_file(&req.user_id, &project_id_str, "src/main.rs", main_rs_content).await {
        error!("Failed to create main.rs: {}", e);
        // This is not critical, continue
    }

    info!("Successfully created embed project {} for user {}", project_id, req.user_id);

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Project created successfully".to_string(),
        data: Some(CreateEmbedProjectResponse {
            project_id: project_id_str,
            project_name: parsed.project_name,
        }),
        error: None,
    })
}

async fn validate_embed_data(
    req: web::Json<ValidateEmbedRequest>,
) -> HttpResponse {
    let parser = EmbedParser::new();

    // Decode embed data
    let embed_data = match EmbedParser::decode_embed_data(&req.embed_data) {
        Ok(data) => data,
        Err(e) => {
            return HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "Validation complete".to_string(),
                data: Some(ValidateEmbedResponse {
                    valid: false,
                    parsed_data: None,
                    error: Some(e.to_string()),
                }),
                error: None,
            });
        }
    };

    // Parse and validate
    match parser.parse_embed_data(&embed_data) {
        Ok(parsed) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "Validation complete".to_string(),
                data: Some(ValidateEmbedResponse {
                    valid: true,
                    parsed_data: Some(parsed),
                    error: None,
                }),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "Validation complete".to_string(),
                data: Some(ValidateEmbedResponse {
                    valid: false,
                    parsed_data: None,
                    error: Some(e.to_string()),
                }),
                error: None,
            })
        }
    }
}

async fn generate_embed_button(
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    let embed_data = query.get("data").cloned().unwrap_or_default();
    let theme = query.get("theme").cloned().unwrap_or_else(|| "light".to_string());
    let size = query.get("size").cloned().unwrap_or_else(|| "medium".to_string());

    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Try on Wizard</title>
    <style>
        .wizard-embed-button {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: {};
            color: {};
            border: none;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: {};
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }}
        .wizard-embed-button:hover {{
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }}
        .wizard-icon {{
            width: 20px;
            height: 20px;
        }}
    </style>
</head>
<body>
    <button class="wizard-embed-button" onclick="openInWizard()">
        <svg class="wizard-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
            <path d="M2 17L12 22L22 17"/>
            <path d="M2 12L12 17L22 12"/>
        </svg>
        Try on Wizard
    </button>
    
    <script>
        function openInWizard() {{
            const url = 'https://thewizard.app/tryonwizard/{}';
            window.open(url, '_blank');
        }}
    </script>
</body>
</html>"#,
        if theme == "dark" { "#1a1a1a" } else { "#ffffff" },
        if theme == "dark" { "#ffffff" } else { "#1a1a1a" },
        match size.as_str() {
            "small" => "14px",
            "large" => "18px",
            _ => "16px",
        },
        embed_data
    );

    HttpResponse::Ok()
        .content_type("text/html")
        .body(html)
}