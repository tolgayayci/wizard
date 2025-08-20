use anyhow::Result;
use futures_util::StreamExt;
use portable_pty::{CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;
use uuid::Uuid;

use super::docker::DockerService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub user_id: String,
    pub project_id: String,
    pub container_id: String,
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
pub struct TerminalService {
    docker: DockerService,
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

impl TerminalService {
    pub fn new(docker: DockerService) -> Self {
        Self {
            docker,
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_session(
        &self,
        user_id: &str,
        project_id: &str,
    ) -> Result<TerminalSession> {
        // Create a new sandbox container for this terminal session
        let container_id = self.docker.create_sandbox(user_id, project_id).await?;
        
        let session = TerminalSession {
            id: Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            project_id: project_id.to_string(),
            container_id,
            created_at: chrono::Utc::now(),
        };
        
        let mut sessions = self.sessions.lock().await;
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
            return Err(anyhow::anyhow!("Command not allowed"));
        }
        
        // Execute command in the container
        let cmd_parts: Vec<String> = shell_words::split(command)?
            .into_iter()
            .collect();
        
        self.docker.execute_command(&session.container_id, cmd_parts).await
    }

    pub async fn close_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        
        if let Some(session) = sessions.remove(session_id) {
            // Remove the container
            self.docker.remove_sandbox(&session.container_id).await?;
        }
        
        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Option<TerminalSession> {
        let sessions = self.sessions.lock().await;
        sessions.get(session_id).cloned()
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
            if let Some(session) = sessions.remove(&session_id) {
                let _ = self.docker.remove_sandbox(&session.container_id).await;
            }
        }
        
        Ok(())
    }

    fn is_command_allowed(&self, command: &str) -> bool {
        let cmd = command.trim();
        
        // Explicitly blocked cargo commands
        let blocked_cargo_commands = vec![
            "cargo init",
            "cargo new",
        ];
        
        // Check if command starts with any blocked cargo command
        for blocked in &blocked_cargo_commands {
            if cmd.starts_with(blocked) {
                return false;
            }
        }
        
        // Whitelist of allowed commands and patterns
        let allowed_prefixes = vec![
            "cargo stylus",
            "cargo build",
            "cargo test",
            "cargo check",
            "cargo run",
            "rustc",
            "ls",
            "cd",
            "pwd",
            "cat",
            "echo",
            "mkdir",
            "rm",
            "mv",
            "cp",
            "touch",
            "grep",
            "find",
            "head",
            "tail",
            "wc",
            "diff",
            "git status",
            "git log",
            "git diff",
            "git add",
            "git commit",
        ];
        
        // Check if command starts with any allowed prefix
        allowed_prefixes.iter().any(|prefix| command.starts_with(prefix))
    }
}

// WebSocket handler for terminal sessions
pub struct TerminalWebSocket {
    session_id: String,
    terminal_service: TerminalService,
}

impl TerminalWebSocket {
    pub fn new(session_id: String, terminal_service: TerminalService) -> Self {
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
        
        // Combine output
        let output = if !stderr.is_empty() {
            format!("{}\n{}", stdout, stderr)
        } else {
            stdout
        };
        
        // Return the output
        let response = TerminalOutput {
            session_id: self.session_id.clone(),
            output,
            is_error: !stderr.is_empty(),
        };
        
        Ok(serde_json::to_string(&response)?)
    }
}