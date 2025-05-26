# TLS/HTTPS Configuration

This document explains how to configure TLS certificates to enable HTTPS for the health dashboard backend server.

## Overview

The server supports both HTTP and HTTPS modes. When TLS is enabled, the server will:

- Listen for HTTPS connections on the configured port
- Require valid TLS certificate and private key files
- Automatically handle TLS handshake and encryption
- Log TLS configuration details on startup

## Configuration

### Environment Variables

Set the following environment variables to enable TLS:

```bash
TLS_ENABLED=true
TLS_CERT_FILE=./certs/server.crt
TLS_KEY_FILE=./certs/server.key
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TLS_ENABLED` | Enable/disable TLS | `false` | No |
| `TLS_CERT_FILE` | Path to TLS certificate file | `""` | Yes (if TLS enabled) |
| `TLS_KEY_FILE` | Path to TLS private key file | `""` | Yes (if TLS enabled) |

## Certificate Generation

### Option 1: Self-Signed Certificates (Development)

For development and testing, you can generate self-signed certificates:

```bash
# Create certs directory
mkdir -p certs

# Generate private key
openssl genrsa -out certs/server.key 2048

# Generate self-signed certificate
openssl req -new -x509 -sha256 -key certs/server.key -out certs/server.crt -days 365 \
  -subj "/C=US/ST=CA/L=San Francisco/O=Health Dashboard/CN=localhost"

# Set appropriate permissions
chmod 600 certs/server.key
chmod 644 certs/server.crt
```

### Option 2: Let's Encrypt (Production)

For production deployments, use Let's Encrypt for free SSL certificates:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate (replace your-domain.com)
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Update environment variables
TLS_CERT_FILE=/etc/letsencrypt/live/your-domain.com/fullchain.pem
TLS_KEY_FILE=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Option 3: Commercial SSL Certificate

If you have a commercial SSL certificate:

1. Place your certificate file (usually `.crt` or `.pem`) in a secure location
2. Place your private key file (usually `.key`) in a secure location
3. Update the environment variables to point to these files
4. Ensure proper file permissions (600 for key, 644 for certificate)

## File Permissions

Set appropriate permissions for certificate files:

```bash
# Private key should be readable only by owner
chmod 600 /path/to/server.key

# Certificate can be world-readable
chmod 644 /path/to/server.crt

# Ensure the server user can read the files
chown your-server-user:your-server-group /path/to/server.*
```

## Example Configurations

### Development with Self-Signed Certificates

```env
# Server Configuration
PORT=8443
ENVIRONMENT=development

# TLS Configuration
TLS_ENABLED=true
TLS_CERT_FILE=./certs/server.crt
TLS_KEY_FILE=./certs/server.key

# Other configuration...
```

### Production with Let's Encrypt

```env
# Server Configuration
PORT=443
ENVIRONMENT=production

# TLS Configuration
TLS_ENABLED=true
TLS_CERT_FILE=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_FILE=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Other configuration...
```

### Docker Configuration

When running in Docker, mount the certificate files as volumes:

```yaml
# docker-compose.yml
version: '3.8'
services:
  health-backend:
    image: health-dashboard-backend
    ports:
      - "443:443"
    volumes:
      - ./certs:/app/certs:ro
    environment:
      - TLS_ENABLED=true
      - TLS_CERT_FILE=/app/certs/server.crt
      - TLS_KEY_FILE=/app/certs/server.key
      - PORT=443
```

## Frontend Configuration

When TLS is enabled on the backend, update the frontend configuration:

```typescript
// dashboard/src/lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8443',
  // ... other config
};
```

Or set the environment variable:

```bash
# Frontend .env.local
NEXT_PUBLIC_API_URL=https://localhost:8443
```

## CORS Configuration

When using HTTPS, update CORS configuration to include HTTPS origins:

```env
CORS_ALLOWED_ORIGINS=https://localhost:3000,https://localhost:3001,https://yourdomain.com
```

## Testing TLS Configuration

### Test with curl

```bash
# Test HTTPS endpoint
curl -k https://localhost:8443/health

# Test with certificate verification (production)
curl https://yourdomain.com/health
```

### Test with browser

1. Navigate to `https://localhost:8443/health`
2. For self-signed certificates, accept the security warning
3. For production certificates, verify the green lock icon

## Troubleshooting

### Common Issues

1. **Certificate file not found**
   ```
   TLS enabled but certificate or key file not specified
   ```
   - Verify file paths in environment variables
   - Check file permissions
   - Ensure files exist

2. **Permission denied**
   ```
   Failed to start server: permission denied
   ```
   - Check file permissions (600 for key, 644 for cert)
   - Ensure server user can read the files

3. **Invalid certificate**
   ```
   Failed to start server: invalid certificate
   ```
   - Verify certificate format (PEM)
   - Check certificate validity dates
   - Ensure certificate matches private key

4. **Port already in use**
   ```
   Failed to start server: address already in use
   ```
   - Change the port in configuration
   - Kill existing process using the port

### Certificate Validation

Verify your certificate is valid:

```bash
# Check certificate details
openssl x509 -in certs/server.crt -text -noout

# Verify certificate matches private key
openssl rsa -in certs/server.key -check
openssl x509 -in certs/server.crt -noout -modulus | openssl md5
openssl rsa -in certs/server.key -noout -modulus | openssl md5
# The MD5 hashes should match
```

## Security Best Practices

1. **Use strong private keys** (2048-bit RSA minimum)
2. **Keep private keys secure** (600 permissions, encrypted storage)
3. **Regular certificate renewal** (especially for Let's Encrypt)
4. **Use HSTS headers** in production
5. **Disable weak cipher suites** if needed
6. **Monitor certificate expiration** dates

## Certificate Renewal

### Let's Encrypt Auto-Renewal

Set up automatic renewal for Let's Encrypt certificates:

```bash
# Add to crontab
sudo crontab -e

# Add this line for daily check
0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl restart health-dashboard"
```

### Manual Renewal

For other certificate types, set up monitoring and manual renewal processes before expiration. 