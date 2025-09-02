use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncReadExt;
use walkdir::WalkDir;

use crate::config::StorageConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileNode>>,
    pub size: Option<u64>,
    pub modified: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub size: u64,
    pub modified: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone)]
pub struct FileSystemService {
    storage_path: PathBuf,
    config: StorageConfig,
}

impl FileSystemService {
    pub fn new(config: &StorageConfig) -> Self {
        Self {
            storage_path: PathBuf::from(&config.path),
            config: config.clone(),
        }
    }

    pub async fn init_project(&self, user_id: &str, project_id: &str) -> Result<PathBuf> {
        let user_path = self.storage_path.join(user_id);
        fs::create_dir_all(&user_path).await?;
        
        let project_path = self.get_project_path(user_id, project_id);
        
        // Use cargo stylus new to create a proper Stylus project
        let mut new_cmd = tokio::process::Command::new("cargo");
        
        // Check if running in Docker container (wizard user exists)
        if std::path::Path::new("/home/wizard").exists() {
            // Docker environment - use wizard user paths
            new_cmd.env("CARGO_HOME", "/home/wizard/.cargo")
                .env("RUSTUP_HOME", "/home/wizard/.rustup")
                .env("PATH", format!("/home/wizard/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"));
        }
        // For local development, use system defaults (no env override needed)
        
        let output = new_cmd
            .args(&["stylus", "new", project_id, "--minimal"])
            .current_dir(&user_path)
            .output()
            .await?;
        
        if !output.status.success() {
            // If the project already exists or cargo stylus new fails, try init instead
            fs::create_dir_all(&project_path).await?;
            
            let mut init_cmd = tokio::process::Command::new("cargo");
            
            // Check if running in Docker container (wizard user exists)
            if std::path::Path::new("/home/wizard").exists() {
                // Docker environment - use wizard user paths
                init_cmd.env("CARGO_HOME", "/home/wizard/.cargo")
                    .env("RUSTUP_HOME", "/home/wizard/.rustup")
                    .env("PATH", format!("/home/wizard/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"));
            }
            // For local development, use system defaults (no env override needed)
            
            let init_output = init_cmd
                .args(&["stylus", "init", "--minimal"])
                .current_dir(&project_path)
                .output()
                .await?;
                
            if !init_output.status.success() {
                return Err(anyhow::anyhow!(
                    "Failed to initialize Stylus project: {}",
                    String::from_utf8_lossy(&init_output.stderr)
                ));
            }
        }
        
        Ok(project_path)
    }

    pub async fn get_project_tree(&self, user_id: &str, project_id: &str) -> Result<FileNode> {
        let project_path = self.get_project_path(user_id, project_id);
        
        if !project_path.exists() {
            self.init_project(user_id, project_id).await?;
        }
        
        let mut tree = self.build_tree(&project_path, &project_path, 0, 10).await?;
        // Set the root name to project_id for better display
        tree.name = project_id.to_string();
        Ok(tree)
    }

