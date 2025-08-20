# Wizard Backend Server Dockerfile
FROM rust:1.75-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the source code
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 wizard

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/wizard-backend /app/wizard-backend

# Set ownership
RUN chown -R wizard:wizard /app

USER wizard

EXPOSE 8080

CMD ["./wizard-backend"]