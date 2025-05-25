package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"health-dashboard-backend/internal/middleware"
	"health-dashboard-backend/internal/models"
	"health-dashboard-backend/internal/services"
	"health-dashboard-backend/internal/utils"
)

// DashboardHandler handles dashboard summary endpoints
type DashboardHandler struct {
	healthService *services.HealthService
	logger        *zap.Logger
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(healthService *services.HealthService, logger *zap.Logger) *DashboardHandler {
	return &DashboardHandler{
		healthService: healthService,
		logger:        logger,
	}
}

// GetSummary handles GET /api/dashboard/summary
func (d *DashboardHandler) GetSummary(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get health summary
	summary, err := d.healthService.GetHealthSummary(userID)
	if err != nil {
		d.logger.Error("Failed to get health summary for dashboard",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve dashboard summary")
		return
	}

	// Calculate additional dashboard metrics
	dashboardData := d.enrichSummaryData(summary)

	d.logger.Info("Dashboard summary retrieved",
		zap.String("user_id", userID),
		zap.Int("metrics_count", len(summary.Metrics)))

	utils.SuccessResponse(c, http.StatusOK, "Dashboard summary retrieved successfully", dashboardData)
}

// GetTrends handles GET /api/dashboard/trends
func (d *DashboardHandler) GetTrends(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Parse query parameters
	period := c.DefaultQuery("period", "month")
	metricTypesParam := c.Query("metric_types")

	// Parse metric types
	var metricTypes []string
	if metricTypesParam != "" {
		metricTypes = strings.Split(metricTypesParam, ",")
		// Trim whitespace from each metric type
		for i, mt := range metricTypes {
			metricTypes[i] = strings.TrimSpace(mt)
		}
	} else {
		// Default to key health metrics for dashboard (excluding blood pressure for graphing)
		metricTypes = []string{
			"heart_rate",
			"weight",
			"blood_glucose",
		}
	}

	// Get health trends
	trends, err := d.healthService.GetHealthTrends(userID, metricTypes, period)
	if err != nil {
		d.logger.Error("Failed to get health trends for dashboard",
			zap.String("user_id", userID),
			zap.String("period", period),
			zap.Strings("metric_types", metricTypes),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve dashboard trends")
		return
	}

	// Enrich trends data for dashboard
	dashboardTrends := d.enrichTrendsData(trends)

	d.logger.Info("Dashboard trends retrieved",
		zap.String("user_id", userID),
		zap.String("period", period),
		zap.Int("trends_count", len(trends)))

	utils.SuccessResponse(c, http.StatusOK, "Dashboard trends retrieved successfully", gin.H{
		"period": period,
		"trends": dashboardTrends,
		"count":  len(trends),
	})
}

// GetOverview handles GET /api/dashboard/overview
func (d *DashboardHandler) GetOverview(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get health summary
	summary, err := d.healthService.GetHealthSummary(userID)
	if err != nil {
		d.logger.Error("Failed to get health summary for overview",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve dashboard overview")
		return
	}

	// Get recent trends (last 30 days)
	recentTrends, err := d.healthService.GetHealthTrends(userID, []string{
		"heart_rate",
		"weight",
	}, "month")
	if err != nil {
		d.logger.Warn("Failed to get recent trends for overview",
			zap.String("user_id", userID),
			zap.Error(err))
		// Continue without trends data
		recentTrends = []models.HealthTrend{}
	}

	// Create overview data
	overview := gin.H{
		"summary":         d.enrichSummaryData(summary),
		"recent_trends":   recentTrends,
		"health_score":    d.calculateHealthScore(summary),
		"recommendations": d.generateRecommendations(summary),
		"alerts":          d.checkHealthAlerts(summary),
	}

	utils.SuccessResponse(c, http.StatusOK, "Dashboard overview retrieved successfully", overview)
}

// enrichSummaryData adds additional information to summary data
func (d *DashboardHandler) enrichSummaryData(summary interface{}) gin.H {
	// Type assertion to work with the summary
	// In a real implementation, you'd have proper type handling
	return gin.H{
		"summary": summary,
		"status":  "healthy", // Placeholder
		"last_updated": gin.H{
			"formatted": "Today",
		},
	}
}

// enrichTrendsData adds dashboard-specific information to trends
func (d *DashboardHandler) enrichTrendsData(trends interface{}) interface{} {
	// Add dashboard-specific enrichment here
	// For now, return trends as-is
	return trends
}

// calculateHealthScore calculates an overall health score
func (d *DashboardHandler) calculateHealthScore(summary interface{}) gin.H {
	// Placeholder implementation
	return gin.H{
		"score":       85,
		"category":    "Good",
		"description": "Your health metrics are generally within normal ranges",
	}
}

// generateRecommendations generates health recommendations
func (d *DashboardHandler) generateRecommendations(summary interface{}) []gin.H {
	// Placeholder implementation
	return []gin.H{
		{
			"type":        "exercise",
			"title":       "Stay Active",
			"description": "Aim for 30 minutes of moderate exercise daily",
			"priority":    "medium",
		},
		{
			"type":        "nutrition",
			"title":       "Monitor Blood Pressure",
			"description": "Keep tracking your blood pressure regularly",
			"priority":    "high",
		},
	}
}

// checkHealthAlerts checks for any health alerts
func (d *DashboardHandler) checkHealthAlerts(summary interface{}) []gin.H {
	// Placeholder implementation - would analyze metrics for concerning values
	return []gin.H{
		// No alerts in this example
	}
}

// GetInsights handles GET /api/dashboard/insights
func (d *DashboardHandler) GetInsights(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	// Get health summary for insights
	summary, err := d.healthService.GetHealthSummary(userID)
	if err != nil {
		d.logger.Error("Failed to get health summary for insights",
			zap.String("user_id", userID),
			zap.Error(err))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve health insights")
		return
	}

	// Generate insights
	insights := d.generateInsights(summary)

	utils.SuccessResponse(c, http.StatusOK, "Health insights retrieved successfully", gin.H{
		"insights": insights,
		"count":    len(insights),
	})
}

// generateInsights generates personalized health insights
func (d *DashboardHandler) generateInsights(summary interface{}) []gin.H {
	// Placeholder implementation
	return []gin.H{
		{
			"type":        "trend",
			"title":       "Blood Pressure Trend",
			"description": "Your blood pressure has been stable over the past month",
			"confidence":  "high",
			"action":      "continue_monitoring",
		},
		{
			"type":        "pattern",
			"title":       "Weight Pattern",
			"description": "You've been consistently tracking your weight",
			"confidence":  "medium",
			"action":      "maintain_routine",
		},
	}
}
