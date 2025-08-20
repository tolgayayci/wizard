use actix_web::{web, HttpResponse};
use reqwest;
use serde::{Deserialize, Serialize};

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CrateInfo {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub downloads: u64,
    pub repository: Option<String>,
    pub documentation: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CratesIoResponse {
    crates: Vec<CratesIoCrate>,
    meta: CratesIoMeta,
}

#[derive(Debug, Deserialize)]
struct CratesIoCrate {
    name: String,
    description: Option<String>,
    max_version: String,
    downloads: u64,
    repository: Option<String>,
    documentation: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CratesIoMeta {
    total: u32,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/crates/search")
            .route(web::get().to(search_crates))
    )
    .service(
        web::resource("/crates/info/{name}")
            .route(web::get().to(get_crate_info))
    )
    .service(
        web::resource("/crates/popular")
            .route(web::get().to(get_popular_crates))
    );
}

async fn search_crates(
    query: web::Query<SearchQuery>,
) -> HttpResponse {
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(10).min(100);
    
    let api_url = format!(
        "https://crates.io/api/v1/crates?q={}&page={}&per_page={}",
        urlencoding::encode(&query.q),
        page,
        per_page
    );
    
    let client = reqwest::Client::new();
    
    match client
        .get(&api_url)
        .header("User-Agent", "Wizard-IDE")
        .send()
        .await
    {
        Ok(response) => {
            match response.json::<CratesIoResponse>().await {
                Ok(data) => {
                    let crates: Vec<CrateInfo> = data.crates.into_iter().map(|c| CrateInfo {
                        name: c.name,
                        description: c.description,
                        version: c.max_version,
                        downloads: c.downloads,
                        repository: c.repository,
                        documentation: c.documentation,
                    }).collect();
                    
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: format!("Found {} crates", data.meta.total),
                        data: Some(crates),
                        error: None,
                    })
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(ApiResponse::<Vec<CrateInfo>> {
                        success: false,
                        message: "Failed to parse crates".to_string(),
                        data: None,
                        error: Some(ApiError {
                            code: "PARSE_ERROR".to_string(),
                            message: e.to_string(),
                            details: None,
                        }),
                    })
                }
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<Vec<CrateInfo>> {
                success: false,
                message: "Failed to search crates".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "SEARCH_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn get_crate_info(
    path: web::Path<String>,
) -> HttpResponse {
    let crate_name = path.into_inner();
    let api_url = format!("https://crates.io/api/v1/crates/{}", crate_name);
    
    let client = reqwest::Client::new();
    
    match client
        .get(&api_url)
        .header("User-Agent", "Wizard-IDE")
        .send()
        .await
    {
        Ok(response) => {
            #[derive(Deserialize)]
            struct CrateResponse {
                #[serde(rename = "crate")]
                crate_info: CratesIoCrate,
            }
            
            match response.json::<CrateResponse>().await {
                Ok(data) => {
                    let info = CrateInfo {
                        name: data.crate_info.name,
                        description: data.crate_info.description,
                        version: data.crate_info.max_version,
                        downloads: data.crate_info.downloads,
                        repository: data.crate_info.repository,
                        documentation: data.crate_info.documentation,
                    };
                    
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: "Crate info retrieved".to_string(),
                        data: Some(info),
                        error: None,
                    })
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(ApiResponse::<CrateInfo> {
                        success: false,
                        message: "Failed to parse crate info".to_string(),
                        data: None,
                        error: Some(ApiError {
                            code: "PARSE_ERROR".to_string(),
                            message: e.to_string(),
                            details: None,
                        }),
                    })
                }
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<CrateInfo> {
                success: false,
                message: "Failed to fetch crate info".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "FETCH_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn get_popular_crates() -> HttpResponse {
    // List of popular Rust packages for blockchain/smart contract development
    let popular_package_names = vec![
        "stylus-sdk",
        "alloy-primitives", 
        "alloy-sol-types",
        "ethers",
        "tokio",
        "serde",
        "serde_json",
        "anyhow",
        "thiserror",
        "log",
        "env_logger",
        "clap",
        "reqwest",
        "uuid",
        "chrono",
        "rand",
        "regex",
        "url",
        "base64",
        "bytes",
        "futures",
        "once_cell",
        "lazy_static",
        "parking_lot",
        "dashmap",
        "rayon",
        "crossbeam",
        "hex",
        "sha3",
        "tiny-keccak",
    ];

    let client = reqwest::Client::new();
    let mut popular_crates = Vec::new();

    // Fetch info for each popular package
    for package_name in popular_package_names {
        let api_url = format!("https://crates.io/api/v1/crates/{}", package_name);
        
        match client
            .get(&api_url)
            .header("User-Agent", "Wizard-IDE")
            .send()
            .await
        {
            Ok(response) => {
                #[derive(Deserialize)]
                struct CrateResponse {
                    #[serde(rename = "crate")]
                    crate_info: CratesIoCrate,
                }
                
                if let Ok(data) = response.json::<CrateResponse>().await {
                    popular_crates.push(CrateInfo {
                        name: data.crate_info.name,
                        description: data.crate_info.description,
                        version: data.crate_info.max_version,
                        downloads: data.crate_info.downloads,
                        repository: data.crate_info.repository,
                        documentation: data.crate_info.documentation,
                    });
                }
            }
            Err(e) => {
                // Log error but continue with other packages
                log::warn!("Failed to fetch info for {}: {}", package_name, e);
            }
        }
    }

    // Sort by download count (descending)
    popular_crates.sort_by(|a, b| b.downloads.cmp(&a.downloads));

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Found {} popular crates", popular_crates.len()),
        data: Some(popular_crates),
        error: None,
    })
}