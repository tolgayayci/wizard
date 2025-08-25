# Wizard Backend - Arbitrum Stylus Smart Contract IDE

A high-performance Rust backend for the Wizard IDE, providing compilation, deployment, and development services for Arbitrum Stylus smart contracts.

## 🏗️ Architecture Overview

The Wizard backend follows a **modular service-based architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP/WebSocket Layer                     │
├───────────────┬─────────────┬──────────────┬────────────────┤
│   API Layer   │  WebSocket  │     Auth     │     Health     │
├───────────────┴─────────────┴──────────────┴────────────────┤
│                      Service Layer                           │
├───────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                       │
└───────────────────────────────────────────────────────────────┘
```

### Key Components

- **Actix Web Framework**: High-performance async web server
- **Local Filesystem**: Persistent project storage
- **WebSocket Support**: Real-time terminal sessions
- **Rust Toolchain Integration**: Native cargo and rustfmt support
- **Local Compilation**: Direct cargo-stylus compilation

## 📁 Project Structure

```
backend/
├── src/
│   ├── api/              # REST API endpoints
│   ├── config/           # Configuration management
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   ├── websocket/        # WebSocket handlers
│   └── main.rs           # Application entry point
├── scripts/              # Build and deployment scripts
├── projects/             # User project storage
└── target/               # Rust build artifacts
```

## 🔧 Active Services

### 1. **LocalCompilerService** (`services/local_compiler.rs`)
Handles Rust/Stylus compilation using the local filesystem and cargo toolchain.

**Key Features:**
- Cargo project initialization
- Stylus contract compilation
- WASM optimization
- ABI extraction (JSON and Solidity formats)
- Build artifact management

**Dependencies:** `tokio`, `serde`, filesystem access

### 2. **LocalTerminalService** (`services/local_terminal.rs`)
Manages WebSocket-based terminal sessions for interactive development.

**Key Features:**
- PTY (pseudo-terminal) creation
- Command execution in project context
- ANSI escape sequence support
- Session management with unique IDs
- Real-time output streaming

**Dependencies:** `portable-pty`, `tokio`, WebSocket

### 3. **FileSystemService** (`services/filesystem.rs`)
Provides secure file management for user projects.

**Key Features:**
- Project file CRUD operations
- Directory management
- File tree generation
- Path sanitization
- Size limit enforcement

**Dependencies:** `std::fs`, `tokio::fs`

### 4. **FormatterService** (`services/formatter.rs`)
Code formatting and linting using Rust toolchain.

**Key Features:**
- Rust code formatting (rustfmt)
- Clippy linting
- Custom formatting rules
- Error highlighting

**Dependencies:** `rustfmt`, `clippy`

### 5. **CargoManager** (`services/cargo_manager.rs`)
Dependency management for Rust projects.

**Key Features:**
- Package installation/removal
- Cargo.toml manipulation
- Dependency resolution
- Version management

**Dependencies:** `toml`, `cargo`

### 6. **EmbedParser** (`services/embed_parser.rs`)
Parses and validates embed data for project sharing.

**Key Features:**
- Base64 encoding/decoding
- Data validation
- Project metadata extraction
- Template generation

**Dependencies:** `base64`, `serde_json`

## 🌐 API Endpoints

### Compilation & Build

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/local/compile` | POST | Compile Rust/Stylus contract | ✅ Active |
| `/api/local/export-abi` | POST | Export ABI in Solidity format | ⚠️ Limited |
| `/api/local/export-abi-json` | POST | Export ABI in JSON format | ✅ Active |

### Deployment

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/deploy/wizard` | POST | Wizard-managed deployment | ✅ Active |
| `/api/compile-user` | POST | Prepare user deployment | ✅ Active |
| `/api/prepare-deployment` | POST | Prepare deployment transaction | ✅ Active |
| `/api/prepare-activation` | POST | Prepare activation transaction | ✅ Active |
| `/api/check-activation` | POST | Check contract activation | ✅ Active |
| `/api/deployments/save` | POST | Save deployment record | ✅ Active |

### File System

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/filesystem/read` | POST | Read file content | ✅ Active |
| `/api/filesystem/write` | POST | Write file content | ✅ Active |
| `/api/filesystem/tree` | GET | Get project file tree | ⚠️ Limited |
| `/api/filesystem/create` | POST | Create new file | ⚠️ Limited |
| `/api/filesystem/delete` | POST | Delete file | ⚠️ Limited |
| `/api/filesystem/rename` | POST | Rename file | ⚠️ Limited |
| `/api/filesystem/mkdir` | POST | Create directory | ⚠️ Limited |

