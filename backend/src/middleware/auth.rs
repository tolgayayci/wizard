use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
    error::ErrorUnauthorized,
    http::header::{HeaderValue, AUTHORIZATION},
};
use futures_util::future::{ok, LocalBoxFuture, Ready};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::{
    rc::Rc,
    task::{Context, Poll},
};
use chrono::{Duration, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // Subject (user ID)
    pub email: String,      // User email
    pub exp: i64,          // Expiration time
    pub iat: i64,          // Issued at
    pub role: String,      // User role (admin, user)
}

#[derive(Clone)]
pub struct JwtAuth {
    secret: String,
    skip_paths: Vec<String>,
}

impl JwtAuth {
    pub fn new(secret: String) -> Self {
        Self {
            secret,
            skip_paths: vec![
                "/health".to_string(),
                "/api/auth/login".to_string(),
                "/api/auth/register".to_string(),
                "/api/auth/refresh".to_string(),
            ],
        }
    }

    pub fn with_skip_paths(mut self, paths: Vec<String>) -> Self {
        self.skip_paths.extend(paths);
        self
    }

    pub fn generate_token(secret: &str, user_id: &str, email: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: user_id.to_owned(),
            email: email.to_owned(),
            role: role.to_owned(),
            exp: expiration,
            iat: Utc::now().timestamp(),
        };

        let header = Header::new(Algorithm::HS256);
        encode(
            &header,
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
    }

    pub fn validate_token(secret: &str, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let validation = Validation::new(Algorithm::HS256);
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &validation,
        )?;
        Ok(token_data.claims)
    }

    fn should_skip(&self, path: &str) -> bool {
        self.skip_paths.iter().any(|skip_path| {
            path.starts_with(skip_path) || path == skip_path
        })
    }
}

impl<S, B> Transform<S, ServiceRequest> for JwtAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = JwtAuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(JwtAuthMiddleware {
            service: Rc::new(service),
            secret: self.secret.clone(),
            skip_paths: self.skip_paths.clone(),
        })
    }
}

pub struct JwtAuthMiddleware<S> {
    service: Rc<S>,
    secret: String,
    skip_paths: Vec<String>,
}

impl<S, B> Service<ServiceRequest> for JwtAuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        let secret = self.secret.clone();
        let skip_paths = self.skip_paths.clone();

        Box::pin(async move {
            let path = req.path();
            
            // Skip authentication for certain paths
            if skip_paths.iter().any(|skip_path| path.starts_with(skip_path)) {
                return service.call(req).await;
            }

            // Extract token from Authorization header
            let token = req
                .headers()
                .get(AUTHORIZATION)
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
                    // Validate token
                    match JwtAuth::validate_token(&secret, &token) {
                        Ok(claims) => {
                            // Check if token is expired
                            if claims.exp < Utc::now().timestamp() {
                                return Err(ErrorUnauthorized("Token expired"));
                            }
                            
                            // Store claims in request extensions for later use
                            req.extensions_mut().insert(claims);
                            service.call(req).await
                        }
                        Err(_) => {
                            Err(ErrorUnauthorized("Invalid token"))
                        }
                    }
                }
                None => {
                    Err(ErrorUnauthorized("Missing authorization token"))
                }
            }
        })
    }
}

// Helper function to extract claims from request
pub fn get_claims(req: &ServiceRequest) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

// Role-based access control middleware
pub struct RequireRole {
    allowed_roles: Vec<String>,
}

impl RequireRole {
    pub fn new(roles: Vec<&str>) -> Self {
        Self {
            allowed_roles: roles.iter().map(|r| r.to_string()).collect(),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireRole
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequireRoleMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RequireRoleMiddleware {
            service: Rc::new(service),
            allowed_roles: self.allowed_roles.clone(),
        })
    }
}

pub struct RequireRoleMiddleware<S> {
    service: Rc<S>,
    allowed_roles: Vec<String>,
}

impl<S, B> Service<ServiceRequest> for RequireRoleMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        let allowed_roles = self.allowed_roles.clone();

        Box::pin(async move {
            // Get claims from request extensions (set by JwtAuth middleware)
            let claims = req.extensions().get::<Claims>().cloned();
            
            match claims {
                Some(claims) => {
                    if allowed_roles.contains(&claims.role) {
                        service.call(req).await
                    } else {
                        Err(ErrorUnauthorized("Insufficient permissions"))
                    }
                }
                None => {
                    Err(ErrorUnauthorized("Authentication required"))
                }
            }
        })
    }
}