use actix_web::{web, HttpResponse};
use oauth2::{
    AuthorizationCode, AuthUrl, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge,
    RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use serde::{Deserialize, Serialize};

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct AuthCallback {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub access_token: Option<String>,
    pub user: Option<GitHubUser>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUser {
    pub id: u64,
    pub login: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: String,
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/github/login")
            .route(web::get().to(github_login))
    )
    .service(
        web::resource("/github/callback")
            .route(web::get().to(github_callback))
    );
}

async fn github_login(data: web::Data<AppState>) -> HttpResponse {
    let client = BasicClient::new(
        ClientId::new(data.config.github.client_id.clone()),
        Some(ClientSecret::new(data.config.github.client_secret.clone())),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).unwrap(),
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(data.config.github.redirect_uri.clone()).unwrap());

    let (pkce_challenge, _pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("read:user".to_string()))
        .add_scope(Scope::new("user:email".to_string()))
        .add_scope(Scope::new("public_repo".to_string()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Store CSRF token in session or cache for verification
    // For now, we'll include it in the response
    let response = serde_json::json!({
        "auth_url": auth_url.to_string(),
        "state": csrf_token.secret()
    });

    HttpResponse::Ok().json(response)
}

async fn github_callback(
    data: web::Data<AppState>,
    query: web::Query<AuthCallback>,
) -> HttpResponse {
    // In production, verify the CSRF token
    // For now, we'll proceed with the token exchange
    
    let client = BasicClient::new(
        ClientId::new(data.config.github.client_id.clone()),
        Some(ClientSecret::new(data.config.github.client_secret.clone())),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).unwrap(),
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(data.config.github.redirect_uri.clone()).unwrap());

    // Exchange the authorization code for an access token
    match client
        .exchange_code(AuthorizationCode::new(query.code.clone()))
        .request_async(async_http_client)
        .await
    {
        Ok(token_result) => {
            let access_token = token_result.access_token().secret();
            
            // Fetch user information from GitHub
            match fetch_github_user(access_token).await {
                Ok(user) => {
                    // Create or update user in database
                    // For now, return the user info and token
                    HttpResponse::Ok().json(AuthResponse {
                        success: true,
                        access_token: Some(access_token.to_string()),
                        user: Some(user),
                        error: None,
                    })
                }
                Err(e) => {
                    HttpResponse::InternalServerError().json(AuthResponse {
                        success: false,
                        access_token: None,
                        user: None,
                        error: Some(format!("Failed to fetch user info: {}", e)),
                    })
                }
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(AuthResponse {
                success: false,
                access_token: None,
                user: None,
                error: Some(format!("Token exchange failed: {}", e)),
            })
        }
    }
}

async fn fetch_github_user(access_token: &str) -> Result<GitHubUser, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "Wizard-IDE")
        .send()
        .await?;

    let user: GitHubUser = response.json().await?;
    Ok(user)
}