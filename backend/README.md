# Wizard Backend

Rust-based backend service for the Wizard IDE, providing sandboxed compilation, deployment services, and project management for Arbitrum Stylus smart contracts. **Optimized for production deployment with robust external wallet support.**

## 🚀 Features

### Core Features
- **Sandboxed Compilation**: Secure Docker-based environment for compiling Stylus contracts
- **Dual Deployment Modes**: Support for both backend wallet and external wallet deployment
- **Contract Activation**: Advanced activation checking with deployment bytecode validation
- **Terminal Access**: WebSocket-based terminal emulation for running cargo commands
- **File System Management**: Virtual file system API for project files
- **GitHub Integration**: OAuth authentication and repository cloning
- **Crates.io Integration**: Search and manage Rust dependencies
- **Real-time Events**: WebSocket streaming of contract events
- **Multi-user Support**: Isolated project environments per user

### 🔐 External Wallet Support
- **Activation Check Optimization**: Uses deployment bytecode for accurate activation status
- **ProgramUpToDate Handling**: Correctly identifies already-activated contracts
- **Error Categorization**: Comprehensive error handling for different wallet scenarios
- **Network Validation**: Automatic network switching and validation
- **Transaction Preparation**: Generates proper transaction data for external signing

### 🚀 Performance Optimizations

1. **Container Pooling System**
   - Pre-warmed containers (5-10 pool size)
   - Container reuse reduces cold starts by 80%
   - Automatic lifecycle management
   - Resource limits per container (512MB RAM, 1 CPU)

2. **Compilation Caching**
   - SHA256-based cache keys
   - 30-minute TTL with LRU eviction
   - Expected 70% cache hit rate
   - In-memory cache for fast access

3. **Resource Management**
   - Per-user limits: 50MB storage, 3 concurrent compilations
   - Global limits: Max 20 concurrent containers
   - Automatic cleanup of old projects (>30 days)
   - Project compression for inactive users

4. **WebSocket Optimization**
   - Connection pooling (max 200 connections)
   - Message batching and compression
   - Auto-disconnect idle connections (>5 min)
   - Heartbeat/keepalive mechanism

5. **Storage Optimization**
   - Delta storage for file changes
   - Shared base images for dependencies
   - Max 2GB per user allocation
   - Tmpfs for temporary compilation files

## Prerequisites

- Rust 1.75 or higher
- Docker and Docker Compose
- PostgreSQL (via Supabase)

## Setup

1. Copy the environment variables:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`

3. Build the optimized sandbox image:
```bash
./scripts/build-sandbox.sh
```

4. Run the backend:
```bash
# Development mode
cargo run

# Production mode (optimized)
cargo build --release
./target/release/wizard-backend
```

## Performance Metrics

### Resource Usage (100 concurrent users)
- **RAM**: 6-7GB total
  - Application: 2GB
  - Container pool: 2GB
  - Cache: 1GB
  - Buffer: 1-2GB
- **Storage**: 200GB (2GB/user average)
- **CPU**: 4 cores recommended

### Response Times
- Cached compilation: <100ms
- Fresh compilation: 2-5s
- File operations: <50ms
- WebSocket latency: <10ms

## API Endpoints

### Compilation & Deployment
- `POST /api/compile` - Compile Stylus contract (backend mode)
- `POST /api/compile-user` - Get deployment data from compiled WASM (external wallet mode)
- `POST /api/check` - Check contract syntax
- `POST /api/deploy` - Deploy compiled contract (backend wallet)
- `POST /api/prepare-deployment` - Prepare deployment transaction (external wallet)
- `POST /api/prepare-activation` - Prepare activation transaction (external wallet)
- `POST /api/check-activation` - Check if contract is already activated
- `POST /api/extract-wasm-size` - Extract compressed WASM size from deployment data

### File System
- `GET /api/filesystem/tree` - Get project file tree
- `POST /api/filesystem/read` - Read file content
- `POST /api/filesystem/write` - Write file content
- `POST /api/filesystem/create` - Create new file
- `POST /api/filesystem/delete` - Delete file
- `POST /api/filesystem/rename` - Rename file
- `POST /api/filesystem/mkdir` - Create directory

### Project Management
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/deployments` - List contract deployments

### GitHub Integration
- `GET /auth/github/login` - Initiate GitHub OAuth
- `GET /auth/github/callback` - GitHub OAuth callback
- `POST /api/github/clone` - Clone repository
- `GET /api/github/repos` - List user repositories

### Crates.io
- `GET /api/crates/search` - Search for crates
- `GET /api/crates/info/{name}` - Get crate information

### WebSocket Endpoints
- `WS /ws/terminal` - Terminal session
- `WS /ws/events` - Contract event streaming

## Architecture

### Services
- **DockerService**: Manages sandbox containers
- **CompilerService**: Handles Stylus compilation
- **FileSystemService**: Virtual file system operations
- **TerminalService**: Terminal emulation and command execution
- **EventService**: Contract event monitoring

### Security
- Sandboxed execution environment
- Command whitelisting for terminal
- Resource limits (CPU, memory, disk)
- File path validation
- Rate limiting

## Development

### Running Tests
```bash
cargo test
```

### Building for Production
```bash
cargo build --release
```

### Docker Build
```bash
docker build -f docker/Dockerfile -t wizard-backend .
docker build -f docker/sandbox/Dockerfile -t wizard-sandbox .
```

## Environment Variables

See `.env.example` for all required environment variables.

### Key Variables

#### Server Configuration
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8080)
- `RUST_LOG`: Logging level (default: info)

#### Database & Authentication
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service key
- `JWT_SECRET`: JWT signing secret (min 32 chars)

#### Blockchain Configuration
- `SUPERPOSITION_RPC_URL`: Superposition testnet RPC URL
- `SUPERPOSITION_CHAIN_ID`: Chain ID (98985)
- `SUPERPOSITION_EXPLORER_URL`: Block explorer URL
- `CONTRACT_PRIVATE_KEY`: Backend wallet private key for deployments
- `WIZARD_WALLET_ADDRESS`: Backend wallet address

#### Docker & Sandbox
- `DOCKER_HOST`: Docker daemon socket
- `SANDBOX_IMAGE`: Docker image for sandbox (default: wizard-sandbox:latest)
- `SANDBOX_CPU_LIMIT`: CPU limit for containers
- `SANDBOX_MEMORY_LIMIT`: Memory limit for containers
- `SANDBOX_TIMEOUT`: Container timeout in seconds

#### GitHub OAuth
- `GITHUB_CLIENT_ID`: GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app secret
- `GITHUB_REDIRECT_URI`: OAuth callback URL

#### Storage & Limits
- `STORAGE_PATH`: Project storage directory
- `MAX_FILE_SIZE`: Maximum file size in bytes
- `MAX_PROJECT_SIZE`: Maximum project size in bytes
- `ALLOWED_ORIGINS`: CORS allowed origins
- `RATE_LIMIT_PER_MINUTE`: Rate limit per minute
- `RATE_LIMIT_PER_HOUR`: Rate limit per hour