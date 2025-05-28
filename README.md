# Healixity: AI-Powered Personal Health Dashboard

## Description
Healixity is a comprehensive, full-stack application designed for personal health tracking, document management, and AI-powered health insights. It consists of a Next.js frontend dashboard for user interaction and a powerful Go-based backend engine that handles data processing, API services, and AI capabilities.

At the heart of its intelligent features, Healixity leverages the **Sonar API (from Perplexity AI)** to provide advanced AI chat functionalities, offering users personalized insights and answers based on their health data and uploaded documents. The system allows users to monitor various health metrics, securely store and manage health-related documents (PDFs, text files), and interact with an AI health assistant for a better understanding of their well-being.

**Core Components:**
*   **Dashboard (Frontend):** A user-friendly web interface built with Next.js, React, and TypeScript, allowing users to view their health data, manage documents, and interact with the AI chat.
*   **Engine (Backend):** A robust backend service built with Go, providing APIs for health data management, document processing (including PDF text extraction and vectorization for Retrieval Augmented Generation - RAG), real-time chat via WebSockets, and integration with various services like AWS DynamoDB (database), AWS S3 (file storage), and Pinecone (vector database). OpenAI models are utilized for tasks such as generating text embeddings.

This project aims to provide a secure, private, and intelligent platform for individuals to take control of their health information.

