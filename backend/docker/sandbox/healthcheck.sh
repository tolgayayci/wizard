#!/bin/bash

# Health check script for sandbox container

# Check if cargo is available
if ! command -v cargo &> /dev/null; then
    echo "Cargo not found"
    exit 1
fi

# Check if cargo-stylus is installed
if ! cargo stylus --version &> /dev/null; then
    echo "cargo-stylus not found"
    exit 1
fi

# Check if rustc is available
if ! command -v rustc &> /dev/null; then
    echo "Rustc not found"
    exit 1
fi

echo "Sandbox environment is healthy"
exit 0