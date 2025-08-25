use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use dotenv::dotenv;
use log::info;
use std::path::PathBuf;

mod api;
mod config;
mod middleware as auth_middleware;
mod services;
mod utils;
mod websocket;

use config::Config;
use auth_middleware::{JwtAuth, RateLimiter};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let config = Config::from_env().expect("Failed to load configuration");
    let host = config.server.host.clone();
    let port = config.server.port;

    info!("Starting Wizard Backend Server on {}:{}", host, port);

    // Initialize services
    let filesystem_service = services::filesystem::FileSystemService::new(&config.storage);
    let local_compiler = services::local_compiler::LocalCompilerService::new(PathBuf::from(&config.storage.path));
    let local_terminal = services::local_terminal::LocalTerminalService::new(PathBuf::from(&config.storage.path));
    let formatter_service = services::formatter::FormatterService::new(PathBuf::from(&config.storage.path));

    // Create shared app data
    let app_data = web::Data::new(AppState {
        config: config.clone(),
        filesystem: filesystem_service,
        local_compiler,
        local_terminal,
        formatter: formatter_service,
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                // In production, use config.cors.allowed_origins
                origin.as_bytes().starts_with(b"http://localhost") ||
                origin.as_bytes().starts_with(b"https://localhost")
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .supports_credentials()
            .expose_headers(vec![actix_web::http::header::CONTENT_TYPE])
            .max_age(3600);

        // Create JWT auth middleware
        let jwt_auth = JwtAuth::new(config.jwt.secret.clone())
            .with_skip_paths(vec![
                "/health".to_string(),
                "/api/auth/login".to_string(),
                "/api/auth/register".to_string(),
                "/api/auth/refresh".to_string(),
            ]);

        // Create rate limiter
        let rate_limiter = RateLimiter::new(config.rate_limit.per_minute as usize);

        App::new()
            .app_data(app_data.clone())
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .wrap(rate_limiter)
            .wrap(jwt_auth)
            .service(
                web::scope("/health")
                    .configure(api::health::configure),
            )
            .service(
                web::scope("/api")
                    .configure(api::auth::configure)
                    .configure(api::compile::configure)
                    .configure(api::deploy_wizard::configure)
                    .configure(api::deploy_user::configure)
                    .configure(api::deployments::configure)
                    .configure(api::download::configure)
                    .configure(api::embed::configure)
                    .configure(api::filesystem::configure)
                    .configure(api::format::configure)
                    .configure(api::github::configure)
                    .configure(api::crates::configure)
                    .configure(api::local_compile::configure)
                    .configure(api::packages::configure)
                    .configure(api::projects::configure)
                    .configure(api::save_deployment::configure)
                    .configure(api::verification::configure),
            )
            .service(
                web::scope("/ws")
                    .configure(websocket::terminal::configure),
            )
    })
    .bind((host, port))?
    .run()
    .await
}

pub struct AppState {
    pub config: Config,
    pub filesystem: services::filesystem::FileSystemService,
    pub local_compiler: services::local_compiler::LocalCompilerService,
    pub local_terminal: services::local_terminal::LocalTerminalService,
    pub formatter: services::formatter::FormatterService,
}