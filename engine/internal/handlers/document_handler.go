package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/utils"
)

// DocumentHandler handles document endpoints
type DocumentHandler struct {
	documentService *services.DocumentService
	ragService      *services.RAGService
	logger          *zap.Logger
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(documentService *services.DocumentService, ragService *services.RAGService, logger *zap.Logger) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
		ragService:      ragService,
		logger:          logger,
	}
}

// UploadDocument handles POST /api/documents/upload
func (d *DocumentHandler) UploadDocument(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB
	if err != nil {
		d.logger.Error("Failed to parse multipart form", zap.Error(err))
		utils.ErrorResponse(c, http.StatusBadRequest, "Failed to parse upload form")
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file provided")
		return
	}

	// Parse document metadata
	var request models.DocumentUploadRequest
	request.Title = c.PostForm("title")
	request.Category = c.PostForm("category")
	request.Description = c.PostForm("description")

	// Validate required fields
	if request.Title == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Title is required")
		return
	}

	// Upload document
	response, err := d.documentService.UploadDocument(userID, file, &request)
	if err != nil {
		d.logger.Error("Failed to upload document",
			zap.String("user_id", userID),
			zap.String("filename", file.Filename),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to upload document")
		return
	}

	d.logger.Info("Document uploaded successfully",
		zap.String("user_id", userID),
		zap.String("document_id", response.Document.DocumentID),
		zap.String("filename", file.Filename))

	utils.SuccessResponse(c, http.StatusCreated, "Document uploaded successfully", response)
}

// ListDocuments handles GET /api/documents
func (d *DocumentHandler) ListDocuments(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "20")
	cursor := c.Query("cursor")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid limit parameter (1-100)")
		return
	}

	// Get user documents
	response, err := d.documentService.GetUserDocuments(userID, limit, cursor)
	if err != nil {
		d.logger.Error("Failed to get user documents",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve documents")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Documents retrieved successfully", response)
}

// GetDocument handles GET /api/documents/:id
func (d *DocumentHandler) GetDocument(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	documentID := c.Param("id")
	if documentID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Document ID is required")
		return
	}

	// Get document
	document, err := d.documentService.GetDocument(userID, documentID)
	if err != nil {
		d.logger.Error("Failed to get document",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusNotFound, "Document not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Document retrieved successfully", document)
}

// DeleteDocument handles DELETE /api/documents/:id
func (d *DocumentHandler) DeleteDocument(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	documentID := c.Param("id")
	if documentID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Document ID is required")
		return
	}

	// Delete document vectors from vector database first
	if err := d.ragService.DeleteDocumentVectors(c.Request.Context(), userID, documentID); err != nil {
		d.logger.Warn("Failed to delete document vectors",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		// Continue with document deletion even if vector deletion fails
	}

	// Delete document
	if err := d.documentService.DeleteDocument(userID, documentID); err != nil {
		d.logger.Error("Failed to delete document",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete document")
		return
	}

	d.logger.Info("Document deleted successfully",
		zap.String("user_id", userID),
		zap.String("document_id", documentID))

	utils.SuccessResponse(c, http.StatusOK, "Document deleted successfully", gin.H{
		"document_id": documentID,
		"deleted":     true,
	})
}

// ProcessDocument handles POST /api/documents/:id/process
func (d *DocumentHandler) ProcessDocument(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	documentID := c.Param("id")
	if documentID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Document ID is required")
		return
	}

	// Process document (extract text and create embeddings)
	if err := d.documentService.ProcessDocument(userID, documentID); err != nil {
		d.logger.Error("Failed to process document",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to process document")
		return
	}

	d.logger.Info("Document processing started",
		zap.String("user_id", userID),
		zap.String("document_id", documentID))

	utils.SuccessResponse(c, http.StatusAccepted, "Document processing started", gin.H{
		"document_id": documentID,
		"status":      "processing",
	})
}

// SearchDocuments handles GET /api/documents/search
func (d *DocumentHandler) SearchDocuments(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	query := c.Query("q")
	if query == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Search query is required")
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid limit parameter (1-50)")
		return
	}

	// Search documents using RAG service
	sources, err := d.ragService.SearchDocuments(c.Request.Context(), userID, query, limit)
	if err != nil {
		d.logger.Error("Failed to search documents",
			zap.String("user_id", userID),
			zap.String("query", query),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to search documents")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Document search completed", gin.H{
		"query":   query,
		"results": sources,
		"count":   len(sources),
	})
}

// GetDocumentViewURL handles GET /api/documents/:id/view
func (d *DocumentHandler) GetDocumentViewURL(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	documentID := c.Param("id")
	if documentID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Document ID is required")
		return
	}

	// Get document to verify ownership and get S3 key
	document, err := d.documentService.GetDocument(userID, documentID)
	if err != nil {
		d.logger.Error("Failed to get document for viewing",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusNotFound, "Document not found")
		return
	}

	// Generate presigned URL for viewing (valid for 1 hour)
	viewURL, err := d.documentService.GetDocumentViewURL(userID, documentID, 60)
	if err != nil {
		d.logger.Error("Failed to generate document view URL",
			zap.String("user_id", userID),
			zap.String("document_id", documentID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate view URL")
		return
	}

	d.logger.Info("Document view URL generated",
		zap.String("user_id", userID),
		zap.String("document_id", documentID),
		zap.String("content_type", document.ContentType))

	utils.SuccessResponse(c, http.StatusOK, "Document view URL generated successfully", gin.H{
		"document_id":  documentID,
		"view_url":     viewURL,
		"content_type": document.ContentType,
		"file_name":    document.FileName,
		"title":        document.Title,
		"expires_in":   3600, // 1 hour in seconds
	})
}