## Table of Contents
* [Features](#features)
* [Architecture Overview](#architecture-overview)
* [Installation](#installation)
    * [Prerequisites](#prerequisites)
    * [Backend (Engine) Setup](#backend-engine-setup)
    * [Frontend (Dashboard) Setup](#frontend-dashboard-setup)
* [Usage](#usage)
    * [Running the Application](#running-the-application)
    * [API Endpoints](#api-endpoints)
* [Documentation](#documentation)
* [Contributing](#contributing)
* [Testing](#testing)
* [Deployment](#deployment)
    * [Backend Deployment](#backend-deployment)
    * [Frontend Deployment](#frontend-deployment)
* [Built With](#built-with)
* [License](#license)
* [Support/Contact](#supportcontact)
* [Roadmap](#roadmap)

## Features
*   **Comprehensive Health Data Management**: Track a wide range of health metrics including blood pressure, heart rate, weight, blood glucose, cholesterol, sleep, exercise, and more.
*   **Secure Document Management**: Upload, store, and manage health-related documents like lab reports, prescriptions, and medical notes.
*   **AI-Powered Document Processing**: Automatic text extraction from PDF documents. Documents are chunked, vectorized (using OpenAI embedding models), and stored for efficient semantic search and RAG.
*   **Intelligent AI Health Assistant**:
    *   Leverages the **Sonar API (Perplexity AI)** for advanced chat completions, providing personalized insights.
    *   Answers questions based on your tracked health data and the content of your uploaded documents.
    *   Helps interpret health documents and trends.
*   **Dashboard Analytics**: View health summaries, trends, and visualizations to monitor progress over time.
*   **Real-time Chat Interface**: WebSocket-based chat for instant interaction with the AI assistant.
*   **Secure Authentication**: JWT-based authentication to protect user data.
*   **User Data Isolation**: Ensures that each user's data is kept private and secure.
*   **Test Mode**: Facilitates development and testing by bypassing authentication.

## Architecture Overview
The system is composed of two main parts:

1.  **Frontend Dashboard (`dashboard/`)**:
    *   Built with Next.js (React framework) and TypeScript.
    *   Provides the user interface for data input, visualization, document management, and AI chat.
    *   Communicates with the backend engine via HTTP REST APIs and WebSockets.

2.  **Backend Engine (`engine/`)**:
    *   Built with Go and the Gin web framework.
    *   Exposes RESTful APIs for all core functionalities.
    *   Manages WebSocket connections for real-time chat.
    *   Integrates with:
        *   **AWS DynamoDB**: For storing structured health data and document metadata.
        *   **AWS S3**: For storing uploaded document files.
        *   **Pinecone**: As a vector database for semantic search on document embeddings.
        *   **Sonar API (Perplexity AI)**: For generating intelligent responses in the AI chat.
        *   **OpenAI API**: For generating text embeddings from document content.
    *   Handles document processing, including text extraction from PDFs.

```
┌─────────────────┐      HTTP/WebSocket      ┌──────────────────┐
│   Dashboard     │ ◄─────────────────────► │   Health Engine  │
│ (Next.js/React) │                         │   (Go/Gin)       │
└─────────────────┘                         └──────────────────┘
        ▲                                             │ ▲
        │                                             │ │ REST API / WebSocket
        ▼                                             ▼ │
User Interaction                                External Services
                                                 (AWS, Pinecone,
                                                  Sonar API, OpenAI API)
```
For detailed API integration information, see [`docs/API_INTEGRATION.md`](./docs/API_INTEGRATION.md).

## Installation

### Prerequisites
*   Node.js and npm (or yarn/pnpm) for the frontend.
*   Go (version 1.21 or later) for the backend.
*   AWS Account (for DynamoDB and S3).
*   Pinecone Account (for vector database).
*   Sonar API Key (from Perplexity AI).
*   OpenAI API Key.
*   Docker (optional, for containerized deployment).

### Backend (Engine) Setup
(Refer to `engine/README.md` for more details)

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd healixity/engine
    ```
2.  **Install dependencies**:
    ```bash
    go mod download
    ```
3.  **Configure Environment Variables**:
    Create a `.env` file in the `engine/` directory. Populate it with your credentials and configuration details. See `engine/README.md` or `engine/env.tls.example` for required variables, including:
    *   `PORT`, `ENVIRONMENT`
    *   `TEST_MODE` (e.g., `false` for development with auth, `true` to bypass auth)
    *   `JWT_SECRET`
    *   AWS credentials (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
    *   DynamoDB details (`DYNAMODB_ENDPOINT`, table names)
    *   S3 details (`S3_BUCKET`, `S3_REGION`)
    *   Pinecone details (`PINECONE_API_KEY`, `PINECONE_INDEX_NAME`)
    *   **`SONAR_API_KEY` (Your Perplexity AI Sonar API Key)**
    *   OpenAI details (`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`)
    *   TLS settings (if enabling HTTPS)

4.  **Set up AWS Resources**:
    *   Create DynamoDB tables for health data and documents.
    *   Create an S3 bucket for document storage.
    *   Configure IAM permissions for DynamoDB and S3 access.

5.  **Set up Pinecone**:
    *   Create a Pinecone index (e.g., with 3072 dimensions if using OpenAI's `text-embedding-3-large`).

6.  **Build and Run**:
    ```bash
    go build -o health-dashboard-backend ./cmd/server
    ./health-dashboard-backend
    ```
    Or for development with hot-reloading (if `air` is installed):
    ```bash
    air
    ```

### Frontend (Dashboard) Setup
(Refer to `dashboard/README.md` for more details)

1.  **Navigate to the dashboard directory**:
    ```bash
    cd ../dashboard
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment Variables**:
    Create a `.env.local` file in the `dashboard/` directory.
    ```env
    # Backend API URL
    NEXT_PUBLIC_API_URL=http://localhost:8080 # Or your backend's URL if different (e.g., with TLS)
    # WebSocket URL
    NEXT_PUBLIC_WS_URL=ws://localhost:8080 # Or your backend's WebSocket URL
    # Test mode (should match backend's TEST_MODE for consistent behavior if auth is involved)
    NEXT_PUBLIC_TEST_MODE=true
    ```
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Running the Application
1.  Start the backend server (in the `engine/` directory).
2.  Start the frontend development server (in the `dashboard/` directory).
3.  Access the dashboard through your browser (typically `http://localhost:3000`).

### API Endpoints
The backend exposes a comprehensive set of API endpoints for various functionalities. Key categories include:

*   **Health Data Management**: `POST /api/health/metrics`, `GET /api/health/metrics/:type`, `GET /api/health/latest`, etc.
*   **Dashboard Analytics**: `GET /api/dashboard/summary`, `GET /api/dashboard/trends`, `GET /api/dashboard/overview`.
*   **Document Management**: `POST /api/documents/upload`, `GET /api/documents`, `POST /api/documents/:id/process`, etc.
*   **AI Chat**: `POST /api/chat`, `GET /api/chat/history`, WebSocket at `/ws/chat`.
*   **Authentication**: `GET /api/auth/check`, `GET /api/auth/me`, etc.

For a detailed list of integrated API endpoints, refer to [`docs/API_INTEGRATION.md`](./docs/API_INTEGRATION.md) and the backend's `engine/README.md`.

## Documentation
This repository contains several documents in the `docs/` directory that provide more specific information:
*   [`docs/API_INTEGRATION.md`](./docs/API_INTEGRATION.md): Detailed overview of frontend-backend API integration.
*   [`docs/BLOOD_PRESSURE_IMPLEMENTATION.md`](./docs/BLOOD_PRESSURE_IMPLEMENTATION.md): Specifics on blood pressure metric handling.
*   [`docs/RELOAD_FUNCTIONALITY.md`](./docs/RELOAD_FUNCTIONALITY.md): Details on metric card reload functionality.
*   [`docs/tls-setup.md`](./docs/tls-setup.md): Guide for setting up TLS/HTTPS for the backend.
*   [`docs/test-mode.md`](./docs/test-mode.md): Information on the backend's test mode.
*   [`engine/README.md`](./engine/README.md): Comprehensive README for the backend engine.
*   [`dashboard/README.md`](./dashboard/README.md): README for the frontend dashboard.

## Contributing
Contributions are welcome! Please follow these general guidelines:
1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Add tests for your changes if applicable.
5.  Ensure all tests pass.
6.  Submit a pull request with a clear description of your changes.

Refer to the `engine/README.md` for any backend-specific contribution guidelines.

## Testing

### Backend (Engine)
Navigate to the `engine/` directory:
```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...
```
The backend also supports a "Test Mode" (configurable via `TEST_MODE` env var) to bypass authentication for easier API testing during development. See `docs/test-mode.md`.

### Frontend (Dashboard)
Navigate to the `dashboard/` directory:
```bash
# Run linter
npm run lint
```
End-to-end testing and component tests can be added using standard React/Next.js testing libraries.

## Deployment

### Backend Deployment
(Refer to `engine/README.md` for more details)
*   **Docker**: A Dockerfile is provided in `engine/` for building a containerized version of the backend.
    ```bash
    # In engine/ directory
    docker build -t health-dashboard-backend .
    docker run -p 8080:8080 --env-file .env health-dashboard-backend
    ```
*   **Cloud Platforms**: The backend is designed to be deployable on various cloud platforms like AWS (ECS/Fargate), Google Cloud (Cloud Run/GKE), or Azure (Container Instances/AKS).

### Frontend Deployment
(Refer to `dashboard/README.md` for more details)
*   **Build for Production**:
    ```bash
    # In dashboard/ directory
    npm run build
    ```
    This creates an optimized production build in the `.next` folder.
*   **Hosting**: The Next.js application can be deployed to platforms like Vercel (recommended by Next.js creators), Netlify, AWS Amplify, or self-hosted on a Node.js server.

## Built With

**Backend (Engine):**
*   **Language**: Go (Golang)
*   **Web Framework**: Gin
*   **Database**: AWS DynamoDB
*   **File Storage**: AWS S3
*   **Vector Database**: Pinecone
*   **AI Chat Completions**: **Sonar API (Perplexity AI)**
*   **Text Embeddings**: OpenAI API (e.g., `text-embedding-ada-002`)
*   **Real-time Communication**: Gorilla WebSocket
*   **Authentication**: JWT
*   **PDF Processing**: `ledongthuc/pdf` (or similar Go library)

**Frontend (Dashboard):**
*   **Framework**: Next.js
*   **Language**: TypeScript
*   **UI Library**: React
*   **Styling**: Tailwind CSS
*   **Charting**: Chart.js, ApexCharts (via react-apexcharts, react-chartjs-2)
*   **UI Components**: Radix UI, Lucide Icons

**Development & Operations:**
*   Docker

## License
This project is licensed under the MIT License. See the `LICENSE` file (if one exists in the root or `engine/` directory) for details. The `engine/README.md` mentions an MIT License.

## Support/Contact
For support, questions, or to report issues, please create an issue in this GitHub repository.

## Roadmap
Based on `docs/API_INTEGRATION.md`, potential future enhancements include:

**Planned Frontend/System Features:**
*   Offline Support (Service worker for offline functionality)
*   Push Notifications (Real-time health alerts)
*   Data Export (Export health data in various formats)
*   Advanced Analytics (More sophisticated machine learning insights)
*   Multi-user Support (e.g., family health tracking)

**Planned Backend/API Extensions:**
*   Batch Operations (Bulk data operations)
*   Real-time Subscriptions (Beyond chat, for other data streams via WebSocket)
*   Advanced Search (More comprehensive full-text search across all data types)
*   Data Sync (Multi-device synchronization)

---
Built with ❤️ for better health management.
