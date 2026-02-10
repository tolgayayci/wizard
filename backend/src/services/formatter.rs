use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::process::Command;
use tokio::fs;

use crate::services::toolchain;

/// Read the Rust edition from a project's Cargo.toml, defaulting to "2021".
fn read_edition(project_path: &Path) -> String {
    let cargo_toml = project_path.join("Cargo.toml");
    std::fs::read_to_string(&cargo_toml)
        .ok()
        .and_then(|content| {
            content.lines()
                .find(|l| l.trim().starts_with("edition"))
                .and_then(|l| l.split('=').nth(1))
                .map(|e| e.trim().trim_matches('"').to_string())
        })
        .unwrap_or_else(|| "2021".to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatRequest {
    pub user_id: String,
    pub project_id: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormatResult {
    pub success: bool,
    pub formatted_code: Option<String>,
    pub output: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintRequest {
    pub user_id: String,
    pub project_id: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintResult {
    pub success: bool,
    pub issues: Vec<LintIssue>,
    pub output: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintIssue {
    pub level: String, // "error", "warning", "info", "hint"
    pub message: String,
    pub line: Option<u32>,
    pub column: Option<u32>,
    pub code: Option<String>, // Clippy lint code like "clippy::redundant_closure"
    pub suggestion: Option<String>,
}

#[derive(Clone)]
pub struct FormatterService {
    storage_path: PathBuf,
}

impl FormatterService {
    pub fn new(storage_path: PathBuf) -> Self {
        Self { storage_path }
    }

    pub async fn format_code(&self, request: FormatRequest) -> Result<FormatResult> {
        let project_path = self.storage_path
            .join(&request.user_id)
            .join(&request.project_id);

        let file_path = project_path.join(&request.file_path);

        if !file_path.exists() {
            return Ok(FormatResult {
                success: false,
                formatted_code: None,
                output: String::new(),
                errors: vec!["File not found".to_string()],
            });
        }

        // Read the original file content
        let original_content = fs::read_to_string(&file_path).await?;

        // Run rustfmt on the file
        let mut fmt_cmd = Command::new("rustfmt");
        toolchain::apply_docker_env(&mut fmt_cmd);
        
        let output = fmt_cmd
            .arg("--edition")
            .arg(&read_edition(&project_path))
            .arg("--emit")
            .arg("stdout")
            .arg(&file_path)
            .current_dir(&project_path)
            .output()
            .await?;

        let formatted_content = String::from_utf8_lossy(&output.stdout).to_string();
        let error_output = String::from_utf8_lossy(&output.stderr).to_string();

        let success = output.status.success() && !formatted_content.is_empty();
        
        let errors = if !success && !error_output.is_empty() {
            error_output.lines()
                .filter(|line| !line.trim().is_empty())
                .map(|s| s.to_string())
                .collect()
        } else {
            vec![]
        };

        // If formatting was successful, write the formatted content back to the file
        if success && formatted_content != original_content {
            fs::write(&file_path, &formatted_content).await?;
        }

        Ok(FormatResult {
            success,
            formatted_code: if success { Some(formatted_content) } else { None },
            output: String::from_utf8_lossy(&output.stdout).to_string(),
            errors,
        })
    }

    pub async fn lint_code(&self, request: LintRequest) -> Result<LintResult> {
        let project_path = self.storage_path
            .join(&request.user_id)
            .join(&request.project_id);

        let file_path = project_path.join(&request.file_path);

        if !file_path.exists() {
            return Ok(LintResult {
                success: false,
                issues: vec![],
                output: String::new(),
                errors: vec!["File not found".to_string()],
            });
        }

        // Run clippy with JSON output for better parsing
        let mut clippy_cmd = toolchain::create_cargo_command(&project_path).await?;

        let output = clippy_cmd
            .args(&[
                "clippy",
                "--message-format=json",
                "--",
                "-W", "clippy::all",
                "-W", "clippy::pedantic",
                "-W", "clippy::nursery",
                "-A", "clippy::missing_docs_in_private_items"
            ])
            .current_dir(&project_path)
            .output()
            .await?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        let mut issues = Vec::new();
        let mut errors = Vec::new();

        // Parse JSON output from clippy
        for line in stdout.lines() {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(reason) = json.get("reason").and_then(|r| r.as_str()) {
                    if reason == "compiler-message" {
                        if let Some(message_obj) = json.get("message") {
                            let issue = self.parse_clippy_message(message_obj, &request.file_path);
                            if let Some(issue) = issue {
                                issues.push(issue);
                            }
                        }
                    }
                }
            }
        }

        // If JSON parsing failed or no JSON output, try to parse stderr for errors
        if issues.is_empty() && !stderr.is_empty() {
            for line in stderr.lines() {
                if line.contains("error:") || line.contains("warning:") {
                    errors.push(line.to_string());
                }
            }
        }

        let success = output.status.success() || !issues.is_empty();

        Ok(LintResult {
            success,
            issues,
            output: stdout.to_string(),
            errors,
        })
    }

    fn parse_clippy_message(&self, message: &serde_json::Value, target_file: &str) -> Option<LintIssue> {
        let level = message.get("level")?.as_str()?.to_string();
        let message_text = message.get("message")?.as_str()?.to_string();
        
        // Get the primary span information
        let spans = message.get("spans")?.as_array()?;
        let primary_span = spans.iter().find(|span| {
            span.get("is_primary").and_then(|p| p.as_bool()).unwrap_or(false)
        })?;

        let file_name = primary_span.get("file_name")?.as_str()?;
        
        // Only include issues from the target file
        if !file_name.ends_with(target_file) {
            return None;
        }

        let line = primary_span.get("line_start")?.as_u64().map(|l| l as u32);
        let column = primary_span.get("column_start")?.as_u64().map(|c| c as u32);
        
        // Extract clippy code from the message if available
        let code = message.get("code")
            .and_then(|c| c.get("code"))
            .and_then(|c| c.as_str())
            .map(|s| s.to_string());

        // Get suggestion if available
        let suggestion = primary_span.get("suggested_replacement")
            .and_then(|s| s.as_str())
            .map(|s| s.to_string());

        Some(LintIssue {
            level,
            message: message_text,
            line,
            column,
            code,
            suggestion,
        })
    }
}