#[cfg(test)]
mod auth_tests {
    use actix_web::{test, web, App};
    use serde_json::json;
    use wizard_backend::api::auth;
    use wizard_backend::middleware::auth::{JwtAuth, Claims};
    use wizard_backend::config::Config;
    use wizard_backend::AppState;

    async fn setup_test_app() -> impl actix_web::dev::Service<
        actix_web::http::Request,
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    > {
        let config = Config {
            jwt: wizard_backend::config::JwtConfig {
                secret: "test-secret-key-min-32-characters-long".to_string(),
                expiration: 3600,
            },
            // ... other config fields with test values
        };

        let app_state = web::Data::new(AppState {
            config,
            // ... initialize other services
        });

        test::init_service(
            App::new()
                .app_data(app_state)
                .service(web::scope("/api").configure(auth::configure))
        )
        .await
    }

    #[actix_web::test]
    async fn test_register_user() {
        let app = setup_test_app().await;

        let payload = json!({
            "email": "test@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert!(body["token"].is_string());
        assert_eq!(body["user"]["email"], "test@example.com");
    }

    #[actix_web::test]
    async fn test_register_duplicate_user() {
        let app = setup_test_app().await;

        let payload = json!({
            "email": "duplicate@example.com",
            "password": "TestPassword123!"
        });

        // First registration
        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&payload)
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        // Second registration (should fail)
        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&payload)
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 409);
    }

    #[actix_web::test]
    async fn test_login_valid_credentials() {
        let app = setup_test_app().await;

        // Register user first
        let register_payload = json!({
            "email": "login@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&register_payload)
            .to_request();
        test::call_service(&app, req).await;

        // Login
        let login_payload = json!({
            "email": "login@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&login_payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert!(body["token"].is_string());
    }

    #[actix_web::test]
    async fn test_login_invalid_credentials() {
        let app = setup_test_app().await;

        let payload = json!({
            "email": "nonexistent@example.com",
            "password": "WrongPassword"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/login")
            .set_json(&payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 401);
    }

    #[actix_web::test]
    async fn test_verify_token() {
        let app = setup_test_app().await;

        // Register and get token
        let register_payload = json!({
            "email": "verify@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&register_payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["token"].as_str().unwrap();

        // Verify token
        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["valid"], true);
    }

    #[actix_web::test]
    async fn test_verify_invalid_token() {
        let app = setup_test_app().await;

        let req = test::TestRequest::get()
            .uri("/api/auth/verify")
            .insert_header(("Authorization", "Bearer invalid_token"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["valid"], false);
    }

    #[actix_web::test]
    async fn test_refresh_token() {
        let app = setup_test_app().await;

        // Register and get token
        let register_payload = json!({
            "email": "refresh@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&register_payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let old_token = body["token"].as_str().unwrap();

        // Refresh token
        let refresh_payload = json!({
            "token": old_token
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/refresh")
            .set_json(&refresh_payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["success"], true);
        assert!(body["token"].is_string());
        
        // New token should be different
        assert_ne!(body["token"].as_str().unwrap(), old_token);
    }

    #[actix_web::test]
    async fn test_protected_endpoint_with_token() {
        let app = setup_test_app().await;

        // Register and get token
        let register_payload = json!({
            "email": "protected@example.com",
            "password": "TestPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&register_payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        let body: serde_json::Value = test::read_body_json(resp).await;
        let token = body["token"].as_str().unwrap();

        // Access protected endpoint
        let req = test::TestRequest::get()
            .uri("/api/auth/me")
            .insert_header(("Authorization", format!("Bearer {}", token)))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_protected_endpoint_without_token() {
        let app = setup_test_app().await;

        let req = test::TestRequest::get()
            .uri("/api/auth/me")
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 401);
    }

    #[actix_web::test]
    async fn test_password_validation() {
        let app = setup_test_app().await;

        // Test weak password
        let payload = json!({
            "email": "weak@example.com",
            "password": "123"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 400);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["message"].as_str().unwrap().contains("at least 8 characters"));
    }

    #[actix_web::test]
    async fn test_email_validation() {
        let app = setup_test_app().await;

        // Test invalid email
        let payload = json!({
            "email": "invalid_email",
            "password": "ValidPassword123!"
        });

        let req = test::TestRequest::post()
            .uri("/api/auth/register")
            .set_json(&payload)
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 400);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["message"].as_str().unwrap().contains("Invalid email"));
    }

    #[test]
    fn test_jwt_token_generation() {
        let secret = "test-secret-key-min-32-characters-long";
        let user_id = "test-user-id";
        let email = "test@example.com";
        let role = "user";

        let token = JwtAuth::generate_token(secret, user_id, email, role).unwrap();
        assert!(!token.is_empty());

        // Validate the generated token
        let claims = JwtAuth::validate_token(secret, &token).unwrap();
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.email, email);
        assert_eq!(claims.role, role);
    }

    #[test]
    fn test_jwt_token_expiration() {
        let secret = "test-secret-key-min-32-characters-long";
        let user_id = "test-user-id";
        let email = "test@example.com";
        let role = "user";

        let token = JwtAuth::generate_token(secret, user_id, email, role).unwrap();
        let claims = JwtAuth::validate_token(secret, &token).unwrap();

        // Check that expiration is set (should be in the future)
        let now = chrono::Utc::now().timestamp();
        assert!(claims.exp > now);
    }

    #[test]
    fn test_invalid_jwt_secret() {
        let secret1 = "secret-key-1-min-32-characters-long";
        let secret2 = "secret-key-2-min-32-characters-long";
        
        let token = JwtAuth::generate_token(secret1, "user", "test@example.com", "user").unwrap();
        
        // Should fail with wrong secret
        let result = JwtAuth::validate_token(secret2, &token);
        assert!(result.is_err());
    }
}