#!/bin/bash
# PatientRecords Setup Validation Script
# This script validates all prerequisites and system configuration before deployment
# Platform: Linux/macOS (bash 4.0+)
# Usage: ./setup-validate.sh

set -o pipefail

# ==========================================
# Configuration
# ==========================================
SUCCESS_COUNT=0
WARNING_COUNT=0
ERROR_COUNT=0

REQUIRED_VERSIONS=(
    "docker:20.10.0"
    "docker-compose:2.0.0"
    "git:2.20.0"
)

# ==========================================
# Colors and Formatting
# ==========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

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
            echo -e "${MAGENTA}▶ $text${NC}"
            echo ""
            ;;
    esac
}

# ==========================================
# Validation Functions
# ==========================================
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_version() {
    local cmd=$1
    local flag=${2:---version}
    
    if command_exists "$cmd"; then
        "$cmd" "$flag" 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1
    fi
}

compare_versions() {
    local current=$1
    local required=$2
    
    if [[ "$current" == "$required" ]]; then
        return 0
    fi
    
    local IFS=.
    local i ver1=($current) ver2=($required)
    
    for ((i=0; i<${#ver1[@]} || i<${#ver2[@]}; i++)); do
        if ((10#${ver1[i]:-0} > 10#${ver2[i]:-0})); then
            return 0
        fi
        if ((10#${ver1[i]:-0} < 10#${ver2[i]:-0})); then
            return 1
        fi
    done
    return 0
}

# ==========================================
# Check Prerequisites
# ==========================================
print_status SECTION "System Prerequisites Check"

# Check OS
OS_TYPE=$(uname -s)
print_status INFO "Operating System: $OS_TYPE"

case $OS_TYPE in
    Linux)
        DISK_FREE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
        RAM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024/1024)}')
        ;;
    Darwin)
        DISK_FREE=$(df -g . | tail -1 | awk '{print $4}')
        RAM_TOTAL=$(vm_stat | grep "Pages free" | awk -F':' '{print int($2/256)}')
        ;;
    *)
        print_status WARNING "Unsupported OS: $OS_TYPE"
        ;;
esac

# Check RAM
print_status INFO "System Memory: ${RAM_TOTAL}GB"
if [ "$RAM_TOTAL" -lt 4 ]; then
    print_status ERROR "Minimum 4GB RAM required (6GB+ recommended)"
else
    print_status SUCCESS "RAM requirement met"
fi

# Check Disk Space
print_status INFO "Free Disk Space: ${DISK_FREE}GB"
if [ "$DISK_FREE" -lt 20 ]; then
    print_status ERROR "Minimum 20GB free disk space required"
else
    print_status SUCCESS "Disk space requirement met"
fi

# ==========================================
# Check Docker Installation
# ==========================================
print_status SECTION "Docker & Container Runtime"

if command_exists docker; then
    DOCKER_VERSION=$(get_version docker)
    print_status SUCCESS "Docker installed: $DOCKER_VERSION"
    
    if compare_versions "$DOCKER_VERSION" "20.10.0"; then
        print_status SUCCESS "Docker version requirement met (>= 20.10.0)"
    else
        print_status ERROR "Docker version too old. Current: $DOCKER_VERSION, Required: 20.10.0"
    fi
    
    # Check Docker daemon
    if docker info &>/dev/null; then
        print_status SUCCESS "Docker daemon is running"
        
        # Check Docker resources
        DOCKER_CPU=$(docker info | grep "CPUs" | awk '{print $2}')
        DOCKER_MEM=$(docker info | grep "Memory" | awk '{print $2}')
        print_status INFO "Docker Resources: $DOCKER_CPU CPUs, $DOCKER_MEM Memory"
    else
        print_status ERROR "Docker daemon not running. Start Docker daemon first"
    fi
else
    print_status ERROR "Docker not installed or not in PATH"
    print_status INFO "Install from: https://www.docker.com/products/docker-desktop"
fi

if command_exists docker-compose; then
    COMPOSE_VERSION=$(get_version docker-compose)
    print_status SUCCESS "Docker Compose installed: $COMPOSE_VERSION"
    
    if compare_versions "$COMPOSE_VERSION" "2.0.0"; then
        print_status SUCCESS "Docker Compose version requirement met (>= 2.0.0)"
    else
        print_status ERROR "Docker Compose version too old. Current: $COMPOSE_VERSION, Required: 2.0.0"
    fi
else
    print_status ERROR "Docker Compose not installed"
    print_status INFO "Usually included with Docker Desktop; install separate if needed"
fi

# ==========================================
# Check Required Tools
# ==========================================
print_status SECTION "Required Tools"

# Git
if command_exists git; then
    GIT_VERSION=$(get_version git)
    print_status SUCCESS "Git installed: $GIT_VERSION"
else
    print_status ERROR "Git not installed or not in PATH"
    print_status INFO "Install from: https://git-scm.com/download/linux"
fi

# Node.js
if command_exists node; then
    NODE_VERSION=$(get_version node)
    print_status SUCCESS "Node.js installed: $NODE_VERSION"
    
    if compare_versions "$NODE_VERSION" "18.0.0"; then
        print_status SUCCESS "Node.js version requirement met (>= 18.0.0)"
    else
        print_status WARNING "Node.js version may be too old. Current: $NODE_VERSION, Recommended: 18.0.0+"
    fi
else
    print_status WARNING "Node.js not installed or not in PATH"
    print_status INFO "Required for local development; optional for Docker deployment"
fi

# npm
if command_exists npm; then
    NPM_VERSION=$(get_version npm)
    print_status SUCCESS "npm installed: $NPM_VERSION"
else
    print_status WARNING "npm not installed"
    print_status INFO "Usually installed with Node.js"
fi

# ==========================================
# Check Port Availability
# ==========================================
print_status SECTION "Port Availability"

declare -A REQUIRED_PORTS=(
    [4200]="Shell App"
    [4201]="Demographics Module"
    [4202]="Vitals Module"
    [4203]="Labs Module"
    [4204]="Medications Module"
    [4205]="Visits Module"
    [5001]="Backend API"
    [27017]="MongoDB"
)

PORTS_IN_USE=()
for port in "${!REQUIRED_PORTS[@]}"; do
    if timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null; then
        print_status WARNING "Port $port (${REQUIRED_PORTS[$port]}): IN USE"
        PORTS_IN_USE+=($port)
    else
        print_status SUCCESS "Port $port (${REQUIRED_PORTS[$port]}): Available"
    fi
done

# ==========================================
# Check Project Structure
# ==========================================
print_status SECTION "Project Structure"

REQUIRED_DIRS=(
    "backend"
    "frontend/shell-app"
    "frontend/modules/demographics"
    "frontend/modules/vitals"
    "frontend/modules/labs"
    "frontend/modules/medications"
    "frontend/modules/visits"
    "mongo"
    "docs"
    "scripts"
)

REQUIRED_FILES=(
    "docker-compose.yml"
    "README.md"
    "backend/server.js"
    "backend/package.json"
    "backend/Dockerfile"
    ".gitignore"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status SUCCESS "Directory found: $dir"
    else
        print_status ERROR "Directory missing: $dir"
    fi
done

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status SUCCESS "File found: $file"
    else
        print_status ERROR "File missing: $file"
    fi
done

# ==========================================
# Check Configuration Files
# ==========================================
print_status SECTION "Configuration Files"

if [ -f ".env" ]; then
    print_status INFO ".env file exists"
    if grep -q "JWT_SECRET\|MONGODB_URI" .env; then
        print_status SUCCESS ".env contains required configuration"
    else
        print_status WARNING ".env missing required variables (JWT_SECRET, MONGODB_URI)"
    fi
else
    print_status WARNING ".env file not found"
    print_status INFO "Copy .env.default to .env and configure for your environment"
fi

if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        print_status SUCCESS ".gitignore properly excludes .env files"
    else
        print_status WARNING ".env files not properly ignored in .gitignore"
    fi
fi

# ==========================================
# Summary
# ==========================================
print_status SECTION "Validation Summary"

TOTAL_CHECKS=$((SUCCESS_COUNT + WARNING_COUNT + ERROR_COUNT))
echo -e "Results: ${GREEN}✓ $SUCCESS_COUNT${NC} ${YELLOW}⚠ $WARNING_COUNT${NC} ${RED}✗ $ERROR_COUNT${NC}"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    print_status SUCCESS "✓ All critical checks passed! Ready for deployment"
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.default to .env: cp .env.default .env"
    echo "  2. Update .env with your configuration"
    echo "  3. Run: docker-compose up -d"
    echo ""
    exit 0
else
    print_status ERROR "✗ Fix the above errors before proceeding"
    if [ $WARNING_COUNT -gt 0 ]; then
        print_status WARNING "⚠ Review warnings and address as needed"
    fi
    exit 1
fi
