# CORS Configuration Fix

This document explains how to configure CORS to fix cross-origin request issues.

## Problem

When your frontend (running on one domain/port) tries to make requests to the backend API (running on `http://54.87.32.90:8080`), browsers block these requests due to CORS (Cross-Origin Resource Sharing) restrictions.

## Solution

The backend now supports configurable CORS through environment variables:

### Environment Variables

Add these to your `.env` file or environment:

```bash
# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://your-frontend-domain.com
CORS_ALLOW_ALL_ORIGINS=false
```

### For Development (Recommended)

If your frontend is running on `http://localhost:3000`:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_ALLOW_ALL_ORIGINS=false
```

### For Production/Testing (Quick Fix)

To allow requests from any origin (less secure but works for testing):

```bash
CORS_ALLOW_ALL_ORIGINS=true
```

## Configuration Options

### `CORS_ALLOWED_ORIGINS`
- **Type**: Comma-separated list of URLs
- **Default**: `http://localhost:3000,http://localhost:3001,https://localhost:3000,https://localhost:3001`
- **Description**: Specific origins that are allowed to make requests to the API
- **Example**: `http://localhost:3000,https://myapp.com,https://staging.myapp.com`

### `CORS_ALLOW_ALL_ORIGINS`
- **Type**: Boolean (true/false)
- **Default**: `false`
- **Description**: When `true`, allows requests from any origin (sets `Access-Control-Allow-Origin: *`)
- **Security Note**: Only use `true` for development/testing. In production, specify exact origins.

## Headers Included

The CORS configuration includes these headers:

- **Access-Control-Allow-Origin**: Configured based on your settings
- **Access-Control-Allow-Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With`
- **Access-Control-Allow-Credentials**: `true`
- **Access-Control-Max-Age**: `86400` (24 hours)

## How to Apply

1. **Update your `.env` file** with the CORS configuration
2. **Restart the backend server** for changes to take effect
3. **Test the API request** from your frontend

## Examples

### Development Setup
```bash
# .env file
CORS_ALLOWED_ORIGINS=http://localhost:3000
CORS_ALLOW_ALL_ORIGINS=false
```

### Multi-Environment Setup
```bash
# .env file
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://myapp.vercel.app,https://staging.myapp.com
CORS_ALLOW_ALL_ORIGINS=false
```

### Quick Testing (Allows All Origins)
```bash
# .env file
CORS_ALLOW_ALL_ORIGINS=true
```

## Troubleshooting

1. **Check browser console** for CORS error messages
2. **Verify the Origin header** in network requests matches your configuration
3. **Ensure the backend is restarted** after environment changes
4. **Test with a simple GET request** first (like `/health` endpoint)

## Security Best Practices

- **Never use `CORS_ALLOW_ALL_ORIGINS=true` in production**
- **Specify exact origins** in `CORS_ALLOWED_ORIGINS`
- **Use HTTPS** for production origins
- **Regularly review and update** allowed origins list 