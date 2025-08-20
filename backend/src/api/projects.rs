use actix_web::{web, HttpResponse};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

use crate::services::filesystem::FileSystemService;
use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct InitializeProjectRequest {
    pub project_id: String,
    pub user_id: String,
    pub code: String,
    pub project_name: String,
    pub dependencies: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct InitializeProjectResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct GetWasmRequest {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Serialize)]
pub struct WasmResponse {
    pub wasm_hex: String,
    pub salt: String,
    pub size: usize,
    pub size_formatted: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/projects/initialize")
            .route(web::post().to(initialize_project))
    )
    .service(
        web::resource("/projects/wasm")
            .route(web::post().to(get_wasm))
    );
}

async fn initialize_project(
    data: web::Data<AppState>,
    req: web::Json<InitializeProjectRequest>,
) -> HttpResponse {
    info!(
        "Initializing project {} for user {}",
        req.project_id, req.user_id
    );

    let filesystem = &data.filesystem;
    
    // Validate UUIDs
    let user_id = match Uuid::parse_str(&req.user_id) {
        Ok(id) => id.to_string(),
        Err(_) => {
            error!("Invalid user_id format: {}", req.user_id);
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Invalid user ID format".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "INVALID_USER_ID".to_string(),
                    message: "User ID must be a valid UUID".to_string(),
                    details: None,
                }),
            });
        }
    };

    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(id) => id.to_string(),
        Err(_) => {
            error!("Invalid project_id format: {}", req.project_id);
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Invalid project ID format".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "INVALID_PROJECT_ID".to_string(),
                    message: "Project ID must be a valid UUID".to_string(),
                    details: None,
                }),
            });
        }
    };

    // Create project directory structure
    let project_path = PathBuf::from(&data.config.storage.path)
        .join(&user_id)
        .join(&project_id);

    // Check if project already exists
    if project_path.exists() {
        info!("Project directory already exists: {:?}", project_path);
        return HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "Project already initialized".to_string(),
            data: Some(InitializeProjectResponse {
                success: true,
                message: "Project filesystem already exists".to_string(),
            }),
            error: None,
        });
    }

    // Create project directory
    if let Err(e) = std::fs::create_dir_all(&project_path) {
        error!("Failed to create project directory: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to create project directory".to_string(),
            data: None,
            error: Some(ApiError {
                code: "DIRECTORY_CREATION_FAILED".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Initialize Cargo project using cargo stylus
    info!("Initializing Stylus project at {:?}", project_path);
    let output = std::process::Command::new("cargo")
        .args(&["stylus", "new", "--minimal", &req.project_name])
        .current_dir(&project_path.parent().unwrap())
        .output();

    match output {
        Ok(result) => {
            if !result.status.success() {
                let stderr = String::from_utf8_lossy(&result.stderr);
                
                // If cargo stylus is not installed, try regular cargo init
                if stderr.contains("no such subcommand") {
                    info!("cargo-stylus not found, using cargo init instead");
                    
                    let init_output = std::process::Command::new("cargo")
                        .args(&["init", "--lib", "--name", &req.project_name, "."])
                        .current_dir(&project_path)
                        .output();
                    
                    if let Err(e) = init_output {
                        error!("Failed to initialize Cargo project: {}", e);
                        // Continue anyway - we'll create the files manually
                    }
                } else {
                    error!("cargo stylus new failed: {}", stderr);
                    // Continue anyway - we'll create the files manually
                }
            } else {
                // Move files from the created subdirectory to project root
                let created_dir = project_path.join(&req.project_name);
                if created_dir.exists() {
                    // Move all files from subdirectory to project root
                    if let Ok(entries) = std::fs::read_dir(&created_dir) {
                        for entry in entries.flatten() {
                            let from = entry.path();
                            let file_name = from.file_name().unwrap();
                            let to = project_path.join(file_name);
                            let _ = std::fs::rename(&from, &to);
                        }
                    }
                    // Remove the now-empty subdirectory
                    let _ = std::fs::remove_dir_all(&created_dir);
                }
            }
        }
        Err(e) => {
            error!("Failed to run cargo command: {}", e);
            // Continue anyway - we'll create the files manually
        }
    }

    // Create src directory if it doesn't exist
    let src_dir = project_path.join("src");
    if !src_dir.exists() {
        if let Err(e) = std::fs::create_dir(&src_dir) {
            error!("Failed to create src directory: {}", e);
        }
    }

    // Write the embedded code to src/lib.rs
    let lib_path = src_dir.join("lib.rs");
    if let Err(e) = std::fs::write(&lib_path, &req.code) {
        error!("Failed to write lib.rs: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to write project code".to_string(),
            data: None,
            error: Some(ApiError {
                code: "FILE_WRITE_FAILED".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Create or update Cargo.toml with dependencies
    let cargo_toml_path = project_path.join("Cargo.toml");
    let cargo_toml_content = if cargo_toml_path.exists() {
        // Read existing Cargo.toml and update dependencies
        std::fs::read_to_string(&cargo_toml_path).unwrap_or_else(|_| {
            generate_cargo_toml(&req.project_name, req.dependencies.as_deref())
        })
    } else {
        generate_cargo_toml(&req.project_name, req.dependencies.as_deref())
    };

    if let Err(e) = std::fs::write(&cargo_toml_path, cargo_toml_content) {
        error!("Failed to write Cargo.toml: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to write Cargo.toml".to_string(),
            data: None,
            error: Some(ApiError {
                code: "FILE_WRITE_FAILED".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Create .gitignore if it doesn't exist
    let gitignore_path = project_path.join(".gitignore");
    if !gitignore_path.exists() {
        let gitignore_content = "target/\nCargo.lock\n*.swp\n.DS_Store\n";
        let _ = std::fs::write(&gitignore_path, gitignore_content);
    }

    info!(
        "Successfully initialized project {} at {:?}",
        req.project_id, project_path
    );

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Project initialized successfully".to_string(),
        data: Some(InitializeProjectResponse {
            success: true,
            message: format!("Project filesystem created at {:?}", project_path),
        }),
        error: None,
    })
}

fn generate_cargo_toml(project_name: &str, dependencies: Option<&[String]>) -> String {
    let mut cargo_toml = format!(
        r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[dependencies]
"#,
        project_name
    );

    // Add default stylus-sdk if not present
    let default_deps = vec!["stylus-sdk".to_string()];
    let deps = dependencies.unwrap_or(&default_deps);
    
    for dep in deps {
        // Parse dependency to handle versions
        if dep.contains('=') || dep.contains('^') || dep.contains('~') {
            cargo_toml.push_str(&format!("{}\n", dep));
        } else {
            // Add default versions for known packages (matching cargo-stylus template)
            match dep.as_str() {
                "stylus-sdk" => cargo_toml.push_str("stylus-sdk = \"0.9.0\"\n"),
                "alloy-primitives" => cargo_toml.push_str("alloy-primitives = \"=0.8.20\"\n"),
                "alloy-sol-types" => cargo_toml.push_str("alloy-sol-types = \"=0.8.20\"\n"),
                "hex" => cargo_toml.push_str("hex = { version = \"0.4\", default-features = false }\n"),
                _ => cargo_toml.push_str(&format!("{} = \"*\"\n", dep)),
            }
        }
    }

    // Add additional dependencies for Stylus development
    cargo_toml.push_str(
        r#"
[dev-dependencies]
alloy-primitives = { version = "=0.8.20", features = ["sha3-keccak"] }
stylus-sdk = { version = "0.9.0", features = ["stylus-test"] }

[features]
default = ["mini-alloc"]
export-abi = ["stylus-sdk/export-abi"]
debug = ["stylus-sdk/debug"]
mini-alloc = ["stylus-sdk/mini-alloc"]

[lib]
crate-type = ["lib", "cdylib"]

[profile.release]
codegen-units = 1
strip = true
lto = true
panic = "abort"
opt-level = 3
"#,
    );

    cargo_toml
}

async fn get_wasm(
    data: web::Data<AppState>,
    req: web::Json<GetWasmRequest>,
) -> HttpResponse {
    match data.local_compiler.get_wasm_hex(&req.user_id, &req.project_id).await {
        Ok(wasm_hex) => {
            // Calculate salt and size
            match data.local_compiler.get_wasm_salt(&req.user_id, &req.project_id).await {
                Ok(salt) => {
                    let wasm_bytes = hex::decode(&wasm_hex).unwrap_or_default();
                    let size = wasm_bytes.len();
                    let size_formatted = format!("{:.1} KiB ({} bytes)", size as f64 / 1024.0, size);
                    
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: "WASM bytecode retrieved successfully".to_string(),
                        data: Some(WasmResponse {
                            wasm_hex,
                            salt,
                            size,
                            size_formatted,
                        }),
                        error: None,
                    })
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(ApiResponse::<WasmResponse> {
                        success: false,
                        message: "Failed to calculate WASM salt".to_string(),
                        data: None,
                        error: Some(ApiError {
                            code: "SALT_CALCULATION_ERROR".to_string(),
                            message: e.to_string(),
                            details: None,
                        }),
                    })
                }
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<WasmResponse> {
                success: false,
                message: "Failed to get WASM bytecode".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "WASM_NOT_FOUND".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}