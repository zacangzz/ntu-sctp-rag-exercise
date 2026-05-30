#!/bin/bash

# Exit immediately if any command fails
set -e

# Curated HSL-tailored terminal colors
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${PURPLE}=====================================================${NC}"
echo -e "${PURPLE}   RAG App Full-Stack Single-Port Server Launcher    ${NC}"
echo -e "${PURPLE}=====================================================${NC}"

# Ensure we are in the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Default config
SKIP_BUILD=false
PORT=8000

# Parse arguments
for arg in "$@"
do
    case $arg in
        --skip-build)
        SKIP_BUILD=true
        shift
        ;;
        --port=*)
        PORT="${arg#*=}"
        shift
        ;;
    esac
done

# Step 1: Pre-flight checks
echo -e "\n${CYAN}[1/3] Performing system environment checks...${NC}"
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: 'uv' package manager is not installed.${NC}"
    echo -e "Please install uv: brew install uv or https://astral.sh/uv"
    exit 1
fi
echo -e "${GREEN}✓ 'uv' is installed.${NC}"

if [ "$SKIP_BUILD" = false ]; then
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: 'npm' is not installed.${NC}"
        echo -e "Please install Node.js: https://nodejs.org"
        exit 1
    fi
    echo -e "${GREEN}✓ 'npm' is installed.${NC}"

    # Step 2: Build frontend static files
    echo -e "\n${CYAN}[2/3] Building React Frontend UI static assets...${NC}"
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing node dependencies first...${NC}"
        npm install
    fi
    echo -e "${YELLOW}Compiling React application...${NC}"
    npm run build
    cd ..
    echo -e "${GREEN}✓ Frontend compiled successfully to frontend/dist.${NC}"
else
    echo -e "\n${CYAN}[2/3] Skipping Frontend Build (--skip-build active)...${NC}"
fi

# Step 3: Run Uvicorn Unified Server
echo -e "\n${CYAN}[3/3] Starting Unified Uvicorn server on port $PORT...${NC}"
echo -e "${YELLOW}Serving API routes on /api/... and static React UI on / ...${NC}"

# Gracefully handle port occupancy
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Warning: A process is already listening on port $PORT.${NC}"
    read -p "Would you like to kill it and proceed? (y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Killing process on port $PORT...${NC}"
        kill -9 $(lsof -t -i:$PORT)
    else
        echo -e "${RED}Error: Port $PORT is occupied. Exiting.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Launching full-stack server! Open http://localhost:$PORT in your browser.${NC}\n"
uv run uvicorn backend.main:app --host 0.0.0.0 --port $PORT --reload
