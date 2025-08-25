use actix_web::{web, HttpResponse, HttpRequest};
use serde::{Deserialize, Serialize};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

use crate::middleware::auth::{JwtAuth, Claims};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: i64,
    pub last_login: Option<i64>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub user: Option<UserInfo>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub token: String,
}

// In-memory user store (replace with database in production)
lazy_static::lazy_static! {
    static ref USER_STORE: Mutex<HashMap<String, User>> = Mutex::new(HashMap::new());
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/register", web::post().to(register))
            .route("/login", web::post().to(login))
            .route("/refresh", web::post().to(refresh_token))
            .route("/logout", web::post().to(logout))
            .route("/verify", web::get().to(verify_token))
            .route("/me", web::get().to(get_current_user))
    );
}

async fn register(
    data: web::Data<AppState>,
    req: web::Json<RegisterRequest>,
) -> HttpResponse {
    // Validate email format
    if !req.email.contains('@') || req.email.len() < 5 {
        return HttpResponse::BadRequest().json(AuthResponse {
            success: false,
            token: None,
            user: None,
            message: "Invalid email format".to_string(),
        });
    }

    // Validate password strength
    if req.password.len() < 8 {
        return HttpResponse::BadRequest().json(AuthResponse {
            success: false,
            token: None,
            user: None,
            message: "Password must be at least 8 characters long".to_string(),
        });
    }

    // Check if user already exists
    let mut users = USER_STORE.lock().unwrap();
    if users.values().any(|u| u.email == req.email) {
        return HttpResponse::Conflict().json(AuthResponse {
            success: false,
            token: None,
            user: None,
            message: "User already exists".to_string(),
        });
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = match argon2.hash_password(req.password.as_bytes(), &salt) {
        Ok(hash) => hash.to_string(),
        Err(_) => {
            return HttpResponse::InternalServerError().json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: "Failed to hash password".to_string(),
            });
        }
    };

    // Create new user
    let user_id = Uuid::new_v4().to_string();
    let user = User {
        id: user_id.clone(),
        email: req.email.clone(),
        password_hash,
        role: "user".to_string(), // Default role
        created_at: Utc::now().timestamp(),
        last_login: None,
        is_active: true,
    };

    users.insert(user_id.clone(), user.clone());

    // Generate JWT token
    let token = match JwtAuth::generate_token(
        &data.config.jwt.secret,
        &user.id,
        &user.email,
        &user.role,
    ) {
        Ok(token) => token,
        Err(_) => {
            return HttpResponse::InternalServerError().json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: "Failed to generate token".to_string(),
            });
        }
    };

    HttpResponse::Ok().json(AuthResponse {
        success: true,
        token: Some(token),
        user: Some(UserInfo {
            id: user.id,
            email: user.email,
            role: user.role,
        }),
        message: "Registration successful".to_string(),
    })
}

async fn login(
    data: web::Data<AppState>,
    req: web::Json<LoginRequest>,
) -> HttpResponse {
    // Find user by email
    let mut users = USER_STORE.lock().unwrap();
    let user = users.values_mut().find(|u| u.email == req.email);

    match user {
        Some(user) => {
            // Check if user is active
            if !user.is_active {
                return HttpResponse::Forbidden().json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: "Account is disabled".to_string(),
                });
            }

            // Verify password
            let parsed_hash = match PasswordHash::new(&user.password_hash) {
                Ok(hash) => hash,
                Err(_) => {
                    return HttpResponse::InternalServerError().json(AuthResponse {
                        success: false,
                        token: None,
                        user: None,
                        message: "Internal server error".to_string(),
                    });
                }
            };

            let argon2 = Argon2::default();
            if argon2.verify_password(req.password.as_bytes(), &parsed_hash).is_ok() {
                // Update last login
                user.last_login = Some(Utc::now().timestamp());

                // Generate JWT token
                let token = match JwtAuth::generate_token(
                    &data.config.jwt.secret,
                    &user.id,
                    &user.email,
                    &user.role,
                ) {
                    Ok(token) => token,
                    Err(_) => {
                        return HttpResponse::InternalServerError().json(AuthResponse {
                            success: false,
                            token: None,
                            user: None,
                            message: "Failed to generate token".to_string(),
                        });
                    }
                };

                HttpResponse::Ok().json(AuthResponse {
                    success: true,
                    token: Some(token),
                    user: Some(UserInfo {
                        id: user.id.clone(),
                        email: user.email.clone(),
                        role: user.role.clone(),
                    }),
                    message: "Login successful".to_string(),
                })
            } else {
                HttpResponse::Unauthorized().json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: "Invalid credentials".to_string(),
                })
            }
        }
        None => {
            HttpResponse::Unauthorized().json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: "Invalid credentials".to_string(),
            })
        }
    }
}

