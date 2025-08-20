use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub github: GitHubConfig,
    pub jwt: JwtConfig,
    pub docker: DockerConfig,
    pub blockchain: BlockchainConfig,
    pub storage: StorageConfig,
    pub cors: CorsConfig,
    pub rate_limit: RateLimitConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_key: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GitHubConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct JwtConfig {
    pub secret: String,
    pub expiration: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DockerConfig {
    pub host: String,
    pub sandbox_image: String,
    pub cpu_limit: f64,
    pub memory_limit: String,
    pub timeout: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BlockchainConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub explorer_url: String,
    pub contract_private_key: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StorageConfig {
    pub path: String,
    pub max_file_size: u64,
    pub max_project_size: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RateLimitConfig {
    pub per_minute: u32,
    pub per_hour: u32,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        Ok(Config {
            server: ServerConfig {
                host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: env::var("PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .unwrap_or(8080),
            },
            database: DatabaseConfig {
                url: env::var("DATABASE_URL")?,
                supabase_url: env::var("SUPABASE_URL")?,
                supabase_anon_key: env::var("SUPABASE_ANON_KEY")?,
                supabase_service_key: env::var("SUPABASE_SERVICE_KEY")?,
            },
            github: GitHubConfig {
                client_id: env::var("GITHUB_CLIENT_ID")?,
                client_secret: env::var("GITHUB_CLIENT_SECRET")?,
                redirect_uri: env::var("GITHUB_REDIRECT_URI")?,
            },
            jwt: JwtConfig {
                secret: env::var("JWT_SECRET")?,
                expiration: env::var("JWT_EXPIRATION")
                    .unwrap_or_else(|_| "86400".to_string())
                    .parse()
                    .unwrap_or(86400),
            },
            docker: DockerConfig {
                host: env::var("DOCKER_HOST")
                    .unwrap_or_else(|_| "unix:///var/run/docker.sock".to_string()),
                sandbox_image: env::var("SANDBOX_IMAGE")
                    .unwrap_or_else(|_| "wizard-sandbox:latest".to_string()),
                cpu_limit: env::var("SANDBOX_CPU_LIMIT")
                    .unwrap_or_else(|_| "1".to_string())
                    .parse()
                    .unwrap_or(1.0),
                memory_limit: env::var("SANDBOX_MEMORY_LIMIT")
                    .unwrap_or_else(|_| "512m".to_string()),
                timeout: env::var("SANDBOX_TIMEOUT")
                    .unwrap_or_else(|_| "300".to_string())
                    .parse()
                    .unwrap_or(300),
            },
            blockchain: BlockchainConfig {
                rpc_url: env::var("SUPERPOSITION_RPC_URL")
                    .or_else(|_| env::var("ARB_SEPOLIA_RPC_URL"))?,
                chain_id: env::var("SUPERPOSITION_CHAIN_ID")
                    .or_else(|_| env::var("ARB_SEPOLIA_CHAIN_ID"))
                    .unwrap_or_else(|_| "98985".to_string())
                    .parse()
                    .unwrap_or(98985),
                explorer_url: env::var("SUPERPOSITION_EXPLORER_URL")
                    .or_else(|_| env::var("ARB_SEPOLIA_EXPLORER_URL"))?,
                contract_private_key: env::var("CONTRACT_PRIVATE_KEY")?,
            },
            storage: StorageConfig {
                path: env::var("STORAGE_PATH")
                    .unwrap_or_else(|_| "/tmp/wizard-storage".to_string()),
                max_file_size: env::var("MAX_FILE_SIZE")
                    .unwrap_or_else(|_| "10485760".to_string())
                    .parse()
                    .unwrap_or(10485760),
                max_project_size: env::var("MAX_PROJECT_SIZE")
                    .unwrap_or_else(|_| "52428800".to_string())
                    .parse()
                    .unwrap_or(52428800),
            },
            cors: CorsConfig {
                allowed_origins: env::var("ALLOWED_ORIGINS")
                    .unwrap_or_else(|_| "http://localhost:5173,http://localhost:3000".to_string())
                    .split(',')
                    .map(|s| s.to_string())
                    .collect(),
            },
            rate_limit: RateLimitConfig {
                per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                    .unwrap_or_else(|_| "60".to_string())
                    .parse()
                    .unwrap_or(60),
                per_hour: env::var("RATE_LIMIT_PER_HOUR")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()
                    .unwrap_or(1000),
            },
        })
    }
}