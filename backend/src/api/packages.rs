use actix_web::{web, HttpResponse};
use log::{error, info};
use serde::{Deserialize, Serialize};

use crate::services::cargo_manager::CargoManager;
use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PackageInstallRequest {
    pub user_id: String,
    pub project_id: String,
    pub package_name: String,
    pub version: String,
}

#[derive(Debug, Deserialize)]
pub struct PackageRemoveRequest {
    pub user_id: String,
    pub project_id: String,
    pub package_name: String,
}

#[derive(Debug, Deserialize)]
pub struct PackageUpdateRequest {
    pub user_id: String,
    pub project_id: String,
    pub package_name: String,
    pub version: String,
}

#[derive(Debug, Deserialize)]
pub struct PackageListQuery {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Serialize)]
pub struct ProjectDependency {
    pub name: String,
    pub version: String,
    pub is_default: bool,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/packages/install")
            .route(web::post().to(install_package))
    )
    .service(
        web::resource("/packages/remove")
            .route(web::delete().to(remove_package))
    )
    .service(
        web::resource("/packages/update")
            .route(web::put().to(update_package))
    )
    .service(
        web::resource("/packages/list")
            .route(web::get().to(list_packages))
    );
}

async fn install_package(
    data: web::Data<AppState>,
    req: web::Json<PackageInstallRequest>,
) -> HttpResponse {
    info!(
        "Installing package '{}' v{} for project {} by user {}", 
        req.package_name, req.version, req.project_id, req.user_id
    );

    let cargo_manager = CargoManager::new();

    // Validate inputs
    if !cargo_manager.is_valid_package_name(&req.package_name) {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            message: "Invalid package name".to_string(),
            data: None,
            error: Some(ApiError {
                code: "INVALID_PACKAGE_NAME".to_string(),
                message: "Package name contains invalid characters".to_string(),
                details: None,
            }),
        });
    }

    if !cargo_manager.is_valid_version(&req.version) {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            message: "Invalid version format".to_string(),
            data: None,
            error: Some(ApiError {
                code: "INVALID_VERSION".to_string(),
                message: "Version format is invalid".to_string(),
                details: None,
            }),
        });
    }

    // Read current Cargo.toml
    let cargo_path = "Cargo.toml";
    let current_content = match data.filesystem.read_file(&req.user_id, &req.project_id, cargo_path).await {
        Ok(content) => content.content,
        Err(_) => {
            // If Cargo.toml doesn't exist, create a default one
            info!("Cargo.toml not found for project {}, creating default", req.project_id);
            cargo_manager.create_default_cargo_toml(&req.project_id)
        }
    };

    // Parse current dependencies to check if package already exists
    match cargo_manager.parse_cargo_toml(&current_content) {
        Ok(deps) => {
            if deps.iter().any(|d| d.name == req.package_name) {
                return HttpResponse::BadRequest().json(ApiResponse::<()> {
                    success: false,
                    message: format!("Package '{}' is already installed", req.package_name),
                    data: None,
                    error: Some(ApiError {
                        code: "PACKAGE_ALREADY_EXISTS".to_string(),
                        message: "Use update endpoint to change version".to_string(),
                        details: None,
                    }),
                });
            }
        }
        Err(e) => {
            error!("Failed to parse Cargo.toml: {}", e);
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to parse Cargo.toml".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "PARSE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    }

    // Add the dependency
    let updated_content = match cargo_manager.add_dependency(&current_content, &req.package_name, &req.version) {
        Ok(content) => content,
        Err(e) => {
            error!("Failed to add dependency: {}", e);
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to add dependency".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "ADD_DEPENDENCY_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Write updated Cargo.toml
    if let Err(e) = data.filesystem.write_file(&req.user_id, &req.project_id, cargo_path, &updated_content).await {
        error!("Failed to write updated Cargo.toml: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to update Cargo.toml".to_string(),
            data: None,
            error: Some(ApiError {
                code: "WRITE_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    info!(
        "Successfully installed package '{}' v{} for project {}", 
        req.package_name, req.version, req.project_id
    );

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Successfully installed package '{}' v{}", req.package_name, req.version),
        data: Some(()),
        error: None,
    })
}

async fn remove_package(
    data: web::Data<AppState>,
    req: web::Json<PackageRemoveRequest>,
) -> HttpResponse {
    info!(
        "Removing package '{}' from project {} by user {}", 
        req.package_name, req.project_id, req.user_id
    );

    let cargo_manager = CargoManager::new();

    // Read current Cargo.toml
    let cargo_path = "Cargo.toml";
    let current_content = match data.filesystem.read_file(&req.user_id, &req.project_id, cargo_path).await {
        Ok(content) => content.content,
        Err(e) => {
            error!("Failed to read Cargo.toml: {}", e);
            return HttpResponse::NotFound().json(ApiResponse::<()> {
                success: false,
                message: "Cargo.toml not found".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "CARGO_TOML_NOT_FOUND".to_string(),
                    message: "Project does not have a Cargo.toml file".to_string(),
                    details: None,
                }),
            });
        }
    };

    // Check if package exists and if it's removable
    match cargo_manager.parse_cargo_toml(&current_content) {
        Ok(deps) => {
            let dep = deps.iter().find(|d| d.name == req.package_name);
            match dep {
                None => {
                    return HttpResponse::NotFound().json(ApiResponse::<()> {
                        success: false,
                        message: format!("Package '{}' is not installed", req.package_name),
                        data: None,
                        error: Some(ApiError {
                            code: "PACKAGE_NOT_FOUND".to_string(),
                            message: "Cannot remove a package that is not installed".to_string(),
                            details: None,
                        }),
                    });
                }
                Some(dep) if dep.is_default => {
                    return HttpResponse::BadRequest().json(ApiResponse::<()> {
                        success: false,
                        message: format!("Cannot remove default dependency '{}'", req.package_name),
                        data: None,
                        error: Some(ApiError {
                            code: "DEFAULT_DEPENDENCY".to_string(),
                            message: "Default dependencies are required for Stylus projects".to_string(),
                            details: None,
                        }),
                    });
                }
                Some(_) => {} // Package exists and is removable
            }
        }
        Err(e) => {
            error!("Failed to parse Cargo.toml: {}", e);
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to parse Cargo.toml".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "PARSE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    }

    // Remove the dependency
    let updated_content = match cargo_manager.remove_dependency(&current_content, &req.package_name) {
        Ok(content) => content,
        Err(e) => {
            error!("Failed to remove dependency: {}", e);
            return HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to remove dependency".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "REMOVE_DEPENDENCY_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Write updated Cargo.toml
    if let Err(e) = data.filesystem.write_file(&req.user_id, &req.project_id, cargo_path, &updated_content).await {
        error!("Failed to write updated Cargo.toml: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to update Cargo.toml".to_string(),
            data: None,
            error: Some(ApiError {
                code: "WRITE_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    info!(
        "Successfully removed package '{}' from project {}", 
        req.package_name, req.project_id
    );

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Successfully removed package '{}'", req.package_name),
        data: Some(()),
        error: None,
    })
}

async fn update_package(
    data: web::Data<AppState>,
    req: web::Json<PackageUpdateRequest>,
) -> HttpResponse {
    info!(
        "Updating package '{}' to v{} for project {} by user {}", 
        req.package_name, req.version, req.project_id, req.user_id
    );

    let cargo_manager = CargoManager::new();

    // Validate version
    if !cargo_manager.is_valid_version(&req.version) {
        return HttpResponse::BadRequest().json(ApiResponse::<()> {
            success: false,
            message: "Invalid version format".to_string(),
            data: None,
            error: Some(ApiError {
                code: "INVALID_VERSION".to_string(),
                message: "Version format is invalid".to_string(),
                details: None,
            }),
        });
    }

    // Read current Cargo.toml
    let cargo_path = "Cargo.toml";
    let current_content = match data.filesystem.read_file(&req.user_id, &req.project_id, cargo_path).await {
        Ok(content) => content.content,
        Err(e) => {
            error!("Failed to read Cargo.toml: {}", e);
            return HttpResponse::NotFound().json(ApiResponse::<()> {
                success: false,
                message: "Cargo.toml not found".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "CARGO_TOML_NOT_FOUND".to_string(),
                    message: "Project does not have a Cargo.toml file".to_string(),
                    details: None,
                }),
            });
        }
    };

    // Update the dependency
    let updated_content = match cargo_manager.update_dependency(&current_content, &req.package_name, &req.version) {
        Ok(content) => content,
        Err(e) => {
            error!("Failed to update dependency: {}", e);
            return HttpResponse::BadRequest().json(ApiResponse::<()> {
                success: false,
                message: "Failed to update dependency".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "UPDATE_DEPENDENCY_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    // Write updated Cargo.toml
    if let Err(e) = data.filesystem.write_file(&req.user_id, &req.project_id, cargo_path, &updated_content).await {
        error!("Failed to write updated Cargo.toml: {}", e);
        return HttpResponse::InternalServerError().json(ApiResponse::<()> {
            success: false,
            message: "Failed to update Cargo.toml".to_string(),
            data: None,
            error: Some(ApiError {
                code: "WRITE_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    info!(
        "Successfully updated package '{}' to v{} for project {}", 
        req.package_name, req.version, req.project_id
    );

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Successfully updated package '{}' to v{}", req.package_name, req.version),
        data: Some(()),
        error: None,
    })
}

async fn list_packages(
    data: web::Data<AppState>,
    query: web::Query<PackageListQuery>,
) -> HttpResponse {
    info!(
        "Listing packages for project {} by user {}", 
        query.project_id, query.user_id
    );

    let cargo_manager = CargoManager::new();

    // Read current Cargo.toml
    let cargo_path = "Cargo.toml";
    let current_content = match data.filesystem.read_file(&query.user_id, &query.project_id, cargo_path).await {
        Ok(content) => content.content,
        Err(_) => {
            // If Cargo.toml doesn't exist, return empty list
            info!("Cargo.toml not found for project {}, returning empty list", query.project_id);
            return HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "No dependencies found".to_string(),
                data: Some(Vec::<ProjectDependency>::new()),
                error: None,
            });
        }
    };

    // Parse dependencies
    match cargo_manager.parse_cargo_toml(&current_content) {
        Ok(deps) => {
            let project_deps: Vec<ProjectDependency> = deps.into_iter().map(|d| ProjectDependency {
                name: d.name,
                version: d.version,
                is_default: d.is_default,
            }).collect();

            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: format!("Found {} dependencies", project_deps.len()),
                data: Some(project_deps),
                error: None,
            })
        }
        Err(e) => {
            error!("Failed to parse Cargo.toml: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<Vec<ProjectDependency>> {
                success: false,
                message: "Failed to parse Cargo.toml".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "PARSE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}