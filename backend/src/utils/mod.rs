pub mod error;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Response<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}