use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::AppState;
use super::compile::{ApiResponse, ApiError};

#[derive(Debug, Deserialize)]
pub struct GetCompilationsQuery {
    pub project_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct CompilationRecord {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Uuid,
    pub success: bool,
    pub status: String,
    pub wasm_size: Option<String>,
    pub contract_size: Option<String>,
    pub error_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub has_wasm: bool,
    pub has_abi: bool,
}

#[derive(Debug, Serialize)]
pub struct CompilationDetail {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Uuid,
    pub success: bool,
    pub status: String,
    pub wasm_size: Option<String>,
    pub wasm_hash: Option<String>,
    pub abi_json: Option<serde_json::Value>,
    pub abi_solidity: Option<String>,
    pub contract_size: Option<String>,
    pub metadata_hash: Option<String>,
    pub compilation_output: Option<String>,
    pub code_snapshot: String,
    pub error_type: Option<String>,
    pub error_details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct CompilationStats {
    pub total_compilations: i64,
    pub successful_compilations: i64,
    pub failed_compilations: i64,
    pub success_rate: f64,
    pub avg_duration_ms: Option<f64>,
    pub last_compilation_at: Option<DateTime<Utc>>,
    pub has_wasm: bool,
    pub has_abi: bool,
}

#[derive(Debug, Serialize)]
pub struct WasmDownloadResponse {
    pub filename: String,
    pub content: String, // Base64 encoded
    pub size: usize,
    pub hash: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AbiResponse {
    pub format: String,
    pub content: serde_json::Value,
    pub project_id: Uuid,
    pub compilation_id: Uuid,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/compilations")
            .route("", web::get().to(get_compilations))
            .route("/{id}", web::get().to(get_compilation))
            .route("/{id}/wasm", web::get().to(download_wasm))
            .route("/{id}/abi", web::get().to(get_abi))
            .route("/stats/{project_id}", web::get().to(get_compilation_stats))
    );
}

async fn get_compilations(
    _data: web::Data<AppState>,
    query: web::Query<GetCompilationsQuery>,
) -> HttpResponse {
    // TODO: Implement database query when DB connection is available
    let compilations = vec![
        CompilationRecord {
            id: Uuid::new_v4(),
            project_id: query.project_id.unwrap_or_else(Uuid::new_v4),
            user_id: Uuid::new_v4(),
            success: true,
            status: "success".to_string(),
            wasm_size: Some("8.2 KiB".to_string()),
            contract_size: Some("3.6 KiB".to_string()),
            error_type: None,
            created_at: Utc::now(),
            has_wasm: true,
            has_abi: true,
        }
    ];

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Compilations retrieved successfully".to_string(),
        data: Some(compilations),
        error: None,
    })
}

async fn get_compilation(
    _data: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> HttpResponse {
    let compilation_id = path.into_inner();
    
    // TODO: Implement database query
    let compilation = CompilationDetail {
        id: compilation_id,
        project_id: Uuid::new_v4(),
        user_id: Uuid::new_v4(),
        success: true,
        status: "success".to_string(),
        wasm_size: Some("8.2 KiB".to_string()),
        wasm_hash: Some("abc123def456".to_string()),
        abi_json: Some(serde_json::json!([
            {
                "type": "function",
                "name": "increment",
                "inputs": [],
                "outputs": []
            }
        ])),
        abi_solidity: Some("interface Counter { function increment() external; }".to_string()),
        contract_size: Some("3.6 KiB".to_string()),
        metadata_hash: Some("xyz789".to_string()),
        compilation_output: Some("Compilation successful".to_string()),
        code_snapshot: "// Contract code here".to_string(),
        error_type: None,
        error_details: None,
        created_at: Utc::now(),
    };

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "Compilation details retrieved".to_string(),
        data: Some(compilation),
        error: None,
    })
}

async fn download_wasm(
    _data: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> HttpResponse {
    let compilation_id = path.into_inner();
    
    // TODO: Implement database query to get WASM binary
    // For now, return a placeholder response
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "WASM binary retrieved".to_string(),
        data: Some(WasmDownloadResponse {
            filename: format!("contract_{}.wasm", compilation_id),
            content: "base64_encoded_wasm_here".to_string(),
            size: 8192,
            hash: Some("sha256_hash_here".to_string()),
        }),
        error: None,
    })
}

async fn get_abi(
    _data: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> HttpResponse {
    let compilation_id = path.into_inner();
    
    // TODO: Implement database query
    let abi = AbiResponse {
        format: "json".to_string(),
        content: serde_json::json!([
            {
                "type": "function",
                "name": "increment",
                "inputs": [],
                "outputs": [],
                "stateMutability": "nonpayable"
            },
            {
                "type": "function",
                "name": "getCount",
                "inputs": [],
                "outputs": [{"type": "uint256"}],
                "stateMutability": "view"
            }
        ]),
        project_id: Uuid::new_v4(),
        compilation_id,
    };

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "ABI retrieved successfully".to_string(),
        data: Some(abi),
        error: None,
    })
}

async fn get_compilation_stats(
    _data: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> HttpResponse {
    let project_id = path.into_inner();
    
    // TODO: Implement database query using the get_compilation_stats function
    let stats = CompilationStats {
        total_compilations: 10,
        successful_compilations: 8,
        failed_compilations: 2,
        success_rate: 80.0,
        avg_duration_ms: Some(1500.0),
        last_compilation_at: Some(Utc::now()),
        has_wasm: true,
        has_abi: true,
    };

    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Compilation statistics for project {}", project_id),
        data: Some(stats),
        error: None,
    })
}