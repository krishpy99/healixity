package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/utils"
)

// HealthHandler handles health data endpoints
type HealthHandler struct {
	healthService *services.HealthService
	logger        *zap.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(healthService *services.HealthService, logger *zap.Logger) *HealthHandler {
	return &HealthHandler{
		healthService: healthService,
		logger:        logger,
	}
}

// AddHealthData handles POST /api/health/metrics
func (h *HealthHandler) AddHealthData(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var input models.HealthMetricInput
	if err := c.ShouldBindJSON(&input); err != nil {
		h.logger.Error("Failed to bind health metric input", zap.Error(err))
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input format")
		return
	}

	// Validate input
	if err := h.healthService.ValidateHealthData(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Add health data
	metric, err := h.healthService.AddHealthData(userID, &input)
	if err != nil {
		h.logger.Error("Failed to add health data",
			zap.String("user_id", userID),
			zap.String("metric_type", input.Type),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save health data")
		return
	}

	h.logger.Info("Health data added successfully",
		zap.String("user_id", userID),
		zap.String("metric_type", metric.Type),
		zap.Float64("value", metric.Value))

	utils.SuccessResponse(c, http.StatusCreated, "Health data saved successfully", metric)
}

// GetMetricHistory handles GET /api/health/metrics/:type
func (h *HealthHandler) GetMetricHistory(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	metricType := c.Param("type")
	if metricType == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Metric type is required")
		return
	}

	// Parse query parameters
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	limitStr := c.Query("limit")

	var startTime, endTime time.Time
	var limit int
	var err error

	// Parse start time
	if startTimeStr != "" {
		startTime, err = time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start_time format. Use RFC3339 format")
			return
		}
	}

	// Parse end time
	if endTimeStr != "" {
		endTime, err = time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end_time format. Use RFC3339 format")
			return
		}
	} else {
		endTime = time.Now()
	}

	// Parse limit
	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit < 0 {
			utils.ErrorResponse(c, http.StatusBadRequest, "Invalid limit value")
			return
		}
	}

	// Get metric history
	metrics, err := h.healthService.GetMetricHistory(userID, metricType, startTime, endTime, limit)
	if err != nil {
		h.logger.Error("Failed to get metric history",
			zap.String("user_id", userID),
			zap.String("metric_type", metricType),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve metric history")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Metric history retrieved successfully", gin.H{
		"metric_type": metricType,
		"count":       len(metrics),
		"metrics":     metrics,
	})
}

// GetLatestMetrics handles GET /api/health/latest
func (h *HealthHandler) GetLatestMetrics(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get latest metrics
	latestMetrics, err := h.healthService.GetLatestMetrics(userID)
	if err != nil {
		h.logger.Error("Failed to get latest metrics",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve latest metrics")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Latest metrics retrieved successfully", gin.H{
		"metrics": latestMetrics,
		"count":   len(latestMetrics),
	})
}

// GetHealthSummary handles GET /api/health/summary
func (h *HealthHandler) GetHealthSummary(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get health summary
	summary, err := h.healthService.GetHealthSummary(userID)
	if err != nil {
		h.logger.Error("Failed to get health summary",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve health summary")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Health summary retrieved successfully", summary)
}

// GetHealthTrends handles GET /api/health/trends
func (h *HealthHandler) GetHealthTrends(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse query parameters
	period := c.DefaultQuery("period", "month")
	metricTypesParam := c.Query("metric_types")

	var metricTypes []string
	if metricTypesParam != "" {
		// Parse comma-separated metric types
		// In a real implementation, you might want to use a more robust parsing method
		metricTypes = []string{metricTypesParam} // Simplified for now
	} else {
		// Default to common metrics
		metricTypes = []string{
			"blood_pressure_systolic",
			"blood_pressure_diastolic",
			"heart_rate",
			"weight",
			"blood_glucose",
		}
	}

	// Get health trends
	trends, err := h.healthService.GetHealthTrends(userID, metricTypes, period)
	if err != nil {
		h.logger.Error("Failed to get health trends",
			zap.String("user_id", userID),
			zap.String("period", period),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve health trends")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Health trends retrieved successfully", gin.H{
		"period": period,
		"trends": trends,
		"count":  len(trends),
	})
}

// GetSupportedMetrics handles GET /api/health/supported-metrics
func (h *HealthHandler) GetSupportedMetrics(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, "Supported metrics retrieved successfully", gin.H{
		"metrics": models.SupportedMetrics,
		"count":   len(models.SupportedMetrics),
	})
}

// DeleteHealthData handles DELETE /api/health/metrics/:type/:timestamp
func (h *HealthHandler) DeleteHealthData(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	metricType := c.Param("type")
	timestampStr := c.Param("timestamp")

	if metricType == "" || timestampStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Metric type and timestamp are required")
		return
	}

	// Parse timestamp
	_, err := time.Parse(time.RFC3339, timestampStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid timestamp format. Use RFC3339 format")
		return
	}

	// TODO: Implement delete functionality in health service
	// For now, return not implemented
	utils.ErrorResponse(c, http.StatusNotImplemented, "Delete functionality not yet implemented")
}

// ValidateHealthInput handles POST /api/health/validate
func (h *HealthHandler) ValidateHealthInput(c *gin.Context) {
	var input models.HealthMetricInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid input format")
		return
	}

	// Validate input
	if err := h.healthService.ValidateHealthData(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Health data is valid", gin.H{
		"valid":       true,
		"metric_type": input.Type,
		"value":       input.Value,
		"unit":        input.Unit,
	})
}
