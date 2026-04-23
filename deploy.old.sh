#!/bin/bash

# ============================================
# Legacy full-stack deploy (simpler flow; kept for reference)
# ============================================

set -e  # Exit on any error

# Configuration - Modify these variables
TARGET_IP="${TARGET_IP:-your-server-ip}"
TARGET_USER="${TARGET_USER:-root}"
TARGET_PATH="${TARGET_PATH:-/var/www/ucsm-frwc}"
SSH_KEY="${SSH_KEY:-}"  # Optional: path to SSH key
SSH_PORT="${SSH_PORT:-22}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="ucsm_frwc_${TIMESTAMP}.zip"
TEMP_DIR="/tmp/ucsm_frwc_deploy_${TIMESTAMP}"

# Print colored message
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --ip        Target server IP address"
    echo "  -u, --user      SSH username (default: root)"
    echo "  -p, --path      Target deployment path (default: /var/www/ucsm-frwc)"
    echo "  -k, --key       Path to SSH private key"
    echo "  -P, --port      SSH port (default: 22)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  TARGET_IP       Target server IP address"
    echo "  TARGET_USER     SSH username"
    echo "  TARGET_PATH     Target deployment path"
    echo "  SSH_KEY         Path to SSH private key"
    echo "  SSH_PORT        SSH port"
    echo ""
    echo "Example:"
    echo "  $0 -i 192.168.1.100 -u deploy -p /opt/ucsm-frwc"
    echo "  TARGET_IP=192.168.1.100 $0"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--ip)
                TARGET_IP="$2"
                shift 2
                ;;
            -u|--user)
                TARGET_USER="$2"
                shift 2
                ;;
            -p|--path)
                TARGET_PATH="$2"
                shift 2
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            -P|--port)
                SSH_PORT="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Validate configuration
validate_config() {
    if [[ "$TARGET_IP" == "your-server-ip" || -z "$TARGET_IP" ]]; then
        log_error "Target IP not specified!"
        echo ""
        usage
        exit 1
    fi

    if [[ -n "$SSH_KEY" && ! -f "$SSH_KEY" ]]; then
        log_error "SSH key file not found: $SSH_KEY"
        exit 1
    fi

    if [ ! -f "${PROJECT_ROOT}/docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml not found in ${PROJECT_ROOT}"
        exit 1
    fi
}

# Build SSH/SCP options
build_ssh_opts() {
    SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -p ${SSH_PORT}"
    SCP_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -P ${SSH_PORT}"
    
    if [[ -n "$SSH_KEY" ]]; then
        SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
        SCP_OPTS="$SCP_OPTS -i $SSH_KEY"
    fi
}

# Create zip archive
create_archive() {
    log_info "Creating deployment archive (frontend + backend + docker)…"
    
    cd "$PROJECT_ROOT"
    
    mkdir -p "$TEMP_DIR"
    
    if ! zip -r "$TEMP_DIR/$ZIP_NAME" . \
        -x "*/.git/*" \
        -x "*/node_modules/*" \
        -x "*/dist/*" \
        -x "*/build/*" \
        -x "*/.next/*" \
        -x "*/out/*" \
        -x "*/coverage/*" \
        -x "*/.nyc_output/*" \
        -x "*/tmp/*" \
        -x "*/.cursor/*" \
        -x "backend/.env" \
        -x "backend/.env.local" \
        -x "backend/.env.*.local" \
        -x "frontend/.env" \
        -x "frontend/.env.local" \
        -x "frontend/.env.*.local" \
        -x "*.log" \
        -x ".DS_Store" \
        -x "*.zip" \
        -x "./.env" \
        -x "./.env.*.local" \
        > /dev/null 2>&1; then
        log_error "Failed to create archive"
        exit 1
    fi
    
    ZIP_SIZE=$(du -h "$TEMP_DIR/$ZIP_NAME" | cut -f1)
    log_success "Archive created: $ZIP_NAME ($ZIP_SIZE)"
}

# Upload archive to server
upload_archive() {
    log_info "Uploading archive to ${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}..."
    
    # Create target directory if it doesn't exist (using sudo)
    ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" "sudo mkdir -p ${TARGET_PATH} && sudo chown ${TARGET_USER}:${TARGET_USER} ${TARGET_PATH}"
    
    # Upload zip file
    scp $SCP_OPTS "$TEMP_DIR/$ZIP_NAME" "${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}/"
    
    log_success "Archive uploaded successfully!"
}

# Extract and setup on remote server
remote_setup() {
    log_info "Extracting and setting up on remote server..."
    
    ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" << REMOTE_SCRIPT
        set -e
        cd ${TARGET_PATH}
        
        # Backup current deployment (if exists)
        if [ -d "current" ]; then
            echo "Backing up current deployment..."
            sudo mv current "backup_\$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        fi
        
        # Create new deployment directory
        sudo mkdir -p current
        sudo chown ${TARGET_USER}:${TARGET_USER} current
        
        # Extract archive
        echo "Extracting archive..."
        unzip -o ${ZIP_NAME} -d current > /dev/null
        
        cd current

        if [ -f "backend/.env.production" ]; then
            cp backend/.env.production backend/.env
        fi

        cp docker-compose.prod.yml docker-compose.yml
        
        # Stop existing containers
        if [ -f "docker-compose.yml" ]; then
            echo "Stopping existing containers..."
            sudo docker compose down 2>/dev/null || true
        fi
        
        # Clean up Docker (images/build cache; does not remove named volumes)
        echo "Cleaning up Docker resources..."
        sudo docker system prune -f 2>/dev/null || true
        sudo docker builder prune -f 2>/dev/null || true
        
        # Build and start Docker containers
        echo "Building and starting Docker containers..."
        sudo docker compose up -d --build
        
        # Clean up old backups (keep only the most recent one)
        cd ${TARGET_PATH}
        ls -dt backup_* 2>/dev/null | tail -n +2 | sudo xargs rm -rf 2>/dev/null || true
        
        # Clean up zip file
        rm -f ${ZIP_NAME}
        
        # Show running containers
        echo ""
        echo "Running containers:"
        sudo docker compose -f current/docker-compose.yml ps
        
        echo ""
        echo "Remote setup completed!"
REMOTE_SCRIPT
    
    log_success "Remote setup completed!"
}

# Cleanup local temp files
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    log_success "Cleanup completed!"
}

# Main deployment function
main() {
    echo ""
    echo "============================================"
    echo "  UCSM FRWC — legacy full-stack deploy"
    echo "============================================"
    echo ""
    
    parse_args "$@"
    validate_config
    build_ssh_opts
    
    log_info "Deployment Configuration:"
    echo "  Target IP:   ${TARGET_IP}"
    echo "  Target User: ${TARGET_USER}"
    echo "  Target Path: ${TARGET_PATH}"
    echo "  SSH Port:    ${SSH_PORT}"
    echo ""
    
    # Confirm deployment
    read -p "Proceed with deployment? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Deployment cancelled."
        exit 0
    fi
    
    echo ""
    
    create_archive
    upload_archive
    remote_setup
    cleanup
    
    echo ""
    log_success "============================================"
    log_success "  Deployment completed successfully!"
    log_success "============================================"
    echo ""
    log_info "Your application is now deployed to:"
    echo "  ${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}/current"
    echo ""
}

# Run main function
main "$@"

