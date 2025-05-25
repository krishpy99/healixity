package services

import (
	"fmt"
	"time"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/database"
	"health-dashboard-backend/internal/models"
)

// HealthService handles health data operations
type HealthService struct {
	db  *database.DynamoDBClient
	cfg *config.Config
}

// NewHealthService creates a new health service
func NewHealthService(db *database.DynamoDBClient, cfg *config.Config) *HealthService {
	return &HealthService{
		db:  db,
		cfg: cfg,
	}
}

// AddHealthData adds a new health metric
func (h *HealthService) AddHealthData(userID string, input *models.HealthMetricInput) (*models.HealthMetric, error) {
	// Validate metric type
	metricInfo, exists := models.SupportedMetrics[input.Type]
	if !exists {
		return nil, fmt.Errorf("unsupported metric type: %s", input.Type)
	}

	// Create health metric
	metric := &models.HealthMetric{
		UserID:    userID,
		Timestamp: time.Now(),
		Type:      input.Type,
		Value:     input.Value,
		Unit:      input.Unit,
		Notes:     input.Notes,
		Source:    input.Source,
	}

	// Validate unit matches expected unit
	if metricInfo.Unit != "" && input.Unit != metricInfo.Unit {
		return nil, fmt.Errorf("invalid unit for %s. Expected: %s, got: %s",
			input.Type, metricInfo.Unit, input.Unit)
	}

	fmt.Println("metricInfo", metricInfo)

	// Store in database
	if err := h.db.PutHealthMetric(metric); err != nil {
		fmt.Println("err", err)
		return nil, fmt.Errorf("failed to store health metric: %w", err)
	}

	return metric, nil
}

// AddBloodPressureData adds blood pressure data with both systolic and diastolic values
func (h *HealthService) AddBloodPressureData(userID string, input *models.BloodPressureInput) ([]*models.HealthMetric, error) {
	// Validate blood pressure input
	if input.Type != "blood_pressure" {
		return nil, fmt.Errorf("invalid type for blood pressure input: %s", input.Type)
	}

	if input.Unit != "mmHg" {
		return nil, fmt.Errorf("invalid unit for blood pressure. Expected: mmHg, got: %s", input.Unit)
	}

	// Validate systolic and diastolic values
	if err := h.validateValueRange("blood_pressure_systolic", input.Systolic); err != nil {
		return nil, fmt.Errorf("invalid systolic value: %w", err)
	}

	if err := h.validateValueRange("blood_pressure_diastolic", input.Diastolic); err != nil {
		return nil, fmt.Errorf("invalid diastolic value: %w", err)
	}

	// Validate that systolic > diastolic
	if input.Systolic <= input.Diastolic {
		return nil, fmt.Errorf("systolic pressure must be greater than diastolic pressure")
	}

	timestamp := time.Now()

	// Create systolic metric
	systolicMetric := &models.HealthMetric{
		UserID:    userID,
		Timestamp: timestamp,
		Type:      "blood_pressure_systolic",
		Value:     input.Systolic,
		Unit:      input.Unit,
		Notes:     input.Notes,
		Source:    input.Source,
	}

	// Create diastolic metric
	diastolicMetric := &models.HealthMetric{
		UserID:    userID,
		Timestamp: timestamp,
		Type:      "blood_pressure_diastolic",
		Value:     input.Diastolic,
		Unit:      input.Unit,
		Notes:     input.Notes,
		Source:    input.Source,
	}

	// Store both metrics in database
	if err := h.db.PutHealthMetric(systolicMetric); err != nil {
		return nil, fmt.Errorf("failed to store systolic metric: %w", err)
	}

	if err := h.db.PutHealthMetric(diastolicMetric); err != nil {
		return nil, fmt.Errorf("failed to store diastolic metric: %w", err)
	}

	return []*models.HealthMetric{systolicMetric, diastolicMetric}, nil
}

