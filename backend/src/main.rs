use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use dotenv::dotenv;
use log::info;
use std::path::PathBuf;

mod api;
mod auth;
mod config;
mod services;
mod utils;
mod websocket;

use config::Config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let config = Config::from_env().expect("Failed to load configuration");
    let host = config.server.host.clone();
    let port = config.server.port;

    info!("Starting Wizard Backend Server on {}:{}", host, port);

    // Initialize services
    let docker_service = services::docker::DockerService::new(&config.docker).await?;
    let compiler_service = services::compiler::CompilerService::new(docker_service.clone());
    let filesystem_service = services::filesystem::FileSystemService::new(&config.storage);
    let terminal_service = services::terminal::TerminalService::new(docker_service.clone());
    let local_compiler = services::local_compiler::LocalCompilerService::new(PathBuf::from(&config.storage.path));
    let local_terminal = services::local_terminal::LocalTerminalService::new(PathBuf::from(&config.storage.path));
    let formatter_service = services::formatter::FormatterService::new(PathBuf::from(&config.storage.path));

    // Create shared app data
    let app_data = web::Data::new(AppState {
        config: config.clone(),
        compiler: compiler_service,
        filesystem: filesystem_service,
        terminal: terminal_service,
        docker: docker_service,
        local_compiler,
        local_terminal,
        formatter: formatter_service,
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                origin.as_bytes().starts_with(b"http://localhost")
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

        App::new()
            .app_data(app_data.clone())
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .service(
                web::scope("/api")
                    .configure(api::compile::configure)
                    .configure(api::compilations::configure)
                    .configure(api::deploy::configure)
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
                    .configure(api::save_deployment::configure),
            )
            .service(
                web::scope("/ws")
                    .configure(websocket::terminal::configure)
                    .configure(websocket::events::configure),
            )
            .service(
                web::scope("/auth")
                    .configure(auth::github::configure),
            )
    })
    .bind((host, port))?
    .run()
    .await
}

pub struct AppState {
    pub config: Config,
    pub compiler: services::compiler::CompilerService,
    pub filesystem: services::filesystem::FileSystemService,
    pub terminal: services::terminal::TerminalService,
    pub docker: services::docker::DockerService,
    pub local_compiler: services::local_compiler::LocalCompilerService,
    pub local_terminal: services::local_terminal::LocalTerminalService,
    pub formatter: services::formatter::FormatterService,
}