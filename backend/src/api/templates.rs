use actix_web::{web, HttpResponse};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;
use std::fs;

use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub difficulty: String,
    pub features: Vec<String>,
    #[serde(rename = "githubUrl")]
    pub github_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InitializeFromTemplateRequest {
    pub project_id: String,
    pub user_id: String,
    pub template_id: String,
    pub project_name: String,
}

#[derive(Debug, Serialize)]
pub struct InitializeTemplateResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ListTemplatesResponse {
    pub templates: Vec<Template>,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/templates/list")
            .route(web::get().to(list_templates))
    )
    .service(
        web::resource("/templates/initialize")
            .route(web::post().to(initialize_from_template))
    );
}

async fn list_templates() -> HttpResponse {
    info!("Listing available templates");
    
    // Look for examples directory in the backend directory
    let examples_path = PathBuf::from("examples");
    
    if !examples_path.exists() {
        error!("Examples directory not found");
        return HttpResponse::InternalServerError().json(ApiResponse::<ListTemplatesResponse> {
            success: false,
            message: "Templates directory not found".to_string(),
            data: None,
            error: Some(ApiError {
                code: "TEMPLATES_DIR_NOT_FOUND".to_string(),
                message: "Examples directory does not exist".to_string(),
                details: None,
            }),
        });
    }
    
    let mut templates = Vec::new();
    
    // Read template directories
    match fs::read_dir(&examples_path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                if entry.file_type().map_or(false, |ft| ft.is_dir()) {
                    if let Some(template_id) = entry.file_name().to_str() {
                        let template_path = entry.path();
                        
                        // Skip .git and other hidden directories
                        if template_id.starts_with('.') {
                            continue;
                        }
                        
                        // Always use default template metadata for consistent data including GitHub URLs
                        let template = create_default_template_metadata(template_id);
                        
                        templates.push(template);
                    }
                }
            }
        }
        Err(e) => {
            error!("Failed to read templates directory: {}", e);
            return HttpResponse::InternalServerError().json(ApiResponse::<ListTemplatesResponse> {
                success: false,
                message: "Failed to read templates directory".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "TEMPLATES_READ_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    }
    
    // Sort templates in desired order
    templates.sort_by_key(|template| {
        match template.id.as_str() {
            "hello-world" => 0,
            "erc721-openzeppelin" => 1, 
            "erc20-openzeppelin" => 2,
            "erc1155-openzeppelin" => 3,
            "ownable-openzeppelin" => 4,
            "access-control-openzeppelin" => 5,
            "merkle-proofs-openzeppelin" => 6,
            _ => 99, // Other templates at the end
        }
    });

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Templates retrieved successfully".to_string(),
        data: Some(ListTemplatesResponse { templates }),
        error: None,
    })
}

