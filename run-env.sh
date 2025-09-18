#!/bin/bash

# Script to manage environment configurations for Gyaandhara project
# Usage: ./run-env.sh [local|production] [start|dev]

# Define colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directories
FRONTEND_DIR="$(pwd)"
SERVER_DIR="$(pwd)/server"

# Function to print section header
print_section() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Environment setup function
setup_environment() {
  local env=$1
  
  if [ "$env" == "local" ]; then
    ENV_FILE=".env.local"
    print_section "Setting up LOCAL development environment"
  elif [ "$env" == "production" ]; then
    ENV_FILE=".env.production"
    print_section "Setting up PRODUCTION environment"
  else
    echo -e "${RED}Error: Invalid environment. Use 'local' or 'production'${NC}"
    exit 1
  fi
  
  # Check if env file exists
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file $ENV_FILE not found${NC}"
    exit 1
  fi
  
  # Copy environment file to .env in both frontend and backend
  echo -e "${GREEN}→ Copying $ENV_FILE to frontend .env${NC}"
  cp "$ENV_FILE" .env
  
  echo -e "${GREEN}→ Copying $ENV_FILE to backend .env${NC}"
  cp "$ENV_FILE" server/.env
  
  echo -e "${GREEN}✓ Environment configuration set to $env mode${NC}"
}

# Run server function
run_server() {
  local mode=$1
  
  print_section "Starting Backend Server"
  cd $SERVER_DIR
  
  if [ "$mode" == "dev" ]; then
    echo -e "${GREEN}→ Starting server in development mode with nodemon${NC}"
    NODE_ENV=$ENVIRONMENT npm run dev
  else
    echo -e "${GREEN}→ Starting server in standard mode${NC}"
    NODE_ENV=$ENVIRONMENT npm start
  fi
}

# Main script execution
if [ $# -lt 1 ]; then
  echo -e "${YELLOW}Usage: ./run-env.sh [local|production] [start|dev]${NC}"
  echo -e "  ${BLUE}local${NC}       - Use local development environment"
  echo -e "  ${BLUE}production${NC}  - Use production environment"
  echo -e "  ${BLUE}start${NC}       - Run with 'npm start'"
  echo -e "  ${BLUE}dev${NC}         - Run with 'npm run dev' (default)"
  exit 1
fi

# Set environment
ENVIRONMENT=$1
RUN_MODE=${2:-dev}

# Setup environment files
setup_environment $ENVIRONMENT

# Run the server
run_server $RUN_MODE