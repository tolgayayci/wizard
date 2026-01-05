# Use official Rust image with specific version
FROM rust:1.88.0

# Install system dependencies and solc (without nginx/certbot)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && ARCH=$(uname -m) && \
    echo "Architecture: $ARCH" && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
        echo "ARM64 detected - building solc from source..." && \
        apt-get update && apt-get install -y build-essential cmake libboost-all-dev && \
        git clone --depth 1 --branch v0.8.24 https://github.com/ethereum/solidity.git && \
        cd solidity && \
        mkdir build && \
        cd build && \
        cmake .. && \
        make -j$(nproc) && \
        cp solc/solc /usr/local/bin/ && \
        cd / && \
        rm -rf solidity && \
        apt-get remove -y build-essential cmake libboost-all-dev && \
        apt-get autoremove -y && \
        rm -rf /var/lib/apt/lists/*; \
    else \
        echo "x86_64 detected - downloading prebuilt solc..." && \
        wget -O /usr/local/bin/solc https://github.com/ethereum/solidity/releases/download/v0.8.24/solc-static-linux && \
        chmod +x /usr/local/bin/solc; \
    fi \
    && ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
        wget -O binaryen.tar.gz https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-aarch64-linux.tar.gz; \
    else \
        wget -O binaryen.tar.gz https://github.com/WebAssembly/binaryen/releases/download/version_117/binaryen-version_117-x86_64-linux.tar.gz; \
    fi && \
    tar -xzf binaryen.tar.gz && \
    cp binaryen-version_117/bin/wasm-opt /usr/local/bin/ && \
    rm -rf binaryen.tar.gz binaryen-version_117 \
    && cargo install twiggy

# Add wasm32 target for Stylus compilation (for root, used during build)
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
COPY --chown=wizard:wizard examples ./examples

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
ENV RUSTUP_HOME=/home/wizard/.rustup

# Create cargo directories with proper permissions
RUN mkdir -p $CARGO_HOME/registry && \
    mkdir -p $CARGO_HOME/git && \
    mkdir -p $RUSTUP_HOME

# Install rustup for the wizard user and add wasm32 target
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable && \
    . $CARGO_HOME/env && \
    rustup target add wasm32-unknown-unknown && \
    rustup toolchain install 1.87.0 && \
    rustup target add --toolchain 1.87.0 wasm32-unknown-unknown && \
    rustup toolchain install nightly-2024-09-05 && \
    rustup target add --toolchain nightly-2024-09-05 wasm32-unknown-unknown && \
    rustup component add rust-src --toolchain nightly-2024-09-05 && \
    rustup default stable && \
    cargo install cargo-stylus --version 0.6.3 && \
    cargo install twiggy

# Expose port for the application
EXPOSE 8080

# Set environment variables
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=8080
ENV STORAGE_PATH=/app/projects

# Run the application directly
CMD ["/app/target/release/wizard-backend"]