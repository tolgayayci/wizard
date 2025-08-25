use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use thiserror::Error;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Error)]
pub enum EmbedParseError {
    #[error("Code size exceeds limit: {0} bytes (max: {1})")]
    CodeTooLarge(usize, usize),
    #[error("Invalid code format: {0}")]
    InvalidFormat(String),
    #[error("Unsupported dependency: {0}")]
    UnsupportedDependency(String),
    #[error("Malicious code detected: {0}")]
    MaliciousCode(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedData {
    pub code: String,
    #[serde(alias = "projectName")]
    pub project_name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(alias = "sourceUrl")]
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedEmbed {
    pub code: String,
    pub project_name: String,
    pub description: String,
    pub dependencies: Vec<Dependency>,
    pub cargo_toml: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub name: String,
    pub version: String,
    pub features: Option<Vec<String>>,
}

pub struct EmbedParser {
    max_code_size: usize,
    allowed_dependencies: HashSet<String>,
}

impl EmbedParser {
    pub fn new() -> Self {
        let mut allowed_deps = HashSet::new();
        
        // Core Stylus dependencies
        allowed_deps.insert("stylus-sdk".to_string());
        allowed_deps.insert("alloy-primitives".to_string());
        allowed_deps.insert("alloy-sol-types".to_string());
        
        // Common Rust dependencies safe for smart contracts
        allowed_deps.insert("ethers".to_string());
        allowed_deps.insert("serde".to_string());
        allowed_deps.insert("serde_json".to_string());
        allowed_deps.insert("hex".to_string());
        allowed_deps.insert("sha3".to_string());
        allowed_deps.insert("tiny-keccak".to_string());
        allowed_deps.insert("anyhow".to_string());
        allowed_deps.insert("thiserror".to_string());
        allowed_deps.insert("once_cell".to_string());
        allowed_deps.insert("lazy_static".to_string());
        allowed_deps.insert("bytes".to_string());
        allowed_deps.insert("base64".to_string());
        allowed_deps.insert("uuid".to_string());
        allowed_deps.insert("chrono".to_string());
        allowed_deps.insert("rand".to_string());
        allowed_deps.insert("regex".to_string());
        allowed_deps.insert("url".to_string());
        
        Self {
            max_code_size: 100 * 1024, // 100KB limit
            allowed_dependencies: allowed_deps,
        }
    }

    pub fn parse_embed_data(&self, data: &EmbedData) -> Result<ParsedEmbed, EmbedParseError> {
        // Validate code size
        if data.code.len() > self.max_code_size {
            return Err(EmbedParseError::CodeTooLarge(data.code.len(), self.max_code_size));
        }

        // Validate code content
        self.validate_code_safety(&data.code)?;

        // Parse dependencies from code if not provided
        let mut dependencies = if data.dependencies.is_empty() {
            self.extract_dependencies_from_code(&data.code)?
        } else {
            self.parse_dependency_list(&data.dependencies)?
        };

        // Always ensure core Stylus dependencies are present
        self.ensure_core_dependencies(&mut dependencies);

        // Generate Cargo.toml
        let cargo_toml = self.generate_cargo_toml(&data.project_name, &dependencies);

        Ok(ParsedEmbed {
            code: data.code.clone(),
            project_name: self.sanitize_project_name(&data.project_name),
            description: data.description.as_deref().unwrap_or("Embedded Stylus project").to_string(),
            dependencies,
            cargo_toml,
        })
    }

    fn validate_code_safety(&self, code: &str) -> Result<(), EmbedParseError> {
        // Simplified safety validation - prevent dangerous patterns
        let dangerous_patterns = [
            "std::process::",
            "std::fs::",
            "std::net::",
            "tokio::fs::",
            "tokio::net::",
            "unsafe {",
            "#[no_mangle]",
            "include_str!",
            "include_bytes!",
            "env!",
            "option_env!",
        ];

        for pattern in &dangerous_patterns {
            if code.contains(pattern) {
                return Err(EmbedParseError::MaliciousCode(
                    format!("Detected potentially unsafe pattern: {}", pattern)
                ));
            }
        }

        Ok(())
    }

    fn extract_dependencies_from_code(&self, code: &str) -> Result<Vec<Dependency>, EmbedParseError> {
        let mut dependencies = Vec::new();
        
        // Look for use statements to infer dependencies
        let use_regex = Regex::new(r"use\s+([a-zA-Z_][a-zA-Z0-9_]*)::")
            .map_err(|_| EmbedParseError::InvalidFormat("Invalid regex".to_string()))?;

        let mut found_crates = HashSet::new();
        
        for cap in use_regex.captures_iter(code) {
            if let Some(crate_name) = cap.get(1) {
                let name = crate_name.as_str();
                
                // Map common crate names to their actual package names
                let package_name = match name {
                    "stylus_sdk" => "stylus-sdk",
                    "alloy_primitives" => "alloy-primitives", 
                    "alloy_sol_types" => "alloy-sol-types",
                    _ => name,
                };

                if self.allowed_dependencies.contains(package_name) {
                    found_crates.insert(package_name.to_string());
                }
            }
        }

        // Convert to dependencies with default versions
        for crate_name in found_crates {
            let version = self.get_default_version(&crate_name);
            dependencies.push(Dependency {
                name: crate_name,
                version,
                features: None,
            });
        }

        Ok(dependencies)
    }

    fn parse_dependency_list(&self, deps: &[String]) -> Result<Vec<Dependency>, EmbedParseError> {
        let mut dependencies = Vec::new();
        
        for dep_str in deps {
            if let Some((name, version)) = dep_str.split_once('@') {
                if !self.allowed_dependencies.contains(name) {
                    return Err(EmbedParseError::UnsupportedDependency(name.to_string()));
                }
                
                dependencies.push(Dependency {
                    name: name.to_string(),
                    version: version.to_string(),
                    features: None,
                });
            } else {
                // Just name, use default version
                if !self.allowed_dependencies.contains(dep_str) {
                    return Err(EmbedParseError::UnsupportedDependency(dep_str.to_string()));
                }
                
                let version = self.get_default_version(dep_str);
                dependencies.push(Dependency {
                    name: dep_str.to_string(),
                    version,
                    features: None,
                });
            }
        }

        Ok(dependencies)
    }

    fn ensure_core_dependencies(&self, dependencies: &mut Vec<Dependency>) {
        let core_deps = [
            ("stylus-sdk", "0.9.0"),
            ("alloy-primitives", "1.3"),
            ("alloy-sol-types", "1.3"),
        ];

        for (name, version) in &core_deps {
            if !dependencies.iter().any(|d| d.name == *name) {
                dependencies.push(Dependency {
                    name: name.to_string(),
                    version: version.to_string(),
                    features: if *name == "stylus-sdk" {
                        Some(vec!["export-abi".to_string()])
                    } else {
                        None
                    },
                });
            }
        }
    }

    fn get_default_version(&self, crate_name: &str) -> String {
        match crate_name {
            "stylus-sdk" => "0.9.0",
            "alloy-primitives" => "1.3",
            "alloy-sol-types" => "1.3",
            "ethers" => "2.0",
            "serde" => "1.0",
            "serde_json" => "1.0",
            "hex" => "0.4",
            "sha3" => "0.10",
            "tiny-keccak" => "2.0",
            "anyhow" => "1.0",
            "thiserror" => "1.0",
            "once_cell" => "1.0",
            "lazy_static" => "1.4",
            "bytes" => "1.0",
            "base64" => "0.21",
            "uuid" => "1.0",
            "chrono" => "0.4",
            "rand" => "0.8",
            "regex" => "1.0",
            "url" => "2.0",
            _ => "1.0", // Default fallback
        }.to_string()
    }

    fn sanitize_project_name(&self, name: &str) -> String {
        // Convert to valid Rust package name
        name.to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>()
            .trim_start_matches('_')
            .trim_end_matches('_')
            .chars()
            .take(30) // Limit length
            .collect()
    }

    fn generate_cargo_toml(&self, project_name: &str, dependencies: &[Dependency]) -> String {
        let mut toml = format!(
            r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[dependencies]
"#,
            self.sanitize_project_name(project_name)
        );

        for dep in dependencies {
            if let Some(features) = &dep.features {
                toml.push_str(&format!(
                    r#"{} = {{ version = "{}", features = {:?} }}
"#,
                    dep.name, dep.version, features
                ));
            } else {
                toml.push_str(&format!(r#"{} = "{}"
"#, dep.name, dep.version));
            }
        }

        toml.push_str(
            r#"
[features]
export-abi = ["stylus-sdk/export-abi"]

[[bin]]
name = "main"
path = "src/main.rs"

[lib]
crate-type = ["cdylib"]
"#,
        );

        toml
    }

    #[allow(dead_code)]
    pub fn encode_embed_data(data: &EmbedData) -> String {
        let json = serde_json::to_string(data).unwrap_or_default();
        general_purpose::STANDARD.encode(json)
    }

    pub fn decode_embed_data(encoded: &str) -> Result<EmbedData, EmbedParseError> {
        let decoded = general_purpose::STANDARD.decode(encoded)
            .map_err(|_| EmbedParseError::InvalidFormat("Invalid base64 encoding".to_string()))?;
        
        let json_str = String::from_utf8(decoded)
            .map_err(|_| EmbedParseError::InvalidFormat("Invalid UTF-8 encoding".to_string()))?;
        
        serde_json::from_str(&json_str)
            .map_err(|e| EmbedParseError::InvalidFormat(format!("Invalid JSON: {}", e)))
    }
}

impl Default for EmbedParser {
    fn default() -> Self {
        Self::new()
    }
}