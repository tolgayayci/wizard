use actix_web::{web, HttpResponse};
use serde::Deserialize;

use crate::services::filesystem::{FileContent, FileNode};
use crate::AppState;

use super::compile::{ApiError, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct FileRequest {
    pub user_id: String,
    pub project_id: String,
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct TreeRequest {
    pub user_id: String,
    pub project_id: String,
}

#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub user_id: String,
    pub project_id: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameFileRequest {
    pub user_id: String,
    pub project_id: String,
    pub old_path: String,
    pub new_path: String,
}

#[derive(Debug, Deserialize)]
pub struct MoveFileRequest {
    pub user_id: String,
    pub project_id: String,
    pub source_path: String,
    pub destination_path: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/filesystem/tree")
            .route(web::get().to(get_project_tree))
    )
    .service(
        web::resource("/filesystem/read")
            .route(web::post().to(read_file))
    )
    .service(
        web::resource("/filesystem/write")
            .route(web::post().to(write_file))
    )
    .service(
        web::resource("/filesystem/create")
            .route(web::post().to(create_file))
    )
    .service(
        web::resource("/filesystem/delete")
            .route(web::post().to(delete_file))
    )
    .service(
        web::resource("/filesystem/rename")
            .route(web::post().to(rename_file))
    )
    .service(
        web::resource("/filesystem/mkdir")
            .route(web::post().to(create_directory))
    )
    .service(
        web::resource("/filesystem/move")
            .route(web::post().to(move_file))
    );
}

async fn get_project_tree(
    data: web::Data<AppState>,
    query: web::Query<TreeRequest>,
) -> HttpResponse {
    match data.filesystem.get_project_tree(&query.user_id, &query.project_id).await {
        Ok(tree) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "Project tree retrieved".to_string(),
                data: Some(tree),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<FileNode> {
                success: false,
                message: "Failed to get project tree".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "FILESYSTEM_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn read_file(
    data: web::Data<AppState>,
    req: web::Json<FileRequest>,
) -> HttpResponse {
    match data.filesystem.read_file(&req.user_id, &req.project_id, &req.path).await {
        Ok(content) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "File read successfully".to_string(),
                data: Some(content),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<FileContent> {
                success: false,
                message: "Failed to read file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "READ_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn write_file(
    data: web::Data<AppState>,
    req: web::Json<WriteFileRequest>,
) -> HttpResponse {
    match data.filesystem.write_file(&req.user_id, &req.project_id, &req.path, &req.content).await {
        Ok(content) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "File written successfully".to_string(),
                data: Some(content),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<FileContent> {
                success: false,
                message: "Failed to write file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "WRITE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn create_file(
    data: web::Data<AppState>,
    req: web::Json<FileRequest>,
) -> HttpResponse {
    match data.filesystem.create_file(&req.user_id, &req.project_id, &req.path).await {
        Ok(content) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: "File created successfully".to_string(),
                data: Some(content),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<FileContent> {
                success: false,
                message: "Failed to create file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "CREATE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn delete_file(
    data: web::Data<AppState>,
    req: web::Json<FileRequest>,
) -> HttpResponse {
    match data.filesystem.delete_file(&req.user_id, &req.project_id, &req.path).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::<()> {
                success: true,
                message: "File deleted successfully".to_string(),
                data: Some(()),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to delete file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "DELETE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn rename_file(
    data: web::Data<AppState>,
    req: web::Json<RenameFileRequest>,
) -> HttpResponse {
    match data.filesystem.rename_file(&req.user_id, &req.project_id, &req.old_path, &req.new_path).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::<()> {
                success: true,
                message: "File renamed successfully".to_string(),
                data: Some(()),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to rename file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "RENAME_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn create_directory(
    data: web::Data<AppState>,
    req: web::Json<FileRequest>,
) -> HttpResponse {
    match data.filesystem.create_directory(&req.user_id, &req.project_id, &req.path).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::<()> {
                success: true,
                message: "Directory created successfully".to_string(),
                data: Some(()),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to create directory".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "MKDIR_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}

async fn move_file(
    data: web::Data<AppState>,
    req: web::Json<MoveFileRequest>,
) -> HttpResponse {
    // For now, we'll implement move as rename to the new location
    let destination_path = if req.destination_path.is_empty() {
        // Moving to root, just use the filename
        req.source_path.split('/').last().unwrap_or(&req.source_path).to_string()
    } else {
        // Moving to a folder, append filename to destination path
        let filename = req.source_path.split('/').last().unwrap_or(&req.source_path);
        format!("{}/{}", req.destination_path, filename)
    };

    match data.filesystem.rename_file(&req.user_id, &req.project_id, &req.source_path, &destination_path).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::<()> {
                success: true,
                message: "File moved successfully".to_string(),
                data: Some(()),
                error: None,
            })
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<()> {
                success: false,
                message: "Failed to move file".to_string(),
                data: None,
                error: Some(ApiError {
                    code: "MOVE_ERROR".to_string(),
                    message: e.to_string(),
                    details: None,
                }),
            })
        }
    }
}