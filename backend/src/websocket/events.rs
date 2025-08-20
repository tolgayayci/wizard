use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

use crate::services::events::{ContractEvent, EventService};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct EventsQuery {
    pub contract_address: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/events")
            .route(web::get().to(events_websocket))
    );
}

async fn events_websocket(
    req: HttpRequest,
    body: web::Payload,
    query: web::Query<EventsQuery>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;
    
    // Create event service and subscribe to contract events
    let event_service = EventService::new();
    let mut event_receiver = event_service.subscribe_to_events(&query.contract_address).await;
    
    // Send initial success message
    let init_msg = serde_json::json!({
        "type": "subscribed",
        "contract_address": query.contract_address,
        "message": "Subscribed to contract events"
    });
    
    let _ = session.text(init_msg.to_string()).await;
    
    // Spawn task to handle incoming WebSocket messages
    let ws_handle = actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                // Handle incoming WebSocket messages
                Some(Ok(msg)) = msg_stream.next() => {
                    match msg {
                        Message::Text(text) => {
                            // Parse and handle control messages
                            if let Ok(control) = serde_json::from_str::<ControlMessage>(&text) {
                                match control.action.as_str() {
                                    "ping" => {
                                        let pong = serde_json::json!({
                                            "type": "pong",
                                            "timestamp": chrono::Utc::now()
                                        });
                                        if let Err(e) = session.text(pong.to_string()).await {
                                            log::error!("Failed to send pong: {}", e);
                                            break;
                                        }
                                    }
                                    "unsubscribe" => {
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        }
                        Message::Close(_) => {
                            break;
                        }
                        _ => {}
                    }
                }
                // Handle contract events
                Ok(event) = event_receiver.recv() => {
                    let event_msg = serde_json::json!({
                        "type": "event",
                        "data": event
                    });
                    
                    if let Err(e) = session.text(event_msg.to_string()).await {
                        log::error!("Failed to send event: {}", e);
                        break;
                    }
                }
            }
        }
        
        // Clean up
        let _ = session.close(None).await;
    });
    
    Ok(response)
}

#[derive(Debug, Deserialize)]
struct ControlMessage {
    action: String,
}