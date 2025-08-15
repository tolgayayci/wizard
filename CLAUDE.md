# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wizard is a browser-based IDE for developing Arbitrum Stylus smart contracts using Rust. It provides a complete development environment with compilation, deployment, and testing capabilities directly in the browser.

## Development Commands

### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview

# Documentation site
npm run docs:dev      # Development mode
npm run docs:build    # Build documentation
npm run docs:preview  # Preview built docs
```

### Backend Commands (from /backend directory)
```bash
# Build the backend
cargo build --release

# Run tests
cargo test

# Start backend server
cargo run

# Docker operations
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
./scripts/build-sandbox.sh  # Build sandbox container
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components  
- **Editor**: Monaco Editor with custom Rust/Stylus language support
- **Backend**: Rust (Actix Web) + Docker for sandboxed compilation
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Blockchain**: Arbitrum Sepolia testnet (chainId: 421614)

### Project Structure

The codebase is organized into two main parts:

1. **Frontend (root directory)**
   - `/src/components/` - React components organized by feature
   - `/src/lib/` - Core utilities and service integrations
   - `/src/pages/` - Route-level page components
   - `/src/hooks/` - Custom React hooks

2. **Backend (`/backend` directory)**
   - `/backend/src/api/` - REST API endpoints
   - `/backend/src/services/` - Core business logic (compiler, Docker, filesystem)
   - `/backend/src/websocket/` - WebSocket handlers for terminal and events
   - `/backend/docker/` - Docker configurations for sandbox environment

### Key Architectural Patterns

#### Frontend Architecture

1. **Component Hierarchy**: 
   - Pages (`/src/pages/`) handle routing and top-level state
   - Feature components (`/src/components/`) are organized by domain
   - UI primitives (`/src/components/ui/`) are shadcn/ui components built on Radix UI

2. **State Management**:
   - Authentication state via Supabase Auth hooks
   - Project data fetched and cached through React Query patterns
   - Editor state managed locally in EditorPage component

3. **API Communication**:
   - REST endpoints via `/src/lib/api.ts` for compilation and deployment
   - WebSocket connections for terminal and real-time events
   - Supabase client for database operations and auth

#### Backend Architecture

1. **Sandboxed Compilation**:
   - Docker containers provide isolated compilation environments
   - Container pool system pre-warms containers for performance
   - Each compilation runs in a fresh container with resource limits

2. **Multi-tenant Isolation**:
   - User projects stored in `/tmp/wizard-storage/{user_id}/{project_id}/`
   - Per-user resource limits (storage, concurrent compilations)
   - Container-level isolation for compilation security

3. **WebSocket Architecture**:
   - Terminal sessions maintain persistent shell connections
   - Event streaming for contract deployment and monitoring
   - Connection pooling with automatic cleanup

### Critical Implementation Details

#### Authentication Flow
1. User authenticates via Supabase Auth (OAuth or email)
2. JWT token stored in localStorage
3. Token passed in Authorization header to backend
4. Backend validates token with Supabase
5. RLS policies enforce data access at database level

#### Compilation Pipeline
1. Code sent from Monaco Editor to backend `/api/compile` endpoint
2. Backend creates isolated Docker container
3. Rust code compiled to WASM using cargo-stylus
4. Bytecode and ABI returned to frontend
5. Results cached for 30 minutes (SHA256-based keys)

#### Deployment Process
1. Compiled bytecode sent to `/api/deploy` endpoint
2. Backend uses pre-funded wallet for gas-free deployment
3. Contract deployed to Arbitrum Sepolia
4. Contract address and ABI stored in project metadata
5. ABI interface auto-generated for testing

#### Terminal Implementation
1. WebSocket connection established to `/ws/terminal`
2. Backend creates PTY (pseudo-terminal) process
3. Commands executed in project-specific Docker container
4. ANSI escape sequences preserved for formatting
5. Terminal output streamed back via WebSocket

### Database Schema

Projects table structure:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `name` (text) - Project name
- `description` (text) - Optional description
- `code` (text) - Rust source code
- `is_public` (boolean) - Public visibility flag
- `compiled_at` (timestamp) - Last compilation time
- `deployed_at` (timestamp) - Last deployment time
- `contract_address` (text) - Deployed contract address
- `abi` (jsonb) - Contract ABI
- `created_at` (timestamp) - Creation time
- `updated_at` (timestamp) - Last update time

RLS policies ensure users can only access their own projects unless marked public.

### Environment Variables

Required environment variables:

Frontend (`.env`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_URL` - Backend API URL (default: http://localhost:8080)
- `VITE_GA_MEASUREMENT_ID` - Google Analytics ID (optional)

Backend (`/backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_JWT_SECRET` - JWT secret for token validation
- `GITHUB_CLIENT_ID` - GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `DOCKER_HOST` - Docker daemon socket (default: unix:///var/run/docker.sock)

### Component Guidelines

When modifying UI components:
- Use existing shadcn/ui components from `/src/components/ui/`
- Apply styles using Tailwind classes with the `cn()` utility
- Follow the existing component composition patterns
- Maintain TypeScript types in component props

When working with the editor:
- Monaco configuration is in `/src/lib/editor.ts`
- Custom language definitions support Stylus SDK macros
- Preserve existing keybindings and editor options

When handling API calls:
- Use the error handling patterns in `/src/lib/api.ts`
- Show user feedback via toast notifications
- Update loading states during async operations

### Testing Contracts

The ABI interface (`/src/components/abi/`) provides:
- Auto-generated UI from contract ABI
- Read/write function execution
- Transaction status monitoring
- Event log display

### Performance Considerations

1. **Frontend Optimization**:
   - Code splitting by route with React.lazy
   - Monaco Editor loaded on-demand
   - Image optimization with Vite

2. **Backend Optimization**:
   - Container pool maintains 5-10 pre-warmed containers
   - Compilation cache with 30-minute TTL
   - WebSocket connection pooling (max 200)
   - Resource limits per user (50MB storage, 3 concurrent compilations)