async fn refresh_token(
    data: web::Data<AppState>,
    req: web::Json<RefreshTokenRequest>,
) -> HttpResponse {
    // Validate the old token
    match JwtAuth::validate_token(&data.config.jwt.secret, &req.token) {
        Ok(claims) => {
            // Check if user still exists and is active
            let users = USER_STORE.lock().unwrap();
            match users.get(&claims.sub) {
                Some(user) if user.is_active => {
                    // Generate new token
                    let new_token = match JwtAuth::generate_token(
                        &data.config.jwt.secret,
                        &user.id,
                        &user.email,
                        &user.role,
                    ) {
                        Ok(token) => token,
                        Err(_) => {
                            return HttpResponse::InternalServerError().json(AuthResponse {
                                success: false,
                                token: None,
                                user: None,
                                message: "Failed to generate token".to_string(),
                            });
                        }
                    };

                    HttpResponse::Ok().json(AuthResponse {
                        success: true,
                        token: Some(new_token),
                        user: Some(UserInfo {
                            id: user.id.clone(),
                            email: user.email.clone(),
                            role: user.role.clone(),
                        }),
                        message: "Token refreshed".to_string(),
                    })
                }
                _ => {
                    HttpResponse::Unauthorized().json(AuthResponse {
                        success: false,
                        token: None,
                        user: None,
                        message: "User not found or inactive".to_string(),
                    })
                }
            }
        }
        Err(_) => {
            HttpResponse::Unauthorized().json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: "Invalid token".to_string(),
            })
        }
    }
}

async fn logout(_req: HttpRequest) -> HttpResponse {
    // In a stateless JWT system, logout is handled client-side
    // Here we just return success
    // In production, you might want to blacklist the token
    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Logged out successfully"
    }))
}

async fn verify_token(
    data: web::Data<AppState>,
    req: HttpRequest,
) -> HttpResponse {
    // Extract token from Authorization header
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| {
            if h.starts_with("Bearer ") {
                Some(h[7..].to_string())
            } else {
                None
            }
        });

    match token {
        Some(token) => {
            match JwtAuth::validate_token(&data.config.jwt.secret, &token) {
                Ok(claims) => {
                    HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "valid": true,
                        "claims": {
                            "user_id": claims.sub,
                            "email": claims.email,
                            "role": claims.role,
                            "expires_at": claims.exp
                        }
                    }))
                }
                Err(_) => {
                    HttpResponse::Ok().json(serde_json::json!({
                        "success": true,
                        "valid": false,
                        "message": "Invalid token"
                    }))
                }
            }
        }
        None => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "message": "No token provided"
            }))
        }
    }
}

async fn get_current_user(req: HttpRequest) -> HttpResponse {
    // This endpoint requires authentication (handled by middleware)
    // Extract claims from request extensions
    if let Some(claims) = req.extensions().get::<Claims>() {
        let users = USER_STORE.lock().unwrap();
        if let Some(user) = users.get(&claims.sub) {
            return HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "created_at": user.created_at,
                    "last_login": user.last_login
                }
            }));
        }
    }
    
    HttpResponse::Unauthorized().json(serde_json::json!({
        "success": false,
        "message": "User not found"
    }))
}

// Admin endpoint to create initial admin user
pub async fn create_admin_user(
    data: web::Data<AppState>,
    email: String,
    password: String,
) -> Result<(), String> {
    let mut users = USER_STORE.lock().unwrap();
    
    // Check if admin already exists
    if users.values().any(|u| u.role == "admin") {
        return Err("Admin user already exists".to_string());
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| "Failed to hash password")?
        .to_string();

    // Create admin user
    let user_id = Uuid::new_v4().to_string();
    let admin = User {
        id: user_id.clone(),
        email,
        password_hash,
        role: "admin".to_string(),
        created_at: Utc::now().timestamp(),
        last_login: None,
        is_active: true,
    };

    users.insert(user_id, admin);
    Ok(())
}