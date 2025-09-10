use actix_cors::Cors;
use actix_web::{middleware as actix_middleware, web, App, HttpServer};
use dotenv::dotenv;
use log::info;
use std::path::PathBuf;

mod api;
mod middleware;
mod config;
mod services;
mod utils;
mod websocket;

use config::Config;
use middleware::RateLimiter;

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
                // Allow configured origins from environment
                let allowed = vec![
                    "http://localhost:5173",
                    "http://localhost:5174", 
                    "http://localhost:5175",
                    "http://localhost:3000",
                    "https://thewizard.app",
                    "https://www.thewizard.app"
                ];
                let origin_str = origin.to_str().unwrap_or("");
                allowed.contains(&origin_str) || origin_str.starts_with("http://localhost")
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::HeaderName::from_static("x-requested-with"),
            ])
            .expose_headers(vec![
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::CONTENT_LENGTH,
            ])
            .supports_credentials()
            .max_age(3600);

        // Create rate limiter
        let rate_limiter = RateLimiter::new(config.rate_limit.per_minute as usize);

        App::new()
            .app_data(app_data.clone())
            .wrap(cors)
            .wrap(actix_middleware::Logger::default())
            .wrap(rate_limiter)
            .service(
                web::scope("/health")
                    .configure(api::health::configure),
            )
            .service(
                web::scope("/api")
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
                    .configure(api::templates::configure)
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