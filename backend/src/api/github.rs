use actix_web::{web, HttpResponse};
use log::{info, warn};
use reqwest;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::process::Command;
use walkdir::WalkDir;

use crate::AppState;
use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct CloneRequest {
    pub user_id: String,
    pub project_id: String,
    pub repo_url: String,
    /// Optional branch/tag/SHA to clone. Defaults to the repo's default branch.
    pub branch: Option<String>,
    /// Optional subdirectory inside the repository to import as the project root. When set,
    /// only the contents of that subdirectory are placed in the project (no parent files).
    pub path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CloneResult {
    pub success: bool,
    pub files_count: usize,
    pub message: String,
    pub main_code: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GitHubRepo {
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub clone_url: String,
    pub default_branch: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/github/clone")
            .route(web::post().to(clone_repository))
    )
    .service(
        web::resource("/github/repos")
            .route(web::get().to(list_repositories))
    );
}

async fn clone_repository(
    data: web::Data<AppState>,
    req: web::Json<CloneRequest>,
) -> HttpResponse {
    // Create project directory path
    let project_path = PathBuf::from(&data.config.storage.path)
        .join(&req.user_id)
        .join(&req.project_id);

    // Create parent directory if it doesn't exist
    if let Some(parent) = project_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            return HttpResponse::InternalServerError().json(ApiResponse::<CloneResult> {
                success: false,
                message: "Failed to create project directory".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "DIRECTORY_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    }

    // Clean up inputs
    let clean_url = req.repo_url.trim();
    let subpath = req.path.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let branch = req.branch.as_deref().map(str::trim).filter(|s| !s.is_empty());

    // Reject obviously dangerous subpath values (absolute, traversal, etc.) to keep the move
    // step constrained to the cloned tree.
    if let Some(sp) = subpath {
        if sp.starts_with('/') || sp.split('/').any(|c| c == ".." || c.is_empty()) {
            return HttpResponse::BadRequest().json(ApiResponse::<CloneResult> {
                success: false,
                message: "Invalid subdirectory path".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "INVALID_PATH".to_string(),
                    message: format!("Path '{}' is not allowed", sp),
                    details: None,
                }),
            });
        }
    }

    // Wipe any pre-existing project dir so the import is fresh.
    if project_path.exists() {
        if let Err(e) = std::fs::remove_dir_all(&project_path) {
            warn!("Failed to clean existing directory: {}", e);
        }
    }

    // For a subpath import, clone into a sibling temp dir and move only the requested
    // subdirectory into the final project path. For a full-repo import, clone directly.
    let temp_clone_path = project_path.with_file_name(format!("{}_temp", req.project_id));
    if temp_clone_path.exists() {
        let _ = std::fs::remove_dir_all(&temp_clone_path);
    }
    let clone_target = if subpath.is_some() { &temp_clone_path } else { &project_path };

    if let Err(e) = std::fs::create_dir_all(clone_target) {
        return HttpResponse::InternalServerError().json(ApiResponse::<CloneResult> {
            success: false,
            message: "Failed to create project directory".to_string(),
            data: None,
            error: Some(ApiError {
                code: "DIRECTORY_ERROR".to_string(),
                message: e.to_string(),
                details: None,
            }),
        });
    }

    // Build git clone command: shallow clone, optional branch.
    info!(
        "Cloning {} (branch={:?}, path={:?}) to {:?}",
        clean_url, branch, subpath, clone_target
    );
    let mut git_cmd = Command::new("git");
    git_cmd.arg("clone").arg("--depth").arg("1");
    if let Some(b) = branch {
        git_cmd.arg("--branch").arg(b);
    }
    git_cmd.arg(clean_url).arg(".").current_dir(clone_target);

    let output = match git_cmd.output().await {
        Ok(output) => output,
        Err(e) => {
            let _ = std::fs::remove_dir_all(clone_target);
            return HttpResponse::InternalServerError().json(ApiResponse::<CloneResult> {
                success: false,
                message: "Failed to execute git clone".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "GIT_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            });
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = std::fs::remove_dir_all(clone_target);
        return HttpResponse::BadRequest().json(ApiResponse::<CloneResult> {
            success: false,
            message: "Git clone failed".to_string(),
            data: None,
            error: Some(ApiError {
                code: "CLONE_FAILED".to_string(),
                message: stderr.to_string(),
                details: None,
            }),
        });
    }

    // Strip .git — for a subpath import the history wouldn't match the imported subset
    // anyway, and for a full clone we don't want users to accidentally `git push` from the
    // browser terminal back to the upstream repo.
    let _ = std::fs::remove_dir_all(clone_target.join(".git"));

    // For a subpath import, move only the requested subtree into the project dir.
    if let Some(sp) = subpath {
        let source_subdir = temp_clone_path.join(sp);
        if !source_subdir.exists() {
            let _ = std::fs::remove_dir_all(&temp_clone_path);
            return HttpResponse::BadRequest().json(ApiResponse::<CloneResult> {
                success: false,
                message: format!("Subdirectory '{}' not found in repository", sp),
                data: None,
                error: Some(ApiError {
                    code: "SUBDIR_NOT_FOUND".to_string(),
                    message: format!("Path '{}' does not exist on branch {}", sp, branch.unwrap_or("the default")),
                    details: None,
                }),
            });
        }
        if let Err(e) = std::fs::create_dir_all(&project_path) {
            let _ = std::fs::remove_dir_all(&temp_clone_path);
            return HttpResponse::InternalServerError().json(ApiResponse::<CloneResult> {
                success: false,
                message: "Failed to create project directory".to_string(),
                data: None,
                error: Some(ApiError { code: "DIRECTORY_ERROR".to_string(), message: e.to_string(), details: None }),
            });
        }
        if let Err(e) = move_dir_contents(&source_subdir, &project_path) {
            let _ = std::fs::remove_dir_all(&temp_clone_path);
            let _ = std::fs::remove_dir_all(&project_path);
            return HttpResponse::InternalServerError().json(ApiResponse::<CloneResult> {
                success: false,
                message: "Failed to extract subdirectory".to_string(),
                data: None,
                error: Some(ApiError { code: "MOVE_FAILED".to_string(), message: e.to_string(), details: None }),
            });
        }
        let _ = std::fs::remove_dir_all(&temp_clone_path);
    }

    // Count files in the cloned/extracted project
    let files_count = count_project_files(&project_path);
    
    if files_count == 0 {
        return HttpResponse::BadRequest().json(ApiResponse::<CloneResult> {
            success: false,
            message: "No Rust project files found".to_string(),
            data: None,
            error: Some(ApiError {
                code: "NO_PROJECT_FILES".to_string(),
                message: "The repository doesn't contain any Rust source files or Cargo.toml".to_string(),
                details: None,
            }),
        });
    }

    // Try to read the main source file
    let main_code = read_main_source_file(&project_path);
    
    info!("Successfully cloned repository with {} files", files_count);
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Repository cloned successfully".to_string(),
        data: Some(CloneResult {
            success: true,
            files_count,
            message: format!("Cloned {} files from repository", files_count),
            main_code,
        }),
        error: None,
    })
}

/// Count relevant project files in the cloned repository
fn count_project_files(path: &Path) -> usize {
    let mut count = 0;
    
    for entry in WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Skip directories
        if path.is_dir() {
            continue;
        }
        
        // Skip hidden files and directories (like .git)
        if path.components().any(|c| {
            c.as_os_str().to_string_lossy().starts_with('.')
                && c.as_os_str() != "." && c.as_os_str() != ".."
        }) {
            continue;
        }
        
        // Count Rust files, TOML files, and other relevant project files
        if let Some(ext) = path.extension() {
            match ext.to_str() {
                Some("rs") | Some("toml") | Some("md") | Some("lock") => count += 1,
                _ => {}
            }
        }
    }
    
    count
}

/// Try to read the main source file from the project
fn read_main_source_file(path: &Path) -> Option<String> {
    // Try common locations for the main source file
    let possible_paths = [
        path.join("src/lib.rs"),
        path.join("lib.rs"),
        path.join("src/main.rs"),
        path.join("main.rs"),
    ];
    
    for file_path in &possible_paths {
        if file_path.exists() {
            if let Ok(content) = std::fs::read_to_string(file_path) {
                return Some(content);
            }
        }
    }
    
    None
}

#[allow(dead_code)]
fn should_include_file(file_path: &str) -> bool {
    let file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    
    let extension = std::path::Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    // Exclude common binary file extensions that shouldn't be in the IDE
    let binary_extensions = [
        // Executables and libraries
        "exe", "dll", "so", "dylib", "a", "lib", "o", "obj",
        // Archives
        "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
        // Large media files (but allow common web images)
        "mov", "mp4", "avi", "mkv", "wmv", "flv",
        "mp3", "wav", "flac", "ogg", "m4a",
        // Database files
        "db", "sqlite", "sqlite3",
        // Other binary formats
        "bin", "dat", "pak", "wad"
    ];
    
    // Exclude known binary extensions
    if binary_extensions.contains(&extension.as_str()) {
        return false;
    }
    
    // Exclude very large image files (keep common web images under reasonable size)
    let large_image_extensions = ["psd", "ai", "eps", "tiff", "tif", "bmp", "raw"];
    if large_image_extensions.contains(&extension.as_str()) {
        return false;
    }
    
    // Exclude temporary and cache files
    if file_name.starts_with('.') && (
        file_name.ends_with(".tmp") || 
        file_name.ends_with(".cache") || 
        file_name.ends_with(".log") ||
        file_name == ".DS_Store"
    ) {
        return false;
    }
    
    // Include everything else (source code, configs, docs, images, etc.)
    true
}

#[allow(dead_code)]
fn should_include_directory(dir_path: &str) -> bool {
    let dir_name = std::path::Path::new(dir_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    
    // Exclude common build and dependency directories, but keep useful ones
    match dir_name {
        // Build and dependency directories
        "target" | "node_modules" | "build" | "dist" | "out" => false,
        // Version control (exclude .git but keep .github for workflows)
        ".git" => false,
        // Cache and temporary directories
        ".cache" | ".tmp" | "tmp" | "temp" => false,
        // IDE specific directories
        ".vscode" | ".idea" | ".eclipse" => false,
        // OS specific directories
        ".DS_Store" => false,
        // Include everything else, including .github (for workflows)
        _ => true,
    }
}

#[allow(dead_code)]
async fn fetch_and_save_contents(
    api_url: &str,
    data: &web::Data<AppState>,
    user_id: &str,
    project_id: &str,
    path_prefix: &str,
) -> Result<usize, Box<dyn std::error::Error>> {
    #[derive(Deserialize)]
    #[allow(dead_code)]
    struct GitHubContent {
        name: String,
        path: String,
        #[serde(rename = "type")]
        content_type: String,
        download_url: Option<String>,
        url: String,
    }

    let client = reqwest::Client::new();
    let response = client
        .get(api_url)
        .header("User-Agent", "Wizard-IDE")
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("GitHub API request failed with status: {}", response.status()).into());
    }

    let contents: Vec<GitHubContent> = response.json().await?;
    let mut files_count = 0;

    for item in contents {
        let file_path = if path_prefix.is_empty() {
            item.path.clone()
        } else {
            format!("{}/{}", path_prefix, item.name)
        };

        if item.content_type == "file" {
            // Only include relevant files
            if !should_include_file(&file_path) {
                continue;
            }
            
            // Download and save file
            if let Some(download_url) = item.download_url {
                let content_response = client
                    .get(&download_url)
                    .header("User-Agent", "Wizard-IDE")
                    .send()
                    .await?;
                
                if !content_response.status().is_success() {
                    eprintln!("Failed to download file {}: {}", file_path, content_response.status());
                    continue;
                }
                
                // Check file size before downloading content
                let content_length = content_response.content_length().unwrap_or(0);
                const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB limit
                
                if content_length > MAX_FILE_SIZE {
                    eprintln!("Skipping large file {}: {} bytes", file_path, content_length);
                    continue;
                }
                
                // Get file extension for better binary detection
                let extension = std::path::Path::new(&file_path)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                
                // For known image formats, skip the binary check (they should be downloadable)
                let is_image = matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "gif" | "svg" | "ico" | "webp" | "bmp");
                
                if is_image {
                    // For images, just get the bytes and skip text processing
                    let _bytes = content_response.bytes().await?;
                    // For now, store images as empty placeholder since filesystem expects text
                    // Frontend can fetch the actual image via the GitHub download_url when needed
                    let placeholder_content = format!("[IMAGE:{}:{}]", item.name, download_url);
                    
                    data.filesystem
                        .write_file(user_id, project_id, &file_path, &placeholder_content)
                        .await?;
                } else {
                    // For text files, get as text and check for binary content
                    let content = content_response.text().await?;
                    
                    // Enhanced binary detection
                    let binary_chars = content.chars().take(1000).filter(|&c| c == '\0').count();
                    let total_chars = content.chars().take(1000).count();
                    
                    // Skip if more than 1% null characters (likely binary)
                    if total_chars > 0 && (binary_chars as f64 / total_chars as f64) > 0.01 {
                        eprintln!("Skipping binary file {}", file_path);
                        continue;
                    }
                    
                    data.filesystem
                        .write_file(user_id, project_id, &file_path, &content)
                        .await?;
                }
                
                files_count += 1;
            }
        } else if item.content_type == "dir" {
            // Only process relevant directories
            if !should_include_directory(&file_path) {
                continue;
            }
            
            // Create directory and fetch its contents
            data.filesystem
                .create_directory(user_id, project_id, &file_path)
                .await?;

            let dir_count = Box::pin(fetch_and_save_contents(
                &item.url,
                data,
                user_id,
                project_id,
                &file_path,
            ))
            .await?;
            
            files_count += dir_count;
        }
    }

    Ok(files_count)
}

