# Health Dashboard Backend

A comprehensive health tracking backend with AI-powered insights built in Go. This backend provides APIs for health data management, document processing with AI, and intelligent chat interactions for personalized health guidance.

## Features

- **Health Data Management**: Track various health metrics (blood pressure, heart rate, weight, glucose, etc.)
- **Document Processing**: Upload and process health documents (PDFs, text files) with AI-powered text extraction
- **AI-Powered Chat**: Intelligent health assistant that provides personalized insights based on your health data and documents
- **Dashboard Analytics**: Comprehensive health summaries, trends, and visualizations
- **Secure Authentication**: JWT-based authentication with middleware protection
- **Vector Search**: RAG (Retrieval-Augmented Generation) capabilities for document-based Q&A
- **Real-time WebSocket**: Live chat functionality with typing indicators

## Architecture

### Tech Stack

- **Backend**: Go 1.21+
- **Web Framework**: Gin
- **Database**: DynamoDB
- **File Storage**: AWS S3
- **Vector Database**: Pinecone
- **AI/LLM**: OpenAI GPT models
- **Authentication**: JWT tokens
- **WebSockets**: Gorilla WebSocket
- **PDF Processing**: Unidoc library

### Project Structure

```
engine/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go              # Configuration management
│   ├── database/
│   │   └── dynamodb.go            # DynamoDB client and operations
│   ├── handlers/
│   │   ├── health_handler.go      # Health data API handlers
│   │   ├── dashboard_handler.go   # Dashboard analytics handlers
│   │   ├── document_handler.go    # Document management handlers
│   │   └── chat_handler.go        # Chat and WebSocket handlers
│   ├── middleware/
│   │   ├── auth.go                # JWT authentication middleware
│   │   ├── cors.go                # CORS configuration
│   │   └── logging.go             # Request logging middleware
│   ├── models/
│   │   ├── health.go              # Health data models
│   │   ├── document.go            # Document models
│   │   └── chat.go                # Chat and AI models
│   ├── services/
│   │   ├── health_service.go      # Health data business logic
│   │   ├── document_service.go    # Document processing service
│   │   ├── rag_service.go         # RAG and vector operations
│   │   └── ai_agent.go            # AI chat orchestration
│   ├── storage/
│   │   └── s3.go                  # S3 file storage client
│   ├── utils/
│   │   └── response.go            # Standardized API responses
│   └── vectordb/
│       └── pinecone.go            # Pinecone vector database client
├── pkg/
│   ├── ai/
│   │   └── llm_client.go          # OpenAI LLM client
│   └── fileprocessor/
│       └── processor.go           # PDF and text processing
├── go.mod                         # Go modules
├── go.sum                         # Go modules checksums
└── README.md                      # This file
```

## Setup

### Prerequisites

- Go 1.21 or later
- AWS Account (for DynamoDB and S3)
- Pinecone Account (for vector database)
- OpenAI API Key (for AI features)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8080
ENVIRONMENT=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# DynamoDB Configuration
DYNAMODB_ENDPOINT=https://dynamodb.us-east-1.amazonaws.com
DYNAMODB_HEALTH_TABLE=health_data
DYNAMODB_DOCUMENTS_TABLE=health_documents

# S3 Configuration
S3_BUCKET=your-health-documents-bucket
S3_REGION=us-east-1

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=health-docs-index
PINECONE_NAMESPACE=default

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# File Processing Configuration
MAX_FILE_SIZE=52428800  # 50MB in bytes
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pfhealth/engine
   ```

2. **Install dependencies**:
   ```bash
   go mod download
   ```

3. **Set up AWS resources**:
   - Create DynamoDB tables for health data and documents
   - Create an S3 bucket for document storage
   - Configure IAM permissions for DynamoDB and S3 access

4. **Set up Pinecone**:
   - Create a Pinecone index with 1536 dimensions (for OpenAI embeddings)
   - Note your API key and index name

5. **Configure environment variables**:
   - Copy the example above and fill in your actual values

6. **Build and run**:
   ```bash
   go build -o health-dashboard-backend ./cmd/server
   ./health-dashboard-backend
   ```

## API Endpoints

### Health Data Management

- `POST /api/health/data` - Add health data
- `GET /api/health/data` - Get health data with filtering
- `GET /api/health/latest` - Get latest metrics for each type
- `GET /api/health/trends` - Get health trends and analytics

### Dashboard

- `GET /api/dashboard/overview` - Get dashboard overview
- `GET /api/dashboard/summary` - Get health summary
- `GET /api/dashboard/trends` - Get trend analysis

### Document Management

- `POST /api/documents/upload` - Upload health documents
- `GET /api/documents` - List user documents
- `GET /api/documents/:id` - Get specific document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/process` - Process document for text extraction
- `GET /api/documents/search` - Search documents using vector similarity

