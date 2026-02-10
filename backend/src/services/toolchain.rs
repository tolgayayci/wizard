use anyhow::{Result, Context, bail};
use std::path::Path;
use tokio::process::Command;
use regex::Regex;

/// The default toolchain to use when no rust-toolchain.toml is present.
/// Must match a toolchain pre-installed in both Dockerfile and Dockerfile.dev.
pub const DEFAULT_TOOLCHAIN: &str = "stable";

/// Maximum allowed length for a toolchain channel string.
const MAX_TOOLCHAIN_LEN: usize = 64;

/// Read the toolchain channel from a project's rust-toolchain.toml.
/// Returns DEFAULT_TOOLCHAIN if the file does not exist or cannot be parsed.
pub fn read_toolchain_channel(project_path: &Path) -> String {
    let toolchain_path = project_path.join("rust-toolchain.toml");
    if !toolchain_path.exists() {
        return DEFAULT_TOOLCHAIN.to_string();
    }

    match std::fs::read_to_string(&toolchain_path) {
        Ok(content) => {
            content.lines()
                .find(|line| line.trim().starts_with("channel"))
                .and_then(|line| line.split('=').nth(1))
                .map(|ch| ch.trim().trim_matches('"').to_string())
                .filter(|ch| !ch.is_empty())
                .unwrap_or_else(|| DEFAULT_TOOLCHAIN.to_string())
        }
        Err(_) => DEFAULT_TOOLCHAIN.to_string(),
    }
}

/// Validate a toolchain channel string to prevent injection attacks.
/// Allowed: "stable", "nightly", "nightly-YYYY-MM-DD", "X.Y.Z", "beta", "beta-YYYY-MM-DD".
pub fn validate_toolchain_channel(channel: &str) -> Result<()> {
    if channel.len() > MAX_TOOLCHAIN_LEN {
        bail!("Toolchain channel string too long (max {} chars)", MAX_TOOLCHAIN_LEN);
    }

    let re = Regex::new(
        r"^(stable|beta|nightly)(-\d{4}-\d{2}-\d{2})?$|^\d+\.\d+(\.\d+)?$"
    ).unwrap();

    if !re.is_match(channel) {
        bail!(
            "Invalid toolchain channel '{}'. Expected: stable, nightly, nightly-YYYY-MM-DD, or X.Y.Z",
            channel
        );
    }
    Ok(())
}

/// Returns true if running inside the Docker container (wizard user home exists).
pub fn is_docker_env() -> bool {
    Path::new("/home/wizard").exists()
}

/// Apply standard Docker environment variables to a Command.
/// No-op if not running in Docker.
pub fn apply_docker_env(cmd: &mut Command) {
    if is_docker_env() {
        cmd.env("CARGO_HOME", "/home/wizard/.cargo")
            .env("RUSTUP_HOME", "/home/wizard/.rustup")
            .env("PATH", "/home/wizard/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
    }
}

/// Ensure the specified toolchain is installed with wasm32-unknown-unknown target
/// and rust-src component (for nightly -Z build-std support).
///
/// Idempotent: if the toolchain is already installed, completes quickly.
pub async fn ensure_toolchain_installed(channel: &str) -> Result<()> {
    validate_toolchain_channel(channel)?;

    let start = std::time::Instant::now();
    log::info!("Ensuring toolchain '{}' is installed...", channel);

    // Install the toolchain
    let mut install_cmd = Command::new("rustup");
    apply_docker_env(&mut install_cmd);
    let output = install_cmd
        .args(&["toolchain", "install", channel, "--profile", "minimal"])
        .output()
        .await
        .context("Failed to execute rustup toolchain install")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("Failed to install toolchain '{}': {}", channel, stderr);
    }

    // Add wasm32-unknown-unknown target
    let mut target_cmd = Command::new("rustup");
    apply_docker_env(&mut target_cmd);
    let output = target_cmd
        .args(&["target", "add", "--toolchain", channel, "wasm32-unknown-unknown"])
        .output()
        .await
        .context("Failed to execute rustup target add")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("Failed to add wasm32 target for '{}': {}", channel, stderr);
    }

    // Add rust-src component for nightly (needed for -Z build-std)
    if channel.starts_with("nightly") {
        let mut src_cmd = Command::new("rustup");
        apply_docker_env(&mut src_cmd);
        let output = src_cmd
            .args(&["component", "add", "rust-src", "--toolchain", channel])
            .output()
            .await
            .context("Failed to execute rustup component add rust-src")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("Failed to add rust-src for '{}' (non-fatal): {}", channel, stderr);
        }
    }

    log::info!("Toolchain '{}' ready in {:.1}s", channel, start.elapsed().as_secs_f64());
    Ok(())
}

/// Create a cargo Command configured with the correct toolchain for the project.
/// Reads rust-toolchain.toml, ensures the toolchain is installed, and returns
/// a Command using `rustup run <channel> cargo`.
pub async fn create_cargo_command(project_path: &Path) -> Result<Command> {
    let channel = read_toolchain_channel(project_path);
    ensure_toolchain_installed(&channel).await?;

    let mut cmd = Command::new("rustup");
    cmd.args(&["run", &channel, "cargo"]);
    apply_docker_env(&mut cmd);
    cmd.current_dir(project_path);

    Ok(cmd)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_toolchain_valid() {
        assert!(validate_toolchain_channel("stable").is_ok());
        assert!(validate_toolchain_channel("nightly").is_ok());
        assert!(validate_toolchain_channel("nightly-2024-09-05").is_ok());
        assert!(validate_toolchain_channel("1.83.0").is_ok());
        assert!(validate_toolchain_channel("1.87.0").is_ok());
        assert!(validate_toolchain_channel("beta").is_ok());
        assert!(validate_toolchain_channel("beta-2024-09-05").is_ok());
        assert!(validate_toolchain_channel("1.87").is_ok());
    }

    #[test]
    fn test_validate_toolchain_invalid() {
        assert!(validate_toolchain_channel("").is_err());
        assert!(validate_toolchain_channel("rm -rf /").is_err());
        assert!(validate_toolchain_channel("nightly; echo pwned").is_err());
        assert!(validate_toolchain_channel("../../../../etc/passwd").is_err());
        assert!(validate_toolchain_channel(&"a".repeat(100)).is_err());
    }

    #[test]
    fn test_read_toolchain_defaults() {
        let channel = read_toolchain_channel(Path::new("/nonexistent/path"));
        assert_eq!(channel, "stable");
    }
}