### Package Management

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/crates/search` | GET | Search crates.io | ✅ Active |
| `/api/crates/info/{name}` | GET | Get crate information | ✅ Active |
| `/api/crates/popular` | GET | Get popular crates | ✅ Active |
| `/api/packages/install` | POST | Install package | ✅ Active |
| `/api/packages/remove` | DELETE | Remove package | ⚠️ Limited |
| `/api/packages/update` | PUT | Update package | ⚠️ Limited |

### GitHub Integration

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/github/clone` | POST | Clone GitHub repository | ✅ Active |
| `/api/github/repos` | GET | List user repositories | ⚠️ Limited |

### Contract Verification

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/verification/verify` | POST | Verify on Arbiscan | ✅ Active |
| `/api/verification/status` | POST | Check verification status | ✅ Active |

### WebSocket Endpoints

| Endpoint | Protocol | Description | Status |
|----------|----------|-------------|--------|
| `/ws/terminal` | WebSocket | Terminal session | ✅ Active |

### System

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/health` | GET | Health check | ✅ Active |

## 🔄 Data Flow

### Compilation Flow
```
User Code → LocalCompilerService → Cargo Build → WASM Output → Optimization → Result
```

### Deployment Flow
```
Compiled WASM → Stylus Utils → Transaction Data → User Wallet → Blockchain
```

### Terminal Session Flow
```
WebSocket Connection → Session Creation → PTY Spawn → Command Execution → Output Stream
```

## 🔐 Security Features

### Process Isolation
- Separate process execution
- Resource limits (CPU, memory)
- Temporary filesystem
- Clean build environments

### Path Sanitization
- Prevents directory traversal
- User-scoped project isolation
- File size limits
- Project size quotas

### Current Limitations
- ⚠️ **No authentication middleware** - All endpoints are public
- ⚠️ **No rate limiting** - Potential for abuse
- ⚠️ **No request validation** - Basic input sanitization only

## 🚀 Getting Started

### Prerequisites
- Rust 1.75+
- cargo-stylus CLI tool
- Node.js (for frontend integration)

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=8080
RUST_LOG=info

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Blockchain Configuration
SUPERPOSITION_RPC_URL=...
CONTRACT_PRIVATE_KEY=...
WIZARD_WALLET_ADDRESS=...

# See .env.example for complete configuration
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/wizard-backend.git
cd wizard-backend

# Install dependencies
cargo build

# Start the server
cargo run
```

### Local Development

```bash
# Install cargo-stylus if needed
cargo install cargo-stylus

# Run in development mode
cargo run
```

## 🧪 Testing

```bash
# Run unit tests
cargo test

# Run integration tests
cargo test --test integration

# Check code coverage
cargo tarpaulin
```

## 📊 Performance Optimizations

- **Async I/O**: Tokio runtime for non-blocking operations
- **File Caching**: Compilation results cached temporarily
- **Resource Limits**: Process resource management
- **Concurrent Requests**: Multi-threaded request handling

## 🔮 Future Enhancements

### Planned Features
- [ ] JWT-based authentication
- [ ] Rate limiting middleware
- [ ] WebSocket authentication
- [ ] Process pooling for faster compilation
- [ ] Distributed caching (Redis)
- [ ] Metrics and monitoring (Prometheus)
- [ ] Multi-chain support
- [ ] Advanced debugging tools

### Technical Debt
- Remove remaining dead code markers
- Implement proper error types
- Add comprehensive logging
- Improve test coverage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

[MIT License](LICENSE)

## 🆘 Support

For issues and questions:
- GitHub Issues: [wizard-backend/issues](https://github.com/your-org/wizard-backend/issues)
- Documentation: [docs.wizard.dev](https://docs.wizard.dev)
- Discord: [Join our community](https://discord.gg/wizard)

---

Built with ❤️ for the Arbitrum Stylus ecosystem