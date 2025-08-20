use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use toml_edit::{DocumentMut, Item, Table, value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub name: String,
    pub version: String,
    pub is_default: bool,
}

/// Service for managing Cargo.toml files
pub struct CargoManager;

impl CargoManager {
    pub fn new() -> Self {
        Self
    }

    /// Parse a Cargo.toml content and extract dependencies
    pub fn parse_cargo_toml(&self, content: &str) -> Result<Vec<Dependency>> {
        let doc = content.parse::<DocumentMut>()
            .context("Failed to parse Cargo.toml")?;

        let mut dependencies = Vec::new();

        // Get dependencies section
        if let Some(deps) = doc["dependencies"].as_table() {
            for (name, value) in deps.iter() {
                let version = match value {
                    Item::Value(v) => {
                        // Handle simple version strings like "1.0.0"
                        if let Some(version_str) = v.as_str() {
                            version_str.to_string()
                        } else {
                            // Handle complex dependency specification
                            if let Some(table) = v.as_inline_table() {
                                if let Some(version) = table.get("version") {
                                    version.as_str().unwrap_or("*").to_string()
                                } else {
                                    "*".to_string()
                                }
                            } else {
                                "*".to_string()
                            }
                        }
                    }
                    Item::Table(table) => {
                        // Handle table format like [dependencies.foo]
                        if let Some(version) = table.get("version") {
                            version.as_str().unwrap_or("*").to_string()
                        } else {
                            "*".to_string()
                        }
                    }
                    _ => "*".to_string(),
                };

                let is_default = self.is_default_dependency(name);
                dependencies.push(Dependency {
                    name: name.to_string(),
                    version,
                    is_default,
                });
            }
        }

        Ok(dependencies)
    }

    /// Add a new dependency to Cargo.toml content
    pub fn add_dependency(&self, content: &str, name: &str, version: &str) -> Result<String> {
        let mut doc = content.parse::<DocumentMut>()
            .context("Failed to parse Cargo.toml")?;

        // Ensure dependencies section exists
        if !doc.contains_key("dependencies") {
            doc["dependencies"] = Item::Table(Table::new());
        }

        // Add the dependency
        if let Some(deps) = doc["dependencies"].as_table_mut() {
            deps[name] = value(version);
        }

        Ok(doc.to_string())
    }

    /// Remove a dependency from Cargo.toml content
    pub fn remove_dependency(&self, content: &str, name: &str) -> Result<String> {
        let mut doc = content.parse::<DocumentMut>()
            .context("Failed to parse Cargo.toml")?;

        // Remove the dependency if it exists
        if let Some(deps) = doc["dependencies"].as_table_mut() {
            deps.remove(name);
        }

        Ok(doc.to_string())
    }

    /// Update a dependency version in Cargo.toml content
    pub fn update_dependency(&self, content: &str, name: &str, new_version: &str) -> Result<String> {
        let mut doc = content.parse::<DocumentMut>()
            .context("Failed to parse Cargo.toml")?;

        // Update the dependency if it exists
        if let Some(deps) = doc["dependencies"].as_table_mut() {
            if deps.contains_key(name) {
                deps[name] = value(new_version);
            } else {
                return Err(anyhow::anyhow!("Dependency '{}' not found", name));
            }
        } else {
            return Err(anyhow::anyhow!("No dependencies section found"));
        }

        Ok(doc.to_string())
    }

    /// Create a default Cargo.toml content for a new project
    pub fn create_default_cargo_toml(&self, project_name: &str) -> String {
        format!(
            r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[dependencies]
stylus-sdk = "0.9.0"
alloy-primitives = "1.3"
alloy-sol-types = "1.3"

[features]
export-abi = ["stylus-sdk/export-abi"]

[[bin]]
name = "main"
path = "src/main.rs"

[lib]
crate-type = ["cdylib"]
"#,
            self.sanitize_project_name(project_name)
        )
    }

