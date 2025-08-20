use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

use crate::services::local_terminal::LocalTerminalWebSocket;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct TerminalQuery {
    pub user_id: String,
    pub project_id: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/terminal")
            .route(web::get().to(terminal_websocket))
    );
}

async fn terminal_websocket(
    req: HttpRequest,
    body: web::Payload,
    data: web::Data<AppState>,
    query: web::Query<TerminalQuery>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;
    
    // Create a new local terminal session
    let terminal_session = data.local_terminal
        .create_session(&query.user_id, &query.project_id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    
    let terminal_ws = LocalTerminalWebSocket::new(
        terminal_session.id.clone(),
        data.local_terminal.clone(),
    );
    
    // Send initial success message
    let init_msg = serde_json::json!({
        "type": "init",
        "session_id": terminal_session.id,
        "message": "Terminal session created"
    });
    
    let _ = session.text(init_msg.to_string()).await;
    
    // Spawn task to handle WebSocket messages
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Text(text) => {
                    match terminal_ws.handle_message(text.to_string()).await {
                        Ok(response) => {
                            if let Err(e) = session.text(response).await {
                                log::error!("Failed to send terminal response: {}", e);
                                break;
                            }
                        }
                        Err(e) => {
                            let error_msg = serde_json::json!({
                                "type": "error",
                                "message": e.to_string()
                            });
                            if let Err(e) = session.text(error_msg.to_string()).await {
                                log::error!("Failed to send error message: {}", e);
                                break;
                            }
                        }
                    }
                }
                Message::Close(_) => {
                    // Clean up terminal session
                    if let Err(e) = data.local_terminal.close_session(&terminal_session.id).await {
                        log::error!("Failed to close terminal session: {}", e);
                    }
                    break;
                }
                _ => {}
            }
        }
        
        // Ensure session is closed
        let _ = session.close(None).await;
    });
    
    Ok(response)
}