### AI Chat

- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history` - Get chat history
- `GET /ws/chat` - WebSocket endpoint for real-time chat

### Health Metrics Supported

The system supports tracking various health metrics:

- Blood Pressure (Systolic/Diastolic)
- Heart Rate
- Weight
- Blood Glucose
- Cholesterol (Total, LDL, HDL)
- Body Temperature
- BMI
- Blood Oxygen Saturation
- Sleep Hours
- Exercise Duration
- Medication Adherence

## AI Features

### Health Assistant

The AI assistant can:
- Answer questions about your health data
- Provide insights based on trends in your metrics
- Help interpret health documents
- Give personalized health recommendations
- Analyze patterns across different data sources

### Document Processing

- **PDF Processing**: Extract text from health reports, lab results, prescriptions
- **Text Chunking**: Break documents into searchable chunks
- **Vector Embeddings**: Create semantic embeddings for advanced search
- **RAG System**: Retrieve relevant document sections to answer questions

### Query Types Supported

- **Health Queries**: "What's my average blood pressure this month?"
- **Document Queries**: "What did my lab results say about cholesterol?"
- **Trend Analysis**: "How has my weight changed over time?"
- **Recommendations**: "What should I focus on to improve my health?"

## Security

- **JWT Authentication**: All endpoints require valid JWT tokens
- **User Isolation**: Data is strictly isolated per user
- **CORS Configuration**: Configurable CORS policies
- **Request Logging**: Comprehensive request/response logging
- **Input Validation**: Strict validation of all inputs

## Monitoring

The backend includes built-in monitoring:
- Structured logging with Zap
- Request/response logging middleware
- Error tracking and reporting
- Performance metrics

## Development

### Running in Development

```bash
# Install air for hot reloading (optional)
go install github.com/cosmtrek/air@latest

# Run with hot reloading
air

# Or run directly
go run ./cmd/server/main.go
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific package tests
go test ./internal/services/...
```

### Building for Production

```bash
# Build optimized binary
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o health-dashboard-backend ./cmd/server

# Build Docker image
docker build -t health-dashboard-backend .
```

## Deployment

### Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM golang:1.21-alpine AS builder
   WORKDIR /app
   COPY go.mod go.sum ./
   RUN go mod download
   COPY . .
   RUN CGO_ENABLED=0 GOOS=linux go build -o health-dashboard-backend ./cmd/server

   FROM alpine:latest
   RUN apk --no-cache add ca-certificates
   WORKDIR /root/
   COPY --from=builder /app/health-dashboard-backend .
   EXPOSE 8080
   CMD ["./health-dashboard-backend"]
   ```

2. **Build and run**:
   ```bash
   docker build -t health-dashboard-backend .
   docker run -p 8080:8080 --env-file .env health-dashboard-backend
   ```

### Cloud Deployment

The backend is designed to run on various cloud platforms:

- **AWS**: Use ECS/Fargate with Application Load Balancer
- **Google Cloud**: Deploy on Cloud Run or GKE
- **Azure**: Use Container Instances or AKS
- **Kubernetes**: Use the provided manifests

## Configuration

### Health Metrics Configuration

Each health metric has configurable:
- Normal ranges
- Units of measurement
- Validation rules
- Trend analysis parameters

### AI Configuration

Customize AI behavior:
- Model selection (GPT-3.5, GPT-4)
- Temperature settings
- Token limits
- Prompt templates

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify AWS credentials and DynamoDB table names
   - Check IAM permissions

2. **S3 Upload Failures**:
   - Confirm S3 bucket exists and is accessible
   - Verify file size limits

3. **Pinecone Connection Issues**:
   - Validate API key and index name
   - Ensure index dimensions match embedding model

4. **OpenAI API Errors**:
   - Check API key validity
   - Monitor rate limits

### Logging

Logs are structured and include:
- Request IDs for tracing
- User IDs for debugging
- Performance metrics
- Error details with stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For support or questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

Built with ❤️ for better health management 