async fn initialize_from_template(
    data: web::Data<AppState>,
    req: web::Json<InitializeFromTemplateRequest>,
) -> HttpResponse {
    info!(
        "Initializing project {} from template {} for user {}",
        req.project_id, req.template_id, req.user_id
    );

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

    // Check if template exists
    let template_path = PathBuf::from("examples").join(&req.template_id);
    if !template_path.exists() {
        error!("Template not found: {}", req.template_id);
        return HttpResponse::NotFound().json(ApiResponse::<()> {
            success: false,
            message: "Template not found".to_string(),
            data: None,
            error: Some(ApiError {
                code: "TEMPLATE_NOT_FOUND".to_string(),
                message: format!("Template '{}' does not exist", req.template_id),
                details: None,
            }),
        });
    }

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
            data: Some(InitializeTemplateResponse {
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

    // Copy template files to project directory
    match copy_template_files(&template_path, &project_path, &req.project_name) {
        Ok(_) => {
            info!(
                "Successfully initialized project {} from template {} at {:?}",
                req.project_id, req.template_id, project_path
            );

            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "Project initialized from template successfully".to_string(),
                data: Some(InitializeTemplateResponse {
                    success: true,
                    message: format!("Project created from template '{}' at {:?}", req.template_id, project_path),
                }),
                error: None,
            })
        }
        Err(e) => {
            error!("Failed to copy template files: {}", e);
            // Clean up the project directory
            let _ = std::fs::remove_dir_all(&project_path);
            
            HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to initialize project from template".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "TEMPLATE_COPY_FAILED".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

fn load_template_metadata(template_path: &PathBuf, template_id: &str) -> Result<Template, std::io::Error> {
    let readme_path = template_path.join("README.md");
    
    if readme_path.exists() {
        let content = fs::read_to_string(&readme_path)?;
        
        // Extract metadata from README.md
        // This is a simple parser - you could make it more sophisticated
        let mut name = template_id.to_string();
        let mut description = "A Stylus smart contract template".to_string();
        let mut category = "General".to_string();
        let mut difficulty = "Intermediate".to_string();
        let mut features = Vec::new();
        
        // Look for title (first # heading)
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with("# ") && name == template_id {
                name = line[2..].trim().to_string();
                break;
            }
        }
        
        // Extract description from first paragraph
        let lines: Vec<&str> = content.lines().collect();
        for (i, line) in lines.iter().enumerate() {
            let line = line.trim();
            if !line.is_empty() && !line.starts_with('#') && !line.starts_with('!') {
                description = line.to_string();
                break;
            }
        }
        
        // Set features based on template_id
        features = match template_id {
            "hello-world" => vec![
                "Basic Stylus contract structure".to_string(),
                "Simple state management".to_string(),
                "Getting started tutorial".to_string(),
                "Minimal dependencies".to_string(),
            ],
            _ => vec!["Smart contract template".to_string()],
        };
        
        Ok(Template {
            id: template_id.to_string(),
            name,
            description,
            category,
            difficulty,
            features,
            github_url: None,
        })
    } else {
        Ok(create_default_template_metadata(template_id))
    }
}

fn create_default_template_metadata(template_id: &str) -> Template {
    let (name, description, category, difficulty, features, github_url) = match template_id {
        "hello-world" => (
            "Hello World Contract".to_string(),
            "A simple starter template to get you familiar with Stylus development. Features a basic counter contract with increment and decrement functions - perfect for learning the fundamentals of Rust smart contracts.".to_string(),
            "Tutorial".to_string(),
            "Beginner".to_string(),
            vec![
                "Basic Stylus contract structure".to_string(),
                "Simple state management".to_string(),
                "Getting started tutorial".to_string(),
                "Minimal dependencies".to_string(),
            ],
            Some("https://github.com/OffchainLabs/stylus-hello-world".to_string()),
        ),
        "erc20-openzeppelin" => (
            "Fungible Token Standard (ERC-20)".to_string(),
            "Industry-standard ERC-20 token implementation with advanced features like minting, burning, and pausable transfers. Built with OpenZeppelin's battle-tested security patterns and ready for production use.".to_string(),
            "Token".to_string(),
            "Intermediate".to_string(),
            vec![
                "Secure token implementation".to_string(),
                "Minting & burning capabilities".to_string(),
                "Pausable functionality".to_string(),
                "Supply cap management".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/erc20".to_string()),
        ),
        "erc721-openzeppelin" => (
            "Non-Fungible Token Standard (ERC-721)".to_string(),
            "Complete NFT implementation following the ERC-721 standard. Create unique digital assets with metadata support, safe transfers, and enumeration features. Perfect for collectibles, gaming assets, and digital art.".to_string(),
            "NFT".to_string(),
            "Intermediate".to_string(),
            vec![
                "Unique token creation".to_string(),
                "Metadata & URI support".to_string(),
                "Safe transfer mechanisms".to_string(),
                "Token enumeration".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/erc721".to_string()),
        ),
        "erc1155-openzeppelin" => (
            "Multi-Token Standard (ERC-1155)".to_string(),
            "Advanced ERC-1155 implementation that combines fungible and non-fungible tokens in a single contract. Optimized for batch operations and gas efficiency - ideal for gaming items and complex token ecosystems.".to_string(),
            "Token".to_string(),
            "Advanced".to_string(),
            vec![
                "Multi-token support".to_string(),
                "Batch operations".to_string(),
                "Gas optimization".to_string(),
                "Flexible token types".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/erc1155".to_string()),
        ),
        "access-control-openzeppelin" => (
            "Role-Based Access Control".to_string(),
            "Sophisticated permission management system with hierarchical roles and fine-grained access control. Implement admin privileges, operator roles, and custom permissions with OpenZeppelin's proven security model.".to_string(),
            "Security".to_string(),
            "Advanced".to_string(),
            vec![
                "Hierarchical permissions".to_string(),
                "Role-based security".to_string(),
                "Admin management".to_string(),
                "Custom role creation".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/access-control".to_string()),
        ),
        "ownable-openzeppelin" => (
            "Ownership Management".to_string(),
            "Simple yet powerful ownership pattern that restricts critical functions to the contract owner. Includes secure ownership transfer mechanisms and is the foundation for many DeFi and governance contracts.".to_string(),
            "Security".to_string(),
            "Beginner".to_string(),
            vec![
                "Owner-only functions".to_string(),
                "Secure ownership transfer".to_string(),
                "Access restriction patterns".to_string(),
                "Governance foundation".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/ownable".to_string()),
        ),
        "merkle-proofs-openzeppelin" => (
            "Cryptographic Proofs (Merkle Trees)".to_string(),
            "Efficient verification system using Merkle trees to prove membership in large datasets without revealing the entire set. Essential for airdrops, whitelists, and privacy-preserving applications.".to_string(),
            "Cryptography".to_string(),
            "Advanced".to_string(),
            vec![
                "Merkle tree verification".to_string(),
                "Gas-efficient proofs".to_string(),
                "Privacy preservation".to_string(),
                "Airdrop mechanics".to_string(),
            ],
            Some("https://github.com/OpenZeppelin/rust-contracts-stylus/tree/v0.3/examples/merkle-proofs".to_string()),
        ),
        _ => (
            template_id.replace('-', " ").replace('_', " ").to_string(),
            format!("A Stylus smart contract template for {}", template_id),
            "General".to_string(),
            "Intermediate".to_string(),
            vec!["Smart contract template".to_string()],
            None,
        ),
    };

    Template {
        id: template_id.to_string(),
        name,
        description,
        category,
        difficulty,
        features,
        github_url,
    }
}

fn copy_template_files(template_path: &PathBuf, project_path: &PathBuf, project_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Copy all files from template to project directory, excluding .git
    copy_dir_recursive(template_path, project_path, &[".git"])?;

    // Get the template name from the Cargo.toml for use in main.rs update
    let template_cargo_path = template_path.join("Cargo.toml");
    let template_crate_name = if template_cargo_path.exists() {
        let content = fs::read_to_string(&template_cargo_path)?;
        extract_crate_name(&content)
    } else {
        None
    };

    // Update Cargo.toml with the new project name if it exists
    let cargo_toml_path = project_path.join("Cargo.toml");
    if cargo_toml_path.exists() {
        let content = fs::read_to_string(&cargo_toml_path)?;
        let updated_content = update_cargo_toml_name(&content, project_name);
        fs::write(&cargo_toml_path, updated_content)?;
    }

    // Update main.rs to use the new crate name for ABI export
    let main_rs_path = project_path.join("src").join("main.rs");
    if main_rs_path.exists() {
        if let Some(old_crate_name) = template_crate_name {
            let content = fs::read_to_string(&main_rs_path)?;
            // Convert project name to valid Rust crate name (replace hyphens with underscores)
            let new_crate_name = project_name.to_lowercase().replace('-', "_");
            let old_crate_identifier = old_crate_name.replace('-', "_");
            let updated_content = content.replace(&old_crate_identifier, &new_crate_name);
            fs::write(&main_rs_path, updated_content)?;
        }
    }

    Ok(())
}

fn extract_crate_name(cargo_toml_content: &str) -> Option<String> {
    for line in cargo_toml_content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("name = ") {
            // Extract name from: name = "package-name"
            let name = trimmed.trim_start_matches("name = ")
                .trim_matches('"')
                .trim_matches('\'');
            return Some(name.to_string());
        }
    }
    None
}

fn copy_dir_recursive(
    src: &PathBuf, 
    dst: &PathBuf, 
    exclude: &[&str]
) -> Result<(), Box<dyn std::error::Error>> {
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let name = path.file_name().unwrap().to_str().unwrap_or("");
        
        // Skip excluded directories/files
        if exclude.iter().any(|&exc| name == exc) {
            continue;
        }
        
        let dest_path = dst.join(name);
        
        if path.is_dir() {
            fs::create_dir_all(&dest_path)?;
            copy_dir_recursive(&path, &dest_path, exclude)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    
    Ok(())
}

fn update_cargo_toml_name(content: &str, new_name: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let mut result = Vec::new();
    
    for line in lines {
        if line.trim().starts_with("name = ") {
            result.push(format!("name = \"{}\"", new_name));
        } else {
            result.push(line.to_string());
        }
    }
    
    result.join("\n")
}