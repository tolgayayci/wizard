use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::Command;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalTerminalSession {
    pub id: String,
    pub user_id: String,
    pub project_id: String,
    pub working_dir: PathBuf,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalCommand {
    pub command: String,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutput {
    pub session_id: String,
    pub output: String,
    pub is_error: bool,
}

#[derive(Clone)]
pub struct LocalTerminalService {
    storage_path: PathBuf,
    sessions: Arc<Mutex<HashMap<String, LocalTerminalSession>>>,
}

impl LocalTerminalService {
    pub fn new(storage_path: PathBuf) -> Self {
        Self {
            storage_path,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_session(
        &self,
        user_id: &str,
        project_id: &str,
    ) -> Result<LocalTerminalSession> {
        // Get the project directory
        let working_dir = self.storage_path.join(user_id).join(project_id);
        
        // Ensure the directory exists
        if !working_dir.exists() {
            return Err(anyhow::anyhow!("Project directory not found"));
        }
        
        let mut sessions = self.sessions.lock().await;
        
        // Check if there's an existing session for this user/project
        // and reuse it if it's still recent (within 5 minutes)
        let existing_session = sessions.values().find(|s| {
            s.user_id == user_id && 
            s.project_id == project_id && 
            chrono::Utc::now() - s.created_at < chrono::Duration::minutes(5)
        });
        
        if let Some(session) = existing_session {
            // Update the timestamp to keep it alive
            let mut updated_session = session.clone();
            updated_session.created_at = chrono::Utc::now();
            sessions.insert(updated_session.id.clone(), updated_session.clone());
            return Ok(updated_session);
        }
        
        // Create a new session if no existing one found
        let session = LocalTerminalSession {
            id: Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            project_id: project_id.to_string(),
            working_dir,
            created_at: chrono::Utc::now(),
        };
        
        sessions.insert(session.id.clone(), session.clone());
        
        Ok(session)
    }

    pub async fn execute_command(
        &self,
        session_id: &str,
        command: &str,
    ) -> Result<(String, String)> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(session_id)
            .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
        
        // Whitelist of allowed commands for security
        if !self.is_command_allowed(command) {
            return Err(anyhow::anyhow!("Command not allowed for security reasons"));
        }
        
        // Handle cd command specially
        if command.trim().starts_with("cd ") {
            return Ok((format!("Changed directory (simulated)"), String::new()));
        }
        
        // Handle clear command specially
        if command.trim() == "clear" {
            return Ok((String::from("\x1b[2J\x1b[H"), String::new()));
        }
        
        // Execute command in the project directory
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(&["/C", command])
                .current_dir(&session.working_dir)
                .output()
                .await?
        } else {
            // Force color output for common commands
            let colored_command = match command.trim() {
                "ls" => "ls --color=always".to_string(),
                cmd if cmd.starts_with("ls ") && !cmd.contains("--color") => {
                    format!("{} --color=always", cmd)
                },
                "ll" => "ls -la --color=always".to_string(),
                "la" => "ls -la --color=always".to_string(),
                cmd if cmd.starts_with("grep ") && !cmd.contains("--color") => {
                    format!("{} --color=always", cmd)
                },
                cmd if cmd.starts_with("git ") && !cmd.contains("-c color") => {
                    format!("git -c color.ui=always {}", &cmd[3..].trim())
                },
                _ => command.to_string()
            };
            
            Command::new("bash")
                .args(&["-c", &colored_command])
                .current_dir(&session.working_dir)
                .env("TERM", "xterm-256color")
                .env("FORCE_COLOR", "1")
                .env("CARGO_TERM_COLOR", "always")
                .env("CLICOLOR", "1")
                .env("CLICOLOR_FORCE", "1")
                .env("LS_COLORS", "di=1;34:ln=1;36:so=1;35:pi=33:ex=1;32:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43")
                .env("GREP_COLORS", "ms=01;31:mc=01;31:sl=:cx=:fn=35:ln=32:bn=32:se=36")
                .output()
                .await?
        };
        
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        
        Ok((stdout, stderr))
    }

    pub async fn close_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        sessions.remove(session_id);
        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Option<LocalTerminalSession> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get_mut(session_id) {
            // Update timestamp when session is accessed to keep it alive
            session.created_at = chrono::Utc::now();
            Some(session.clone())
        } else {
            None
        }
    }

    pub async fn cleanup_expired_sessions(&self) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        let now = chrono::Utc::now();
        let timeout = chrono::Duration::minutes(30);
        
        let expired: Vec<String> = sessions
            .iter()
            .filter(|(_, session)| now - session.created_at > timeout)
            .map(|(id, _)| id.clone())
            .collect();
        
        for session_id in expired {
            sessions.remove(&session_id);
        }
        
        Ok(())
    }

    fn is_command_allowed(&self, command: &str) -> bool {
        // Trim the command to check
        let cmd = command.trim();
        
        // Whitelist of allowed commands and patterns
        let allowed_commands = vec![
            // Cargo and Rust commands
            "cargo", "rustc", "rustup",
            // File operations
            "ls", "dir", "pwd", "cat", "echo", "mkdir", "touch",
            "head", "tail", "wc", "diff", "tree",
            // Navigation (simulated)
            "cd",
            // Terminal commands
            "clear",
            // Git commands (read-only)
            "git status", "git log", "git diff", "git branch",
            // Build and test
            "npm", "node", "yarn",
            // General utilities
            "which", "whereis", "env", "printenv",
        ];
        
        // Blocked commands for security
        let blocked_commands = vec![
            "rm", "del", "rmdir", "mv", "cp", "chmod", "chown",
            "curl", "wget", "ssh", "scp", "rsync",
            "sudo", "su", "apt", "yum", "brew",
            "kill", "pkill", "ps", "top",
            "netstat", "ifconfig", "ping",
            "git push", "git pull", "git clone", "git remote",
            // Explicitly blocked cargo commands
            "cargo init", "cargo new",
        ];
        
        // Check if command starts with any blocked command
        for blocked in &blocked_commands {
            if cmd.starts_with(blocked) {
                return false;
            }
        }
        
        // Check if command starts with any allowed command
        for allowed in &allowed_commands {
            if cmd.starts_with(allowed) {
                return true;
            }
        }
        
        // Default to false for safety
        false
    }
}

// WebSocket handler for terminal sessions
pub struct LocalTerminalWebSocket {
    session_id: String,
    terminal_service: LocalTerminalService,
}

impl LocalTerminalWebSocket {
    pub fn new(session_id: String, terminal_service: LocalTerminalService) -> Self {
        Self {
            session_id,
            terminal_service,
        }
    }

    pub async fn handle_message(&self, msg: String) -> Result<String> {
        // Parse the incoming command
        let command: TerminalCommand = serde_json::from_str(&msg)?;
        
        // Execute the command
        let (stdout, stderr) = self.terminal_service
            .execute_command(&command.session_id, &command.command)
            .await?;
        
        // Combine output - preserve ANSI codes
        let is_error = !stderr.is_empty();
        let output = if is_error {
            if stdout.is_empty() {
                stderr
            } else {
                format!("{}{}", stdout, stderr)
            }
        } else {
            stdout
        };
        
        // Return the output with ANSI codes preserved
        let response = TerminalOutput {
            session_id: self.session_id.clone(),
            output,
            is_error,
        };
        
        Ok(serde_json::to_string(&response)?)
    }
}