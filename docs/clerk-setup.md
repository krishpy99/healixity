# Clerk Authentication Setup

This document explains how to set up Clerk authentication for the health dashboard backend.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Server Configuration
PORT=8080
ENVIRONMENT=development

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev

# Legacy JWT (can be removed after migration)
JWT_SECRET=your-secret-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_HEALTH=health-metrics
DYNAMODB_TABLE_DOCS=health-documents
S3_BUCKET=health-documents-bucket

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=health-documents
PINECONE_NAMESPACE=default
PINECONE_HOST=your-pinecone-host

# LLM Configuration
SONAR_API_KEY=your-sonar-api-key
LLM_PROVIDER=sonar
EMBEDDING_MODEL=text-embedding-ada-002
CHAT_MODEL=sonar
MAX_TOKENS=4096
TEMPERATURE=0.7

# Application Settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## Clerk Setup Steps

1. **Sign up for Clerk**: Go to [clerk.com](https://clerk.com) and create an account
2. **Create a new application**: Click "Add application" and choose your preferred sign-in methods
3. **Get your API keys**: 
   - Go to the "API Keys" section in your Clerk dashboard
   - Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - Copy the **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Note your **Frontend API URL** (looks like `https://verb-noun-00.clerk.accounts.dev`)

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/check` - Check authentication status (optional auth)
- `GET /api/auth/me` - Get current user profile (requires auth)
- `PUT /api/auth/profile` - Update user profile metadata (requires auth)
- `GET /api/auth/roles` - Get user roles (requires auth)
- `PUT /api/auth/roles` - Update user roles (requires auth, admin only)

### Protected Endpoints

All other API endpoints now require Clerk authentication:

- `/api/health/*` - Health metrics endpoints
- `/api/documents/*` - Document management endpoints
- `/api/chat/*` - Chat/AI endpoints
- `/api/dashboard/*` - Dashboard endpoints
- `/ws/chat` - WebSocket chat endpoint

## Frontend Integration

For the frontend, you'll need to:

1. Install Clerk React SDK: `npm install @clerk/clerk-react`
2. Wrap your app with `ClerkProvider`
3. Use `useAuth()` hook to get the session token
4. Send the token in the `Authorization: Bearer <token>` header

Example frontend setup:

```jsx
import { ClerkProvider, useAuth } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}>
      <YourApp />
    </ClerkProvider>
  );
}

function ApiCall() {
  const { getToken } = useAuth();
  
  const callAPI = async () => {
    const token = await getToken();
    const response = await fetch('/api/health/metrics', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };
}
```

## User Roles

User roles are stored in the user's public metadata. To assign roles:

1. Use the `/api/auth/roles` endpoint (admin only)
2. Or set roles directly in the Clerk dashboard under user metadata

Example role structure:
```json
{
  "roles": ["user", "admin"]
}
```

## Migration from JWT

The system maintains backward compatibility with existing handlers. The `GetUserID()`, `GetUserEmail()`, and `GetUserUsername()` functions still work, but now use Clerk's session claims instead of JWT tokens.

## Testing

You can test the authentication by:

1. Starting the server: `go run cmd/server/main.go`
2. Making a request to `/api/auth/check` (should return `authenticated: false`)
3. Setting up a frontend with Clerk and testing authenticated requests 