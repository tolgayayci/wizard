#!/bin/bash

# Build script for the optimized sandbox Docker image
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building optimized sandbox image for Stylus development..."
echo "This image will be used for secure contract compilation"
echo ""

# Build the image with optimizations
docker build \
    -f "$BACKEND_DIR/Dockerfile.sandbox" \
    -t wizard-sandbox:latest \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --cache-from wizard-sandbox:latest \
    "$BACKEND_DIR"

# Display image size
echo ""
echo "Image built successfully!"
echo "Image details:"
docker images wizard-sandbox:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Test the image
echo ""
echo "Testing the sandbox image..."
docker run --rm wizard-sandbox:latest bash -c "cargo --version && cargo stylus --version"

echo ""
echo "Sandbox image is ready for use!"
echo "The image includes:"
echo "  - Rust toolchain with wasm32 target"
echo "  - cargo-stylus CLI tool"
echo "  - Pre-cached Stylus dependencies"
echo "  - Security hardening (non-root user)"
echo "  - Resource limits configuration"