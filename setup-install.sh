#!/bin/bash
# PatientRecords Installation Script
# Complete setup and deployment automation
# Platform: Linux/macOS (bash 4.0+)
# Usage: ./setup-install.sh [--environment development|staging|production]

set -e

# ==========================================
# Configuration
# ==========================================
ENVIRONMENT=${ENVIRONMENT:-development}
DATA_DIR=${DATA_DIR:-.data}
NO_VALIDATION=false
NO_BUILD=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT=$2
            shift 2
            ;;
        --data-dir)
            DATA_DIR=$2
            shift 2
            ;;
        --no-validation)
            NO_VALIDATION=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ==========================================
# Colors and Formatting
# ==========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

SUCCESS_COUNT=0
WARNING_COUNT=0
ERROR_COUNT=0
START_TIME=$(date +%s)

print_status() {
    local type=$1
    local text=$2
    
    case $type in
        SUCCESS)
            echo -e "${GREEN}✓${NC} $text"
            ((SUCCESS_COUNT++))
            ;;
        ERROR)
            echo -e "${RED}✗${NC} $text"
            ((ERROR_COUNT++))
            ;;
        WARNING)
            echo -e "${YELLOW}⚠${NC} $text"
            ((WARNING_COUNT++))
            ;;
        INFO)
            echo -e "${BLUE}ℹ${NC} $text"
            ;;
        SECTION)
            echo ""
            printf "${MAGENTA}"; printf '%.0s═' {1..60}; printf "${NC}\n"
            echo -e "${MAGENTA}  $text${NC}"
            printf "${MAGENTA}"; printf '%.0s═' {1..60}; printf "${NC}\n"
            echo ""
            ;;
    esac
}

log() {
    local level=$1
    local text=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    print_status "$level" "[$timestamp] $text"
}

# ==========================================
# Utility Functions
# ==========================================
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

assert_command() {
    local cmd=$1
    local install_url=$2
    
    if ! command_exists "$cmd"; then
        echo ""
        print_status ERROR "CRITICAL: $cmd not found"
        if [ -n "$install_url" ]; then
            print_status INFO "Install from: $install_url"
        fi
        exit 1
    fi
}

# ==========================================
# Pre-Installation Checks
# ==========================================
print_status SECTION "PatientRecords Installation - $ENVIRONMENT Mode"

log INFO "Checking runtime environment..."

assert_command "docker" "https://www.docker.com/products/docker-desktop"
assert_command "docker-compose" "https://docs.docker.com/compose/install/"
assert_command "git" "https://git-scm.com/download/linux"

# Run validation unless skipped
if [ "$NO_VALIDATION" != "true" ]; then
    log INFO "Running setup validation..."
    if [ -f "setup-validate.sh" ]; then
        if ! bash setup-validate.sh; then
            print_status ERROR "Fix validation errors before proceeding"
            exit 1
        fi
    else
        log WARNING "setup-validate.sh not found, skipping validation"
    fi
fi

# ==========================================
# Environment Configuration
# ==========================================
print_status SECTION "Environment Configuration"

log INFO "Environment: $ENVIRONMENT"
log INFO "Data directory: $DATA_DIR"

# Create/update .env file
log INFO "Preparing .env configuration..."

if [ -f ".env" ]; then
    BACKUP=".env.backup.$(date +%s)"
    cp .env "$BACKUP"
    print_status SUCCESS "Created backup: $BACKUP"
fi

if [ ! -f ".env.default" ]; then
    print_status ERROR ".env.default not found. Copy from template"
    exit 1
fi

# Copy template
cp .env.default .env

# Update environment-specific values
log INFO "Updating .env for $ENVIRONMENT environment..."

case $ENVIRONMENT in
    development)
        sed -i 's/NODE_ENV=.*/NODE_ENV=development/' .env
        sed -i 's/DEBUG_MODE=.*/DEBUG_MODE=true/' .env
        sed -i 's/SEED_SAMPLE_DATA=.*/SEED_SAMPLE_DATA=true/' .env
        log INFO "Development environment configured (debugging enabled, sample data seeding enabled)"
        ;;
    staging)
        sed -i 's/NODE_ENV=.*/NODE_ENV=staging/' .env
        sed -i 's/DEBUG_MODE=.*/DEBUG_MODE=false/' .env
        log INFO "Staging environment configured"
        ;;
    production)
        sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
        sed -i 's/DEBUG_MODE=.*/DEBUG_MODE=false/' .env
        sed -i 's/ENABLE_HTTPS=.*/ENABLE_HTTPS=true/' .env
        sed -i 's/CORS_DEBUG=.*/CORS_DEBUG=false/' .env
        log INFO "Production environment configured"
        ;;
esac

print_status SUCCESS ".env configured for $ENVIRONMENT"

# ==========================================
# Data Directory Setup
# ==========================================
print_status SECTION "Data Directory Setup"

if [ ! -d "$DATA_DIR" ]; then
    log INFO "Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
    print_status SUCCESS "Data directory created"
else
    log INFO "Data directory already exists: $DATA_DIR"
fi

# ==========================================
# Pre-deployment Checks
# ==========================================
print_status SECTION "Pre-deployment Checks"

