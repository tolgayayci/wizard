# Sandbox Environment for Stylus Compilation
FROM rust:1.75-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    clang \
    lld \
    xxd \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for potential JavaScript tooling
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for sandbox
RUN useradd -m -u 1000 -s /bin/bash wizard \
    && mkdir -p /home/wizard/projects \
    && chown -R wizard:wizard /home/wizard

# Switch to non-root user
USER wizard
WORKDIR /home/wizard

# Install Rust toolchain components
RUN rustup component add rustfmt clippy \
    && rustup target add wasm32-unknown-unknown

# Install cargo-stylus
RUN cargo install cargo-stylus --version 0.5.0

# Set environment variables
ENV USER=wizard
ENV PATH="/home/wizard/.cargo/bin:${PATH}"
ENV CARGO_HOME="/home/wizard/.cargo"
ENV RUSTUP_HOME="/home/wizard/.rustup"

# Create default project structure
RUN mkdir -p /home/wizard/templates

# Add a health check script
COPY --chown=wizard:wizard healthcheck.sh /home/wizard/healthcheck.sh
RUN chmod +x /home/wizard/healthcheck.sh

# Default command - keep container running
CMD ["/bin/bash", "-c", "while true; do sleep 30; done"]