async fn list_repositories(
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    let username = query.get("username");
    
    if username.is_none() {
        return HttpResponse::BadRequest().json(ApiResponse::<Vec<GitHubRepo>> {
            success: false,
            message: "Username required".to_string(),
            data: None,
            error: Some(ApiError {
                code: "MISSING_USERNAME".to_string(),
                message: "Please provide a GitHub username".to_string(),
                details: None,
            }),
        });
    }

    let api_url = format!("https://api.github.com/users/{}/repos", username.unwrap());
    let client = reqwest::Client::new();
    
    match client
        .get(&api_url)
        .header("User-Agent", "Wizard-IDE")
        .send()
        .await
    {
        Ok(response) => {
            match response.json::<Vec<GitHubRepo>>().await {
                Ok(repos) => {
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: format!("Found {} repositories", repos.len()),
                        data: Some(repos),
                        error: None,
                    })
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(ApiResponse::<Vec<GitHubRepo>> {
                        success: false,
                        message: "Failed to parse repositories".to_string(),
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
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<Vec<GitHubRepo>> {
                success: false,
                message: "Failed to fetch repositories".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "FETCH_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

/// Move all entries from `source` into `dest`, recursively. `dest` is created if missing.
fn move_dir_contents(source: &Path, dest: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            std::fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

fn copy_dir_recursive(source: &Path, dest: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if from.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            std::fs::copy(&from, &to)?;
        }
    }
    Ok(())
}