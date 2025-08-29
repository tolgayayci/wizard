# Wizard Backend

Backend API server for the Wizard IDE - a browser-based development environment for Arbitrum Stylus smart contracts.

## Prerequisites

- Rust (latest stable version)
- cargo-stylus CLI tool (for contract compilation)

## Setup

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install cargo-stylus**
   ```bash
   cargo install cargo-stylus
   ```

3. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wizard/backend
   ```

4. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `JWT_SECRET`: JWT secret for authentication (min 32 chars)
   - `CONTRACT_PRIVATE_KEY`: Private key for contract deployment
   - `SUPERPOSITION_RPC_URL`: Blockchain RPC endpoint
   - `STORAGE_PATH`: Path for project storage (default: /tmp/wizard-storage)

5. **Build the project**
   ```bash
   cargo build --release
   ```

## Running the Server

### Development mode
```bash
cargo run
```

### Production mode
```bash
cargo run --release
```

Or run the compiled binary directly:
```bash
./target/release/wizard-backend
```

## API Endpoints

The server runs on `http://localhost:8080` by default.

### Health Check
- `GET /health` - Server health status

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Compilation
- `POST /api/compile` - Compile Rust code to WASM
- `POST /api/format` - Format Rust code

### Deployment
- `POST /api/deploy/wizard` - Deploy using Wizard wallet
- `POST /api/deploy/user` - Deploy using user wallet
- `POST /api/save-deployment` - Save deployment info

### WebSocket
- `/ws/terminal` - Terminal WebSocket connection

## Development

### Run tests
```bash
cargo test
```

### Check code
```bash
cargo check
```

### Format code
```bash
cargo fmt
```

### Lint code
```bash
cargo clippy
```

## Project Structure

```
backend/
├── src/
│   ├── api/           # REST API endpoints
│   ├── config/        # Configuration
│   ├── services/      # Business logic
│   ├── utils/         # Utilities
│   ├── websocket/     # WebSocket handlers
│   └── main.rs        # Entry point
├── Cargo.toml         # Dependencies
└── .env              # Environment variables
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT secret for authentication (min 32 chars) | Required |
| `CONTRACT_PRIVATE_KEY` | Private key for contract deployment | Required |
| `SUPERPOSITION_RPC_URL` | Blockchain RPC endpoint | Required |
| `SUPERPOSITION_CHAIN_ID` | Blockchain chain ID | 98985 |
| `SUPERPOSITION_EXPLORER_URL` | Blockchain explorer URL | Required |
| `PORT` | Server port | 8080 |
| `HOST` | Server host | 0.0.0.0 |
| `RUST_LOG` | Log level | info |
| `STORAGE_PATH` | Project storage path | /tmp/wizard-storage |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:5173,http://localhost:3000 |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per minute | 60 |
| `RATE_LIMIT_PER_HOUR` | Rate limit per hour | 1000 |

## Troubleshooting

### Port already in use
If port 8080 is already in use, change the `PORT` in your `.env` file.

### JWT Secret issues
Ensure the `JWT_SECRET` is at least 32 characters long and kept secure.

### Build errors
Make sure you have the latest Rust version:
```bash
rustup update
```

## License

See LICENSE file in the root directory.