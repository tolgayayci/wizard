use anyhow::Result;
use bollard::container::{Config as ContainerConfig, CreateContainerOptions, LogsOptions, RemoveContainerOptions, StartContainerOptions};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::Docker;
use futures_util::stream::StreamExt;
use log::{error, info};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::DockerConfig;

#[derive(Clone)]
pub struct DockerService {
    docker: Docker,
    config: DockerConfig,
    containers: Arc<Mutex<HashMap<String, ContainerInfo>>>,
}

#[derive(Debug, Clone)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub user_id: String,
    pub project_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl DockerService {
    pub async fn new(config: &DockerConfig) -> Result<Self, std::io::Error> {
        let docker = Docker::connect_with_socket(&config.host, 120, bollard::API_DEFAULT_VERSION)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

        Ok(Self {
            docker,
            config: config.clone(),
            containers: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn create_sandbox(&self, user_id: &str, project_id: &str) -> Result<String> {
        let container_name = format!("wizard-{}-{}", user_id, Uuid::new_v4());
        
        // Pull the sandbox image if not exists
        self.ensure_image_exists().await?;

        // Create container configuration
        let mut env = vec![
            format!("USER_ID={}", user_id),
            format!("PROJECT_ID={}", project_id),
        ];

        let mut tmpfs_map = HashMap::new();
        tmpfs_map.insert("/tmp".to_string(), "rw,noexec,nosuid,size=100m".to_string());
        tmpfs_map.insert("/home/wizard".to_string(), "rw,exec,size=500m".to_string());

        let host_config = bollard::models::HostConfig {
            memory: Some(parse_memory_limit(&self.config.memory_limit)?),
            cpu_quota: Some((self.config.cpu_limit * 100000.0) as i64),
            cpu_period: Some(100000),
            security_opt: Some(vec!["no-new-privileges".to_string()]),
            tmpfs: Some(tmpfs_map),
            ..Default::default()
        };

        let config = ContainerConfig {
            image: Some(self.config.sandbox_image.clone()),
            env: Some(env),
            host_config: Some(host_config),
            working_dir: Some("/home/wizard".to_string()),
            user: Some("wizard".to_string()),
            attach_stdin: Some(true),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            tty: Some(true),
            ..Default::default()
        };

        let options = CreateContainerOptions {
            name: container_name.clone(),
            platform: None,
        };

        let container = self.docker.create_container(Some(options), config).await?;
        
        // Start the container
        self.docker
            .start_container(&container.id, None::<StartContainerOptions<String>>)
            .await?;

        // Store container info
        let mut containers = self.containers.lock().await;
        containers.insert(
            container.id.clone(),
            ContainerInfo {
                id: container.id.clone(),
                name: container_name,
                user_id: user_id.to_string(),
                project_id: project_id.to_string(),
                created_at: chrono::Utc::now(),
            },
        );

        info!("Created sandbox container: {}", container.id);
        Ok(container.id)
    }

    pub async fn execute_command(
        &self,
        container_id: &str,
        command: Vec<String>,
    ) -> Result<(String, String)> {
        let exec_config = CreateExecOptions {
            cmd: Some(command),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        };

        let exec = self.docker.create_exec(container_id, exec_config).await?;
        
        if let StartExecResults::Attached { mut output, .. } = 
            self.docker.start_exec(&exec.id, None).await? 
        {
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();

            while let Some(Ok(msg)) = output.next().await {
                match msg {
                    bollard::container::LogOutput::StdOut { message } => {
                        stdout.extend_from_slice(&message);
                    }
                    bollard::container::LogOutput::StdErr { message } => {
                        stderr.extend_from_slice(&message);
                    }
                    _ => {}
                }
            }

            Ok((
                String::from_utf8_lossy(&stdout).to_string(),
                String::from_utf8_lossy(&stderr).to_string(),
            ))
        } else {
            Err(anyhow::anyhow!("Failed to attach to exec"))
        }
    }

    pub async fn get_container_logs(&self, container_id: &str) -> Result<String> {
        let options = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            tail: "100".to_string(),
            ..Default::default()
        };

        let mut stream = self.docker.logs(container_id, Some(options));
        let mut logs = String::new();

        while let Some(Ok(output)) = stream.next().await {
            match output {
                bollard::container::LogOutput::StdOut { message } => {
                    logs.push_str(&String::from_utf8_lossy(&message));
                }
                bollard::container::LogOutput::StdErr { message } => {
                    logs.push_str(&String::from_utf8_lossy(&message));
                }
                _ => {}
            }
        }

        Ok(logs)
    }

    pub async fn remove_sandbox(&self, container_id: &str) -> Result<()> {
        let options = RemoveContainerOptions {
            force: true,
            ..Default::default()
        };

        self.docker.remove_container(container_id, Some(options)).await?;
        
        let mut containers = self.containers.lock().await;
        containers.remove(container_id);
        
        info!("Removed sandbox container: {}", container_id);
        Ok(())
    }

    pub async fn cleanup_expired_containers(&self) -> Result<()> {
        let mut containers = self.containers.lock().await;
        let now = chrono::Utc::now();
        let timeout = chrono::Duration::seconds(self.config.timeout as i64);

        let expired: Vec<String> = containers
            .iter()
            .filter(|(_, info)| now.signed_duration_since(info.created_at) > timeout)
            .map(|(id, _)| id.clone())
            .collect();

        for container_id in expired {
            if let Err(e) = self.remove_sandbox(&container_id).await {
                error!("Failed to remove expired container {}: {}", container_id, e);
            }
            containers.remove(&container_id);
        }

        Ok(())
    }

    async fn ensure_image_exists(&self) -> Result<()> {
        let images = self.docker.list_images::<String>(None).await?;
        let image_exists = images
            .iter()
            .any(|img| {
                img.repo_tags.contains(&self.config.sandbox_image)
            });

        if !image_exists {
            info!("Pulling sandbox image: {}", self.config.sandbox_image);
            let options = CreateImageOptions {
                from_image: self.config.sandbox_image.clone(),
                ..Default::default()
            };
            
            let mut stream = self.docker.create_image(Some(options), None, None);
            while let Some(info) = stream.next().await {
                match info {
                    Ok(info) => {
                        if let Some(status) = info.status {
                            info!("Pull status: {}", status);
                        }
                    }
                    Err(e) => error!("Error pulling image: {}", e),
                }
            }
        }

        Ok(())
    }

    /// Get the Docker client
    pub fn get_docker(&self) -> &Docker {
        &self.docker
    }

    /// Get the Docker configuration
    pub fn get_config(&self) -> &DockerConfig {
        &self.config
    }
}

fn parse_memory_limit(limit: &str) -> Result<i64> {
    let limit = limit.to_lowercase();
    let (value, unit) = if limit.ends_with("gb") || limit.ends_with("g") {
        (limit.trim_end_matches(|c| c == 'g' || c == 'b'), 1_073_741_824)
    } else if limit.ends_with("mb") || limit.ends_with("m") {
        (limit.trim_end_matches(|c| c == 'm' || c == 'b'), 1_048_576)
    } else if limit.ends_with("kb") || limit.ends_with("k") {
        (limit.trim_end_matches(|c| c == 'k' || c == 'b'), 1024)
    } else {
        (limit.as_str(), 1)
    };

    let value: i64 = value.parse()?;
    Ok(value * unit)
}