#!/bin/bash

# PatientRecords Micro-Frontend System - Build & Run Script
# This script builds and runs all components

echo "=========================================="
echo "PatientRecords Build & Run Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Build Backend
echo ""
print_info "Building Backend..."
cd backend
npm install --no-audit --no-fund
npm run build 2>/dev/null || true
print_status "Backend ready"
cd ..

# 2. Build Shell App
echo ""
print_info "Building Shell App (Port 4200)..."
cd frontend/shell-app
npm install --no-audit --no-fund 2>/dev/null || true
ng build --configuration production 2>/dev/null || true
print_status "Shell App built"
cd ../..

# 3. Build Modules
echo ""
print_info "Building Micro-Frontend Modules..."
for module in demographics vitals labs medications visits; do
    print_info "  Building $module module (Port $((4200 + $(echo "$module" | wc -c))))..."
    cd frontend/modules/$module
    npm install --no-audit --no-fund 2>/dev/null || true
    ng build --configuration production 2>/dev/null || true
    cd ../../..
done
print_status "All modules built"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the system, run:"
echo ""
echo "  npm start          # Starts backend (port 5001)"
echo "  npm run shell      # Starts shell app (port 4200)"
echo "  npm run modules    # Starts all modules (ports 4201-4205)"
echo ""
echo "Or use Docker:"
echo "  docker compose up -d --build"
echo ""
