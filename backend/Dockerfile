# Use official Rust image with specific version
FROM rust:1.88.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-stylus for smart contract compilation
RUN cargo install cargo-stylus --version 0.6.3

# Add wasm32 target for Stylus compilation
RUN rustup target add wasm32-unknown-unknown

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash wizard && \
    chown -R wizard:wizard /app && \
    mkdir -p /usr/local/cargo/registry && \
    chown -R wizard:wizard /usr/local/cargo/registry && \
    chmod -R 755 /usr/local/cargo/registry

# Copy project files
COPY --chown=wizard:wizard Cargo.toml Cargo.lock ./
COPY --chown=wizard:wizard src ./src

# Build the application
RUN cargo build --release

# Create projects directory inside container
RUN mkdir -p /app/projects && \
    chown -R wizard:wizard /app/projects

# Switch to non-root user
USER wizard

# Set cargo home for the wizard user
ENV CARGO_HOME=/home/wizard/.cargo
ENV PATH=$CARGO_HOME/bin:$PATH

# Create cargo directories with proper permissions
RUN mkdir -p $CARGO_HOME/registry && \
    mkdir -p $CARGO_HOME/git

# Expose port
EXPOSE 8080

# Set environment variables
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=8080
ENV STORAGE_PATH=/app/projects

# Run the backend
CMD ["./target/release/wizard-backend"]