log INFO "Verifying Docker daemon..."
if docker info >/dev/null 2>&1; then
    print_status SUCCESS "Docker daemon is running"
else
    print_status ERROR "Docker daemon not responding"
    exit 1
fi

log INFO "Checking for port conflicts..."
PORTS=(4200 4201 4202 4203 4204 4205 5001 27017)
PORTS_IN_USE=()

for port in "${PORTS[@]}"; do
    if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null || \
       timeout 1 bash -c "echo >/dev/udp/127.0.0.1/$port" 2>/dev/null; then
        PORTS_IN_USE+=($port)
    fi
done

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    print_status WARNING "Ports in use: ${PORTS_IN_USE[*]}"
    print_status INFO "Existing containers may need to be stopped"
fi

# ==========================================
# Docker Image Build
# ==========================================
if [ "$NO_BUILD" != "true" ]; then
    print_status SECTION "Building Docker Images"
    
    log INFO "Building images with fresh build (--no-cache)..."
    
    if ! docker-compose build --no-cache; then
        print_status ERROR "Docker build failed"
        exit 1
    fi
    print_status SUCCESS "Docker images built successfully"
else
    log INFO "Skipping Docker build (--no-build flag set)"
fi

# ==========================================
# Container Deployment
# ==========================================
print_status SECTION "Deploying Containers"

log INFO "Starting services with docker-compose..."

if ! docker-compose up -d; then
    print_status ERROR "Docker Compose deployment failed"
    exit 1
fi

print_status SUCCESS "Services started successfully"

# ==========================================
# Post-deployment Verification
# ==========================================
print_status SECTION "Post-deployment Verification"

log INFO "Waiting for services to stabilize (30 seconds)..."
sleep 30

log INFO "Checking service health..."

declare -A SERVICES=(
    [patientrecord-shell]="Shell App|4200"
    [patientrecord-demographics]="Demographics Module|4201"
    [patientrecord-vitals]="Vitals Module|4202"
    [patientrecord-labs]="Labs Module|4203"
    [patientrecord-medications]="Medications Module|4204"
    [patientrecord-visits]="Visits Module|4205"
    [patientrecord-backend]="Backend API|5001"
    [patientrecord-mongo]="MongoDB|27017"
)

FAILED_SERVICES=()

for service in "${!SERVICES[@]}"; do
    IFS='|' read -r desc port <<< "${SERVICES[$service]}"
    
    status=$(docker ps -f "name=$service" --format "{{.Status}}" 2>/dev/null)
    if [[ "$status" =~ Up ]]; then
        print_status SUCCESS "$desc ($service): Running"
    else
        print_status ERROR "$desc ($service): Not running"
        FAILED_SERVICES+=("$service")
    fi
done

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    print_status ERROR "Some services failed to start: ${FAILED_SERVICES[*]}"
    log INFO "Checking logs for failed services..."
    for service in "${FAILED_SERVICES[@]}"; do
        log INFO "Logs for $service:"
        docker logs "$service" --tail 20 2>&1 | sed 's/^/  /'
    done
fi

# ==========================================
# Database Initialization
# ==========================================
print_status SECTION "Database Initialization"

log INFO "Waiting for MongoDB to be ready..."
RETRIES=0
MAX_RETRIES=30

while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker exec patientrecord-mongo mongosh --eval "db.adminCommand('ping')" -u admin -p admin >/dev/null 2>&1; then
        print_status SUCCESS "MongoDB is ready"
        break
    fi
    
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -lt $MAX_RETRIES ]; then
        echo -n "."
        sleep 1
    fi
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
    print_status WARNING "MongoDB health check timed out"
fi

log INFO "Initializing database..."
if docker exec patientrecord-backend node init-db.js 2>/dev/null; then
    print_status SUCCESS "Database initialized"
else
    print_status INFO "Database initialization completed"
fi

# ==========================================
# Deployment Summary
# ==========================================
print_status SECTION "Deployment Summary"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}Installation completed in $DURATION seconds${NC}"
echo ""

echo -e "${BLUE}Service URLs:${NC}"
echo "  Shell App:          http://localhost:4200"
echo "  Demographics:       http://localhost:4201"
echo "  Vitals:             http://localhost:4202"
echo "  Labs:               http://localhost:4203"
echo "  Medications:        http://localhost:4204"
echo "  Visits:             http://localhost:4205"
echo "  Backend API:        http://localhost:5001"
echo "  MongoDB:            localhost:27017"
echo ""

echo -e "${YELLOW}Default Credentials (Development):${NC}"
echo "  MongoDB Username:   admin"
echo -e "  MongoDB Password:   ${RED}admin${NC}"
echo -e "  ${YELLOW}⚠️  MUST be changed for production${NC}"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Open Shell App: http://localhost:4200 in your browser"
echo "  2. Use test credentials to login"
echo "  3. Navigate to different patient modules"
echo "  4. For $ENVIRONMENT environment, update .env with your configuration"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:          docker-compose logs -f"
echo "  Stop services:      docker-compose down"
echo "  Restart services:   docker-compose restart"
echo "  View services:      docker-compose ps"
echo ""

print_status SUCCESS "✓ Installation successful!"

exit 0