// AddCompositeHealthData handles both regular and composite metrics
func (h *HealthService) AddCompositeHealthData(userID string, input *models.CompositeHealthMetricInput) (interface{}, error) {
	// Handle blood pressure specially
	if input.Type == "blood_pressure" {
		if input.Systolic == nil || input.Diastolic == nil {
			return nil, fmt.Errorf("blood pressure requires both systolic and diastolic values")
		}

		bpInput := &models.BloodPressureInput{
			Type:      input.Type,
			Systolic:  *input.Systolic,
			Diastolic: *input.Diastolic,
			Unit:      input.Unit,
			Notes:     input.Notes,
			Source:    input.Source,
		}

		return h.AddBloodPressureData(userID, bpInput)
	}

	// Handle regular metrics
	if input.Value == nil {
		return nil, fmt.Errorf("regular metrics require a value")
	}

	regularInput := &models.HealthMetricInput{
		Type:   input.Type,
		Value:  *input.Value,
		Unit:   input.Unit,
		Notes:  input.Notes,
		Source: input.Source,
	}

	return h.AddHealthData(userID, regularInput)
}

// GetMetricHistory retrieves historical data for a specific metric type
func (h *HealthService) GetMetricHistory(userID, metricType string, startTime, endTime time.Time, limit int) ([]models.HealthMetric, error) {
	// Validate metric type
	if _, exists := models.SupportedMetrics[metricType]; !exists {
		return nil, fmt.Errorf("unsupported metric type: %s", metricType)
	}

	metrics, err := h.db.GetHealthMetrics(userID, metricType, startTime, endTime, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get health metrics: %w", err)
	}

	// Apply limit if specified
	if limit > 0 && len(metrics) > limit {
		metrics = metrics[:limit]
	}

	return metrics, nil
}

// GetLatestMetrics retrieves the latest metrics for all types for a user
func (h *HealthService) GetLatestMetrics(userID string) (map[string]models.LatestMetric, error) {
	latestMetrics, err := h.db.GetLatestHealthMetrics(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get latest health metrics: %w", err)
	}

	result := make(map[string]models.LatestMetric)
	for metricType, metric := range latestMetrics {
		// Calculate trend (placeholder - would need more sophisticated logic)
		trend := h.calculateTrend(userID, metricType)

		result[metricType] = models.LatestMetric{
			Value:     metric.Value,
			Unit:      metric.Unit,
			Timestamp: metric.Timestamp,
			Trend:     trend,
		}
	}

	return result, nil
}

// GetHealthSummary gets a summary of user's health data
func (h *HealthService) GetHealthSummary(userID string) (*models.HealthSummary, error) {
	latestMetrics, err := h.GetLatestMetrics(userID)
	if err != nil {
		return nil, err
	}

	// Find the most recent timestamp
	var lastUpdated time.Time
	for _, metric := range latestMetrics {
		if metric.Timestamp.After(lastUpdated) {
			lastUpdated = metric.Timestamp
		}
	}

	return &models.HealthSummary{
		UserID:      userID,
		LastUpdated: lastUpdated,
		Metrics:     latestMetrics,
	}, nil
}

// GetHealthTrends analyzes trends for specific metrics
func (h *HealthService) GetHealthTrends(userID string, metricTypes []string, period string) ([]models.HealthTrend, error) {
	var trends []models.HealthTrend

	// Calculate time range based on period
	endTime := time.Now()
	var startTime time.Time

	switch period {
	case "week":
		startTime = endTime.AddDate(0, 0, -7)
	case "month":
		startTime = endTime.AddDate(0, -1, 0)
	case "year":
		startTime = endTime.AddDate(-1, 0, 0)
	default:
		startTime = endTime.AddDate(0, -1, 0) // Default to month
	}

	for _, metricType := range metricTypes {
		metrics, err := h.GetMetricHistory(userID, metricType, startTime, endTime, 0)
		if err != nil {
			continue // Skip failed metrics
		}

		if len(metrics) == 0 {
			continue
		}

		trend := h.analyzeMetricTrend(metrics, metricType, period)
		trends = append(trends, trend)
	}

	return trends, nil
}