    async fn build_tree(&self, path: &Path, project_root: &Path, depth: usize, max_depth: usize) -> Result<FileNode> {
        let metadata = fs::metadata(path).await?;
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        // Calculate relative path from project root
        let relative_path = if path == project_root {
            String::new() // Root should have empty path
        } else {
            path.strip_prefix(project_root)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string()
        };
        
        if metadata.is_dir() {
            let mut children = Vec::new();
            
            // Stop recursion at max depth
            if depth >= max_depth {
                return Ok(FileNode {
                    name,
                    path: relative_path,
                    is_directory: true,
                    children: Some(children), // Empty children array
                    size: None,
                    modified: None,
                });
            }
            
            let mut entries = fs::read_dir(path).await?;
            
            while let Some(entry) = entries.next_entry().await? {
                let entry_name = entry.file_name().to_string_lossy().to_string();
                
                // Skip build and dependency directories
                if matches!(entry_name.as_str(), 
                    "target" | "node_modules" | "dist" | "build" | ".next" | 
                    "out" | "coverage" | ".turbo" | ".parcel-cache" | "__pycache__"
                ) {
                    continue;
                }
                
                // Skip most hidden files/directories but allow important ones
                if entry_name.starts_with('.') && !matches!(entry_name.as_str(), 
                    ".github" | ".gitignore" | ".gitattributes" | ".env.example" | 
                    ".dockerignore" | ".cargo"
                ) {
                    continue;
                }
                
                // Recursively build tree for valid entries with incremented depth
                if let Ok(child) = Box::pin(self.build_tree(&entry.path(), project_root, depth + 1, max_depth)).await {
                    children.push(child);
                }
            }
        
            children.sort_by(|a, b| {
                // Directories first, then alphabetical
                match (a.is_directory, b.is_directory) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.name.cmp(&b.name),
                }
            });
            
            Ok(FileNode {
                name,
                path: relative_path,
                is_directory: true,
                children: Some(children),
                size: None,
                modified: None,
            })
        } else {
            Ok(FileNode {
                name,
                path: relative_path,
                is_directory: false,
                children: None,
                size: Some(metadata.len()),
                modified: Some(chrono::DateTime::from(metadata.modified()?)),
            })
        }
    }

    pub async fn read_file(&self, user_id: &str, project_id: &str, file_path: &str) -> Result<FileContent> {
        let project_path = self.get_project_path(user_id, project_id);
        let full_path = project_path.join(file_path.trim_start_matches('/'));
        
        // Security check: ensure path is within project directory
        if !full_path.starts_with(&project_path) {
            return Err(anyhow::anyhow!("Invalid file path"));
        }
        
        let metadata = fs::metadata(&full_path).await?;
        if metadata.len() > self.config.max_file_size {
            return Err(anyhow::anyhow!("File too large"));
        }
        
        let mut file = fs::File::open(&full_path).await?;
        let mut content = String::new();
        file.read_to_string(&mut content).await?;
        
        Ok(FileContent {
            path: file_path.to_string(),
            content,
            size: metadata.len(),
            modified: chrono::DateTime::from(metadata.modified()?),
        })
    }

    pub async fn write_file(
        &self,
        user_id: &str,
        project_id: &str,
        file_path: &str,
        content: &str,
    ) -> Result<FileContent> {
        let project_path = self.get_project_path(user_id, project_id);
        let full_path = project_path.join(file_path.trim_start_matches('/'));
        
        // Security check
        if !full_path.starts_with(&project_path) {
            return Err(anyhow::anyhow!("Invalid file path"));
        }
        
        // Check file size
        if content.len() as u64 > self.config.max_file_size {
            return Err(anyhow::anyhow!("File content too large"));
        }
        
        // Create parent directories if needed
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).await?;
        }
        
        fs::write(&full_path, content).await?;
        
        let metadata = fs::metadata(&full_path).await?;
        Ok(FileContent {
            path: file_path.to_string(),
            content: content.to_string(),
            size: metadata.len(),
            modified: chrono::DateTime::from(metadata.modified()?),
        })
    }

    pub async fn create_file(
        &self,
        user_id: &str,
        project_id: &str,
        file_path: &str,
    ) -> Result<FileContent> {
        self.write_file(user_id, project_id, file_path, "").await
    }

    pub async fn delete_file(&self, user_id: &str, project_id: &str, file_path: &str) -> Result<()> {
        let project_path = self.get_project_path(user_id, project_id);
        let full_path = project_path.join(file_path.trim_start_matches('/'));
        
        // Security check
        if !full_path.starts_with(&project_path) {
            return Err(anyhow::anyhow!("Invalid file path"));
        }
        
        if full_path.is_dir() {
            fs::remove_dir_all(&full_path).await?;
        } else {
            fs::remove_file(&full_path).await?;
        }
        
        Ok(())
    }

    pub async fn rename_file(
        &self,
        user_id: &str,
        project_id: &str,
        old_path: &str,
        new_path: &str,
    ) -> Result<()> {
        let project_path = self.get_project_path(user_id, project_id);
        let old_full_path = project_path.join(old_path.trim_start_matches('/'));
        let new_full_path = project_path.join(new_path.trim_start_matches('/'));
        
        // Security checks
        if !old_full_path.starts_with(&project_path) || !new_full_path.starts_with(&project_path) {
            return Err(anyhow::anyhow!("Invalid file path"));
        }
        
        fs::rename(&old_full_path, &new_full_path).await?;
        Ok(())
    }

    pub async fn create_directory(
        &self,
        user_id: &str,
        project_id: &str,
        dir_path: &str,
    ) -> Result<()> {
        let project_path = self.get_project_path(user_id, project_id);
        let full_path = project_path.join(dir_path.trim_start_matches('/'));
        
        // Security check
        if !full_path.starts_with(&project_path) {
            return Err(anyhow::anyhow!("Invalid directory path"));
        }
        
        fs::create_dir_all(&full_path).await?;
        Ok(())
    }

    pub async fn get_project_size(&self, user_id: &str, project_id: &str) -> Result<u64> {
        let project_path = self.get_project_path(user_id, project_id);
        let mut total_size = 0u64;
        
        for entry in WalkDir::new(&project_path) {
            if let Ok(entry) = entry {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size += metadata.len();
                    }
                }
            }
        }
        
        Ok(total_size)
    }

    fn get_project_path(&self, user_id: &str, project_id: &str) -> PathBuf {
        self.storage_path.join(user_id).join(project_id)
    }
}