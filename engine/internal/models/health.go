package models

import (
	"time"

	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

// HealthMetric represents a single health data point
type HealthMetric struct {
	UserID    string    `json:"user_id" dynamodbav:"user_id"`
	Timestamp time.Time `json:"timestamp" dynamodbav:"timestamp"`
	Type      string    `json:"type" dynamodbav:"metric_type"`
	Value     float64   `json:"value" dynamodbav:"value"`
	Unit      string    `json:"unit" dynamodbav:"unit"`
	Notes     string    `json:"notes,omitempty" dynamodbav:"notes,omitempty"`
	Source    string    `json:"source,omitempty" dynamodbav:"source,omitempty"` // manual, device, etc.
}

// HealthMetricInput represents input for adding health data
type HealthMetricInput struct {
	Type   string  `json:"type" binding:"required"`
	Value  float64 `json:"value" binding:"required"`
	Unit   string  `json:"unit" binding:"required"`
	Notes  string  `json:"notes,omitempty"`
	Source string  `json:"source,omitempty"`
}

// HealthSummary represents a summary of health metrics
type HealthSummary struct {
	UserID      string                  `json:"user_id"`
	LastUpdated time.Time               `json:"last_updated"`
	Metrics     map[string]LatestMetric `json:"metrics"`
}

// LatestMetric represents the latest value for a specific metric type
type LatestMetric struct {
	Value     float64   `json:"value"`
	Unit      string    `json:"unit"`
	Timestamp time.Time `json:"timestamp"`
	Trend     string    `json:"trend,omitempty"` // "up", "down", "stable"
}

// HealthTrend represents trend data for a metric over time
type HealthTrend struct {
	MetricType string      `json:"metric_type"`
	Period     string      `json:"period"` // "week", "month", "year"
	DataPoints []DataPoint `json:"data_points"`
	Average    float64     `json:"average"`
	Min        float64     `json:"min"`
	Max        float64     `json:"max"`
	Trend      string      `json:"trend"`
}

// DataPoint represents a single data point in a trend
type DataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// SupportedMetrics contains all supported health metric types
var SupportedMetrics = map[string]MetricInfo{
	"blood_pressure_systolic": {
		Name:        "Blood Pressure (Systolic)",
		Unit:        "mmHg",
		Category:    "cardiovascular",
		NormalRange: &Range{Min: 90, Max: 120},
	},
	"blood_pressure_diastolic": {
		Name:        "Blood Pressure (Diastolic)",
		Unit:        "mmHg",
		Category:    "cardiovascular",
		NormalRange: &Range{Min: 60, Max: 80},
	},
	"heart_rate": {
		Name:        "Heart Rate",
		Unit:        "bpm",
		Category:    "cardiovascular",
		NormalRange: &Range{Min: 60, Max: 100},
	},
	"weight": {
		Name:     "Weight",
		Unit:     "kg",
		Category: "physical",
	},
	"height": {
		Name:     "Height",
		Unit:     "cm",
		Category: "physical",
	},
	"bmi": {
		Name:        "Body Mass Index",
		Unit:        "kg/m²",
		Category:    "physical",
		NormalRange: &Range{Min: 18.5, Max: 24.9},
	},
	"blood_glucose": {
		Name:        "Blood Glucose",
		Unit:        "mg/dL",
		Category:    "metabolic",
		NormalRange: &Range{Min: 70, Max: 100},
	},
	"cholesterol_total": {
		Name:        "Total Cholesterol",
		Unit:        "mg/dL",
		Category:    "metabolic",
		NormalRange: &Range{Min: 0, Max: 200},
	},
	"cholesterol_hdl": {
		Name:        "HDL Cholesterol",
		Unit:        "mg/dL",
		Category:    "metabolic",
		NormalRange: &Range{Min: 40, Max: 999},
	},
	"cholesterol_ldl": {
		Name:        "LDL Cholesterol",
		Unit:        "mg/dL",
		Category:    "metabolic",
		NormalRange: &Range{Min: 0, Max: 100},
	},
	"sleep_duration": {
		Name:        "Sleep Duration",
		Unit:        "hours",
		Category:    "lifestyle",
		NormalRange: &Range{Min: 7, Max: 9},
	},
	"exercise_duration": {
		Name:     "Exercise Duration",
		Unit:     "minutes",
		Category: "lifestyle",
	},
	"water_intake": {
		Name:     "Water Intake",
		Unit:     "liters",
		Category: "lifestyle",
	},
	"steps": {
		Name:     "Steps",
		Unit:     "count",
		Category: "activity",
	},
}

// MetricInfo contains metadata about a health metric
type MetricInfo struct {
	Name        string `json:"name"`
	Unit        string `json:"unit"`
	Category    string `json:"category"`
	NormalRange *Range `json:"normal_range,omitempty"`
}

// Range represents a normal range for a metric
type Range struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// IsWithinNormalRange checks if a value is within the normal range
func (m *MetricInfo) IsWithinNormalRange(value float64) bool {
	if m.NormalRange == nil {
		return true // No range defined
	}
	return value >= m.NormalRange.Min && value <= m.NormalRange.Max
}

// ToDynamoDBItem converts HealthMetric to DynamoDB item
func (h *HealthMetric) ToDynamoDBItem() (map[string]*dynamodb.AttributeValue, error) {
	return dynamodbattribute.MarshalMap(h)
}

// FromDynamoDBItem converts DynamoDB item to HealthMetric
func (h *HealthMetric) FromDynamoDBItem(item map[string]*dynamodb.AttributeValue) error {
	return dynamodbattribute.UnmarshalMap(item, h)
}

// GetPartitionKey returns the partition key for DynamoDB
func (h *HealthMetric) GetPartitionKey() string {
	return h.UserID
}

// GetSortKey returns the sort key for DynamoDB (timestamp + metric type)
func (h *HealthMetric) GetSortKey() string {
	return h.Timestamp.Format("2006-01-02T15:04:05.000Z") + "#" + h.Type
}
