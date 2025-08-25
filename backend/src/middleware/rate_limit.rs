use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
    error::ErrorTooManyRequests,
};
use futures_util::future::{ok, LocalBoxFuture, Ready};
use std::{
    collections::HashMap,
    rc::Rc,
    sync::Mutex,
    task::{Context, Poll},
    time::{Duration, Instant},
};

#[derive(Clone)]
pub struct RateLimiter {
    requests_per_minute: usize,
    cleanup_interval: Duration,
}

impl RateLimiter {
    pub fn new(requests_per_minute: usize) -> Self {
        Self {
            requests_per_minute,
            cleanup_interval: Duration::from_secs(60),
        }
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new(60)
    }
}

impl<S, B> Transform<S, ServiceRequest> for RateLimiter
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimiterMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RateLimiterMiddleware {
            service: Rc::new(service),
            rate_limiter: Rc::new(Mutex::new(RateLimiterState::new(
                self.requests_per_minute,
                self.cleanup_interval,
            ))),
        })
    }
}

pub struct RateLimiterMiddleware<S> {
    service: Rc<S>,
    rate_limiter: Rc<Mutex<RateLimiterState>>,
}

struct RateLimiterState {
    requests: HashMap<String, Vec<Instant>>,
    requests_per_minute: usize,
    cleanup_interval: Duration,
    last_cleanup: Instant,
}

impl RateLimiterState {
    fn new(requests_per_minute: usize, cleanup_interval: Duration) -> Self {
        Self {
            requests: HashMap::new(),
            requests_per_minute,
            cleanup_interval,
            last_cleanup: Instant::now(),
        }
    }

    fn check_rate_limit(&mut self, client_id: String) -> bool {
        let now = Instant::now();
        let minute_ago = now - Duration::from_secs(60);

        // Cleanup old entries periodically
        if now.duration_since(self.last_cleanup) > self.cleanup_interval {
            self.cleanup();
            self.last_cleanup = now;
        }

        // Get or create request history for client
        let requests = self.requests.entry(client_id).or_insert_with(Vec::new);

        // Remove requests older than 1 minute
        requests.retain(|&req_time| req_time > minute_ago);

        // Check if limit exceeded
        if requests.len() >= self.requests_per_minute {
            false
        } else {
            requests.push(now);
            true
        }
    }

    fn cleanup(&mut self) {
        let minute_ago = Instant::now() - Duration::from_secs(60);
        
        // Remove empty entries and old requests
        self.requests.retain(|_, requests| {
            requests.retain(|&req_time| req_time > minute_ago);
            !requests.is_empty()
        });
    }
}

impl<S, B> Service<ServiceRequest> for RateLimiterMiddleware<S>
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
        let rate_limiter = Rc::clone(&self.rate_limiter);

        Box::pin(async move {
            // Get client identifier (IP address or user ID)
            let client_id = req
                .connection_info()
                .realip_remote_addr()
                .unwrap_or("unknown")
                .to_string();

            // Check rate limit
            let mut limiter = rate_limiter.lock().unwrap();
            if !limiter.check_rate_limit(client_id) {
                return Err(ErrorTooManyRequests("Rate limit exceeded. Please try again later."));
            }
            drop(limiter);

            // Continue with request
            service.call(req).await
        })
    }
}

// Per-endpoint rate limiter with different limits
#[derive(Clone)]
pub struct EndpointRateLimiter {
    limits: HashMap<String, usize>,
    default_limit: usize,
}

impl EndpointRateLimiter {
    pub fn new() -> Self {
        let mut limits = HashMap::new();
        
        // Configure per-endpoint limits
        limits.insert("/api/compile".to_string(), 10);  // 10 requests per minute
        limits.insert("/api/deploy".to_string(), 5);    // 5 requests per minute
        limits.insert("/api/auth/login".to_string(), 5); // 5 login attempts per minute
        limits.insert("/api/auth/register".to_string(), 3); // 3 registrations per minute
        
        Self {
            limits,
            default_limit: 60, // Default 60 requests per minute
        }
    }

    pub fn get_limit(&self, path: &str) -> usize {
        // Find the most specific matching path
        self.limits
            .iter()
            .filter(|(endpoint, _)| path.starts_with(endpoint.as_str()))
            .map(|(_, &limit)| limit)
            .min() // Use the most restrictive limit
            .unwrap_or(self.default_limit)
    }
}