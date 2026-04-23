#!/bin/bash

# ============================================
# Full-stack deployment (frontend + backend + docker)
# Zips the repo, uploads via SCP, runs docker compose on the server
# ============================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration - Modify these variables
TARGET_IP="${TARGET_IP:-your-server-ip}"
TARGET_USER="${TARGET_USER:-root}"
TARGET_PATH="${TARGET_PATH:-/var/www/ucsm-frwc}"
SSH_KEY="${SSH_KEY:-}"  # Optional: path to SSH key
SSH_PORT="${SSH_PORT:-22}"
BACKUP_RETENTION="${BACKUP_RETENTION:-3}"  # Keep last N backups
SKIP_DOCKER_CLEANUP="${SKIP_DOCKER_CLEANUP:-false}"  # Skip aggressive cleanup
VERBOSE="${VERBOSE:-false}"  # Verbose output

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script lives at repository root (docker-compose, backend/, frontend/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="ucsm_frwc_${TIMESTAMP}.zip"
TEMP_DIR="/tmp/ucsm_frwc_deploy_${TIMESTAMP}"
BACKUP_NAME="backup_${TIMESTAMP}"

# Cleanup function (called on exit)
cleanup_on_exit() {
    local exit_code=$?
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
    fi
    exit $exit_code
}

trap cleanup_on_exit EXIT INT TERM

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
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
check_requirements() {
    log_info "Checking requirements..."
    local missing_tools=()
    
    for tool in zip ssh scp docker; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All required tools are available"
}

# Test SSH connectivity
test_ssh_connection() {
    log_info "Testing SSH connection..."
    if ! ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" "echo 'Connection successful'" >/dev/null 2>&1; then
        log_error "Cannot connect to ${TARGET_USER}@${TARGET_IP}"
        exit 1
    fi
    log_success "SSH connection verified"
}

# Check remote disk space
check_remote_disk_space() {
    log_info "Checking remote disk space..."
    local required_space_mb=500  # Minimum 500MB required
    local available_space=$(ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" \
        "df -m ${TARGET_PATH} 2>/dev/null | tail -1 | awk '{print \$4}'" || echo "0")
    
    if [ "$available_space" -lt "$required_space_mb" ]; then
        log_error "Insufficient disk space on remote server (${available_space}MB available, ${required_space_mb}MB required)"
        exit 1
    fi
    log_success "Disk space check passed (${available_space}MB available)"
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
    echo "  -r, --retention Number of backups to keep (default: 3)"
    echo "  -v, --verbose   Enable verbose output"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  TARGET_IP           Target server IP address"
    echo "  TARGET_USER         SSH username"
    echo "  TARGET_PATH         Target deployment path"
    echo "  SSH_KEY             Path to SSH private key"
    echo "  SSH_PORT            SSH port"
    echo "  BACKUP_RETENTION    Number of backups to keep"
    echo "  SKIP_DOCKER_CLEANUP Skip aggressive Docker cleanup"
    echo ""
    echo "Example:"
    echo "  $0 -i 192.168.1.100 -u deploy -p /opt/ucsm-frwc -r 5"
    echo "  TARGET_IP=192.168.1.100 BACKUP_RETENTION=5 $0"
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
            -r|--retention)
                BACKUP_RETENTION="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
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
    
    if [ ! -f "${PROJECT_ROOT}/backend/.env.production" ]; then
        log_error "backend/.env.production not found in ${PROJECT_ROOT}/backend"
        exit 1
    fi

    # Validate root compose (full stack: nginx, frontend, backend, minio)
    if [ ! -f "${PROJECT_ROOT}/docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml not found in ${PROJECT_ROOT}"
        exit 1
    fi
}

# Build SSH/SCP options
build_ssh_opts() {
    SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -p ${SSH_PORT}"
    SCP_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -P ${SSH_PORT}"
    
    if [[ -n "$SSH_KEY" ]]; then
        SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
        SCP_OPTS="$SCP_OPTS -i $SSH_KEY"
    fi
}

# Create zip archive
create_archive() {
    log_info "Creating deployment archive (monorepo: backend + frontend + docker)..."
    
    cd "$PROJECT_ROOT"
    
    # Create temp directory
    mkdir -p "$TEMP_DIR"
    
    # Build zip command
    local zip_output=""
    if [ "$VERBOSE" = "true" ]; then
        zip_output="/dev/stdout"
    else
        zip_output="/dev/null"
    fi
    
    # Create zip excluding unnecessary files (match root .gitignore-style paths)
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
        > "$zip_output" 2>&1; then
        log_error "Failed to create archive"
        exit 1
    fi
    
    # Verify archive was created
    if [ ! -f "$TEMP_DIR/$ZIP_NAME" ]; then
        log_error "Archive file was not created"
        exit 1
    fi
    
    ZIP_SIZE=$(du -h "$TEMP_DIR/$ZIP_NAME" | cut -f1)
    log_success "Archive created: $ZIP_NAME ($ZIP_SIZE)"
}

# Upload archive to server
upload_archive() {
    log_info "Uploading archive to ${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}..."
    
    # Create target directory if it doesn't exist
    if ! ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" \
        "sudo mkdir -p ${TARGET_PATH} && sudo chown ${TARGET_USER}:${TARGET_USER} ${TARGET_PATH}"; then
        log_error "Failed to create target directory"
        exit 1
    fi
    
    # Upload zip file with progress if verbose
    if [ "$VERBOSE" = "true" ]; then
        scp $SCP_OPTS -v "$TEMP_DIR/$ZIP_NAME" "${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}/"
    else
        scp $SCP_OPTS "$TEMP_DIR/$ZIP_NAME" "${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}/"
    fi
    
    if [ $? -ne 0 ]; then
        log_error "Failed to upload archive"
        exit 1
    fi
    
    log_success "Archive uploaded successfully!"
}

# Extract and setup on remote server
remote_setup() {
    log_info "Extracting and setting up on remote server..."
    
    # Use printf to properly escape variables in heredoc
    ssh $SSH_OPTS "${TARGET_USER}@${TARGET_IP}" bash <<REMOTE_SCRIPT
set -euo pipefail

TARGET_PATH="${TARGET_PATH}"
ZIP_NAME="${ZIP_NAME}"
BACKUP_NAME="${BACKUP_NAME}"
TARGET_USER="${TARGET_USER}"
BACKUP_RETENTION="${BACKUP_RETENTION}"
SKIP_DOCKER_CLEANUP="${SKIP_DOCKER_CLEANUP}"

cd "\${TARGET_PATH}"

# Backup current deployment (if exists)
if [ -d "current" ]; then
    echo "Backing up current deployment..."
    sudo mv current "\${BACKUP_NAME}" || true
fi

# Create new deployment directory
sudo mkdir -p current
sudo chown \${TARGET_USER}:\${TARGET_USER} current

# Extract archive
echo "Extracting archive..."
if ! unzip -q -o "\${ZIP_NAME}" -d current; then
    echo "Failed to extract archive" >&2
    exit 1
fi

cd current

# Copy environment files (compose uses backend/.env)
if [ -f "backend/.env.production" ]; then
    cp backend/.env.production backend/.env
else
    echo "Warning: backend/.env.production not found" >&2
fi

if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml docker-compose.yml
else
    echo "Error: docker-compose.prod.yml not found" >&2
    exit 1
fi

# Stop existing containers gracefully
if [ -f "docker-compose.yml" ]; then
    echo "Stopping existing containers..."
    sudo docker compose down --timeout 30 2>/dev/null || true
fi

# Clean up Docker (less aggressive)
if [ "\${SKIP_DOCKER_CLEANUP}" != "true" ]; then
    echo "Cleaning up Docker resources..."
    # Only remove unused resources, not all volumes
    sudo docker system prune -f 2>/dev/null || true
    sudo docker builder prune -f 2>/dev/null || true
fi

# Build and start Docker containers
echo "Building and starting Docker containers..."
if ! sudo docker compose up -d --build; then
    echo "Failed to start containers" >&2
    exit 1
fi

# Wait for containers to be healthy (with timeout)
echo "Waiting for containers to be healthy..."
timeout=60
elapsed=0
while [ \$elapsed -lt \$timeout ]; do
    if sudo docker compose ps | grep -q "healthy\|running"; then
        healthy_count=\$(sudo docker compose ps | grep -c "healthy\|running" || echo "0")
        total_count=\$(sudo docker compose ps --format json | jq -r '.Name' | wc -l || echo "0")
        if [ "\$healthy_count" -ge "\$total_count" ] && [ "\$total_count" -gt 0 ]; then
            echo "All containers are healthy"
            break
        fi
    fi
    sleep 2
    elapsed=\$((elapsed + 2))
done

# Clean up old backups (keep only the specified number)
cd "\${TARGET_PATH}"
backup_count=\$(ls -dt backup_* 2>/dev/null | wc -l || echo "0")
if [ "\$backup_count" -gt "\${BACKUP_RETENTION}" ]; then
    echo "Cleaning up old backups (keeping last \${BACKUP_RETENTION})..."
    ls -dt backup_* 2>/dev/null | tail -n +\$((BACKUP_RETENTION + 1)) | sudo xargs rm -rf 2>/dev/null || true
fi

# Clean up zip file
rm -f "\${ZIP_NAME}"

# Show running containers
echo ""
echo "Running containers:"
sudo docker compose -f current/docker-compose.yml ps

# Show container health status
echo ""
echo "Container health status:"
sudo docker compose -f current/docker-compose.yml ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "Remote setup completed!"
REMOTE_SCRIPT

    if [ $? -ne 0 ]; then
        log_error "Remote setup failed"
        exit 1
    fi
    
    log_success "Remote setup completed!"
}

# Main deployment function
main() {
    echo ""
    echo "============================================"
    echo "   UCSM FRWC — full stack deploy (Docker)"
    echo "============================================"
    echo ""
    
    parse_args "$@"
    validate_config
    build_ssh_opts
    
    log_info "Deployment Configuration:"
    echo "  Target IP:        ${TARGET_IP}"
    echo "  Target User:      ${TARGET_USER}"
    echo "  Target Path:      ${TARGET_PATH}"
    echo "  SSH Port:         ${SSH_PORT}"
    echo "  Backup Retention: ${BACKUP_RETENTION}"
    echo ""
    
    # Pre-deployment checks
    check_requirements
    test_ssh_connection
    check_remote_disk_space
    
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
    
    echo ""
    log_success "============================================"
    log_success "  Deployment completed successfully!"
    log_success "============================================"
    echo ""
    log_info "Your application is now deployed to:"
    echo "  ${TARGET_USER}@${TARGET_IP}:${TARGET_PATH}/current"
    echo ""
    log_info "To rollback, run on server:"
    echo "  cd ${TARGET_PATH} && sudo mv current current_failed && sudo mv backup_* current"
    echo ""
}

# Run main function
main "$@"