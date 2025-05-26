#!/bin/bash

# Generate Development TLS Certificates
# This script creates self-signed certificates for development use only
# DO NOT use these certificates in production

set -e

# Configuration
CERT_DIR="certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"
DAYS=365

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Generating Development TLS Certificates${NC}"
echo "======================================"

# Create certs directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
    echo -e "${YELLOW}📁 Creating certs directory...${NC}"
    mkdir -p "$CERT_DIR"
fi

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠️  Certificates already exist!${NC}"
    read -p "Do you want to overwrite them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Keeping existing certificates${NC}"
        exit 0
    fi
fi

# Generate private key
echo -e "${YELLOW}🔑 Generating private key...${NC}"
openssl genrsa -out "$KEY_FILE" 2048

# Generate self-signed certificate
echo -e "${YELLOW}📜 Generating self-signed certificate...${NC}"
openssl req -new -x509 -sha256 -key "$KEY_FILE" -out "$CERT_FILE" -days "$DAYS" \
  -subj "/C=US/ST=CA/L=San Francisco/O=Health Dashboard/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

# Set appropriate permissions
echo -e "${YELLOW}🔒 Setting file permissions...${NC}"
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

# Display certificate information
echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
echo "======================================"
echo "Certificate: $CERT_FILE"
echo "Private Key: $KEY_FILE"
echo "Valid for: $DAYS days"
echo

# Display certificate details
echo -e "${GREEN}📋 Certificate Details:${NC}"
openssl x509 -in "$CERT_FILE" -text -noout | grep -A 5 "Subject:"
openssl x509 -in "$CERT_FILE" -text -noout | grep -A 2 "Validity"
openssl x509 -in "$CERT_FILE" -text -noout | grep -A 5 "Subject Alternative Name"

echo
echo -e "${GREEN}🚀 To use these certificates:${NC}"
echo "1. Set the following environment variables:"
echo "   TLS_ENABLED=true"
echo "   TLS_CERT_FILE=./$CERT_FILE"
echo "   TLS_KEY_FILE=./$KEY_FILE"
echo
echo "2. Update your frontend configuration to use https://localhost:8443"
echo
echo "3. Your browser will show a security warning for self-signed certificates"
echo "   Click 'Advanced' and 'Proceed to localhost' to continue"
echo
echo -e "${RED}⚠️  WARNING: These certificates are for development only!${NC}"
echo -e "${RED}   DO NOT use them in production environments${NC}" 