// ValidateHealthData validates health metric input
func (h *HealthService) ValidateHealthData(input *models.HealthMetricInput) error {
	// Check if metric type is supported
	metricInfo, exists := models.SupportedMetrics[input.Type]
	if !exists {
		return fmt.Errorf("unsupported metric type: %s", input.Type)
	}

	// Validate unit
	if metricInfo.Unit != "" && input.Unit != metricInfo.Unit {
		return fmt.Errorf("invalid unit for %s. Expected: %s", input.Type, metricInfo.Unit)
	}

	// Validate value is positive for most metrics
	if input.Value <= 0 {
		return fmt.Errorf("value must be positive")
	}

	// Validate value is within reasonable ranges (basic sanity checks)
	if err := h.validateValueRange(input.Type, input.Value); err != nil {
		return err
	}

	return nil
}

// calculateTrend calculates trend for a metric (placeholder implementation)
func (h *HealthService) calculateTrend(userID, metricType string) string {
	// Get recent metrics to calculate trend
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -30) // Last 30 days

	metrics, err := h.GetMetricHistory(userID, metricType, startTime, endTime, 10)
	if err != nil || len(metrics) < 2 {
		return "stable"
	}

	// Simple trend calculation: compare first and last values
	first := metrics[len(metrics)-1].Value // Oldest
	last := metrics[0].Value               // Newest (reversed order)

	if last > first*1.05 { // 5% increase
		return "up"
	} else if last < first*0.95 { // 5% decrease
		return "down"
	}

	return "stable"
}

// analyzeMetricTrend analyzes trend data for a metric
func (h *HealthService) analyzeMetricTrend(metrics []models.HealthMetric, metricType, period string) models.HealthTrend {
	if len(metrics) == 0 {
		return models.HealthTrend{
			MetricType: metricType,
			Period:     period,
			DataPoints: []models.DataPoint{},
		}
	}

	// Convert to data points
	dataPoints := make([]models.DataPoint, len(metrics))
	sum := 0.0
	min := metrics[0].Value
	max := metrics[0].Value

	for i, metric := range metrics {
		dataPoints[i] = models.DataPoint{
			Timestamp: metric.Timestamp,
			Value:     metric.Value,
		}

		sum += metric.Value
		if metric.Value < min {
			min = metric.Value
		}
		if metric.Value > max {
			max = metric.Value
		}
	}

	average := sum / float64(len(metrics))

	// Calculate overall trend
	trend := "stable"
	if len(metrics) >= 2 {
		first := metrics[len(metrics)-1].Value
		last := metrics[0].Value

		if last > first*1.1 {
			trend = "up"
		} else if last < first*0.9 {
			trend = "down"
		}
	}

	return models.HealthTrend{
		MetricType: metricType,
		Period:     period,
		DataPoints: dataPoints,
		Average:    average,
		Min:        min,
		Max:        max,
		Trend:      trend,
	}
}

// validateValueRange validates if a value is within reasonable ranges
func (h *HealthService) validateValueRange(metricType string, value float64) error {
	switch metricType {
	case "blood_pressure_systolic":
		if value < 60 || value > 250 {
			return fmt.Errorf("systolic blood pressure value out of reasonable range (60-250 mmHg)")
		}
	case "blood_pressure_diastolic":
		if value < 30 || value > 150 {
			return fmt.Errorf("diastolic blood pressure value out of reasonable range (30-150 mmHg)")
		}
	case "heart_rate":
		if value < 30 || value > 220 {
			return fmt.Errorf("heart rate value out of reasonable range (30-220 bpm)")
		}
	case "weight":
		if value < 1 || value > 500 {
			return fmt.Errorf("weight value out of reasonable range (1-500 kg)")
		}
	case "height":
		if value < 50 || value > 250 {
			return fmt.Errorf("height value out of reasonable range (50-250 cm)")
		}
	case "blood_glucose":
		if value < 20 || value > 600 {
			return fmt.Errorf("blood glucose value out of reasonable range (20-600 mg/dL)")
		}
	}

	return nil
}