    /// Check if a dependency is a default/core dependency that shouldn't be removed
    fn is_default_dependency(&self, name: &str) -> bool {
        matches!(name, "stylus-sdk" | "alloy-primitives" | "alloy-sol-types")
    }

    /// Sanitize project name to be valid Rust package name
    fn sanitize_project_name(&self, name: &str) -> String {
        name.to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>()
            .trim_start_matches('_')
            .trim_end_matches('_')
            .to_string()
    }

    /// Validate that a package name is valid for Rust
    pub fn is_valid_package_name(&self, name: &str) -> bool {
        !name.is_empty() 
            && name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-')
            && !name.starts_with('-')
            && !name.ends_with('-')
    }

    /// Validate that a version string is valid
    pub fn is_valid_version(&self, version: &str) -> bool {
        // Basic version validation - could be enhanced with proper semver parsing
        !version.is_empty() && (
            version.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == '+') ||
            version == "*" ||
            version.starts_with('^') ||
            version.starts_with('~') ||
            version.starts_with('>')
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_cargo_toml() {
        let manager = CargoManager::new();
        let content = r#"
[package]
name = "test-project"
version = "0.1.0"
edition = "2021"

[dependencies]
stylus-sdk = "0.9.0"
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }
"#;

        let deps = manager.parse_cargo_toml(content).unwrap();
        assert_eq!(deps.len(), 3);
        
        let stylus = deps.iter().find(|d| d.name == "stylus-sdk").unwrap();
        assert_eq!(stylus.version, "0.5.0");
        assert!(stylus.is_default);
        
        let serde = deps.iter().find(|d| d.name == "serde").unwrap();
        assert_eq!(serde.version, "1.0");
        assert!(!serde.is_default);
    }

    #[test]
    fn test_add_dependency() {
        let manager = CargoManager::new();
        let content = r#"
[package]
name = "test-project"
version = "0.1.0"

[dependencies]
stylus-sdk = "0.9.0"
"#;

        let updated = manager.add_dependency(content, "hex", "0.4").unwrap();
        assert!(updated.contains("hex = \"0.4\""));
    }

    #[test]
    fn test_remove_dependency() {
        let manager = CargoManager::new();
        let content = r#"
[package]
name = "test-project"
version = "0.1.0"

[dependencies]
stylus-sdk = "0.9.0"
hex = "0.4"
serde = "1.0"
"#;

        let updated = manager.remove_dependency(content, "hex").unwrap();
        assert!(!updated.contains("hex = \"0.4\""));
        assert!(updated.contains("serde = \"1.0\""));
    }

    #[test]
    fn test_update_dependency() {
        let manager = CargoManager::new();
        let content = r#"
[package]
name = "test-project"
version = "0.1.0"

[dependencies]
stylus-sdk = "0.9.0"
serde = "1.0"
"#;

        let updated = manager.update_dependency(content, "serde", "1.1").unwrap();
        assert!(updated.contains("serde = \"1.1\""));
        assert!(!updated.contains("serde = \"1.0\""));
    }

    #[test]
    fn test_package_name_validation() {
        let manager = CargoManager::new();
        
        assert!(manager.is_valid_package_name("serde"));
        assert!(manager.is_valid_package_name("tokio-util"));
        assert!(manager.is_valid_package_name("some_package"));
        
        assert!(!manager.is_valid_package_name(""));
        assert!(!manager.is_valid_package_name("-invalid"));
        assert!(!manager.is_valid_package_name("invalid-"));
        assert!(!manager.is_valid_package_name("invalid package"));
    }

    #[test]
    fn test_version_validation() {
        let manager = CargoManager::new();
        
        assert!(manager.is_valid_version("1.0.0"));
        assert!(manager.is_valid_version("^1.0"));
        assert!(manager.is_valid_version("~1.0"));
        assert!(manager.is_valid_version(">=1.0.0"));
        assert!(manager.is_valid_version("*"));
        
        assert!(!manager.is_valid_version(""));
    }
}