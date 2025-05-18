# Vitality Engine

A FastAPI backend for PFHealth that provides API endpoints for metrics, recovery charts, chat messages, and documents.

## Project Structure

```
vitality-engine/
├── app/                # Application package
│   ├── api/            # API endpoints
│   │   └── v1/         # API version 1
│   │       └── endpoints/  # Route modules
│   ├── core/           # Core application settings
│   ├── db/             # Database models and setup
│   ├── models/         # Pydantic models
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── main.py             # Application entry point
├── requirements.txt    # Project dependencies
└── README.md           # Project documentation
```

## Getting Started

1. Create and activate a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the server:
   ```
   python main.py
   ```

The API will be available at http://localhost:8000

## API Endpoints

- `/api/v1/metrics` - Get user health metrics
- `/api/v1/recovery/chart` - Get recovery progress chart data
- `/api/v1/chat-messages` - Get and create chat messages
- `/api/v1/documents` - Get and create documents

## API Documentation

FastAPI automatically generates API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc 