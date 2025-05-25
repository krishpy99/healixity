package database

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"

	"health-dashboard-backend/internal/config"
	"health-dashboard-backend/internal/models"
)

// DynamoDBClient wraps the AWS DynamoDB client
type DynamoDBClient struct {
	client             *dynamodb.DynamoDB
	healthTableName    string
	documentsTableName string
}

// NewDynamoDBClient creates a new DynamoDB client
func NewDynamoDBClient(cfg *config.Config) (*DynamoDBClient, error) {
	awsConfig := &aws.Config{
		Region: aws.String(cfg.AWSRegion),
	}

	// Use credentials if provided
	if cfg.AWSAccessKeyID != "" && cfg.AWSSecretAccessKey != "" {
		awsConfig.Credentials = credentials.NewStaticCredentials(
			cfg.AWSAccessKeyID,
			cfg.AWSSecretAccessKey,
			"",
		)
	}

	sess, err := session.NewSession(awsConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	return &DynamoDBClient{
		client:             dynamodb.New(sess),
		healthTableName:    cfg.DynamoDBTableHealth,
		documentsTableName: cfg.DynamoDBTableDocs,
	}, nil
}

// Health Data Operations

// PutHealthMetric stores a health metric in DynamoDB
func (d *DynamoDBClient) PutHealthMetric(metric *models.HealthMetric) error {
	// Set the sort key before marshaling
	metric.SortKey = metric.GetSortKey()

	item, err := metric.ToDynamoDBItem()
	if err != nil {
		return fmt.Errorf("failed to marshal health metric: %w", err)
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(d.healthTableName),
		Item:      item,
	}

	_, err = d.client.PutItem(input)
	if err != nil {
		return fmt.Errorf("failed to put health metric: %w", err)
	}

	return nil
}

// GetHealthMetrics retrieves health metrics for a user within a time range
func (d *DynamoDBClient) GetHealthMetrics(userID string, metricType string, startTime, endTime time.Time, limit int) ([]models.HealthMetric, error) {

	keyCondition := "user_id = :userID"
	expressionValues := map[string]*dynamodb.AttributeValue{
		":userID": {
			S: aws.String(userID),
		},
	}

	filterExpression := ""

	if metricType != "" {
		filterExpression = "metric_type = :metricType"
		expressionValues[":metricType"] = &dynamodb.AttributeValue{S: aws.String(metricType)}
	}

	if !startTime.IsZero() && !endTime.IsZero() {
		filterExpression += " AND sort_key BETWEEN :startKey AND :endKey"
		expressionValues[":startKey"] = &dynamodb.AttributeValue{S: aws.String(metricType + "#" + startTime.Format("2006-01-02T15:04:05.000000Z"))}
		expressionValues[":endKey"] = &dynamodb.AttributeValue{S: aws.String(metricType + "#" + endTime.Format("2006-01-02T15:04:05.000000Z~"))}
	}

	if limit == 0 {
		limit = 10
	}

	input := &dynamodb.QueryInput{
		TableName:                 aws.String(d.healthTableName),
		FilterExpression:          aws.String(filterExpression),
		KeyConditionExpression:    aws.String(keyCondition),
		ExpressionAttributeValues: expressionValues,
		ScanIndexForward:          aws.Bool(false), // Latest first
		Limit:                     aws.Int64(int64(limit)),
	}

	result, err := d.client.Query(input)
	if err != nil {
		return nil, fmt.Errorf("failed to query health metrics: %w", err)
	}

	var metrics []models.HealthMetric
	for _, item := range result.Items {
		var metric models.HealthMetric
		if err := metric.FromDynamoDBItem(item); err != nil {
			continue // Skip invalid items
		}
		metrics = append(metrics, metric)
	}

	return metrics, nil
}

// GetLatestHealthMetrics retrieves the latest health metrics for each type for a user
func (d *DynamoDBClient) GetLatestHealthMetrics(userID string) (map[string]models.HealthMetric, error) {
	input := &dynamodb.QueryInput{
		TableName:              aws.String(d.healthTableName),
		KeyConditionExpression: aws.String("user_id = :userID"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":userID": {
				S: aws.String(userID),
			},
		},
		ScanIndexForward: aws.Bool(false), // Latest first (descending sort key order)
		Limit:            aws.Int64(100),  // Limit to avoid too much data
	}

	result, err := d.client.Query(input)
	if err != nil {
		return nil, fmt.Errorf("failed to query latest health metrics: %w", err)
	}

	latestMetrics := make(map[string]models.HealthMetric)
	for _, item := range result.Items {
		var metric models.HealthMetric
		if err := metric.FromDynamoDBItem(item); err != nil {
			continue // Skip invalid items
		}

		// Keep only the latest metric for each type
		// Since we're sorting by sort_key descending, the first occurrence of each type is the latest
		if _, exists := latestMetrics[metric.Type]; !exists {
			latestMetrics[metric.Type] = metric
		}
	}

	return latestMetrics, nil
}

// Document Operations

// PutDocument stores a document metadata in DynamoDB
func (d *DynamoDBClient) PutDocument(document *models.Document) error {
	item, err := document.ToDynamoDBItem()
	if err != nil {
		return fmt.Errorf("failed to marshal document: %w", err)
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(d.documentsTableName),
		Item:      item,
	}

	_, err = d.client.PutItem(input)
	if err != nil {
		return fmt.Errorf("failed to put document: %w", err)
	}

	return nil
}

// GetDocument retrieves a specific document by ID
func (d *DynamoDBClient) GetDocument(userID, documentID string) (*models.Document, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(d.documentsTableName),
		Key: map[string]*dynamodb.AttributeValue{
			"user_id": {
				S: aws.String(userID),
			},
			"document_id": {
				S: aws.String(documentID),
			},
		},
	}

	result, err := d.client.GetItem(input)
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("document not found")
	}

	var document models.Document
	if err := document.FromDynamoDBItem(result.Item); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	return &document, nil
}

// GetUserDocuments retrieves all documents for a user
func (d *DynamoDBClient) GetUserDocuments(userID string, limit int, lastEvaluatedKey map[string]*dynamodb.AttributeValue) ([]models.Document, map[string]*dynamodb.AttributeValue, error) {
	input := &dynamodb.QueryInput{
		TableName:              aws.String(d.documentsTableName),
		KeyConditionExpression: aws.String("user_id = :userID"),
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":userID": {
				S: aws.String(userID),
			},
		},
		ScanIndexForward: aws.Bool(false), // Latest first
	}

	if limit > 0 {
		input.Limit = aws.Int64(int64(limit))
	}

	if lastEvaluatedKey != nil {
		input.ExclusiveStartKey = lastEvaluatedKey
	}

	result, err := d.client.Query(input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query user documents: %w", err)
	}

	var documents []models.Document
	for _, item := range result.Items {
		var document models.Document
		if err := document.FromDynamoDBItem(item); err != nil {
			continue // Skip invalid items
		}
		documents = append(documents, document)
	}

	return documents, result.LastEvaluatedKey, nil
}

// UpdateDocument updates a document's metadata
func (d *DynamoDBClient) UpdateDocument(document *models.Document) error {
	// Prepare update expression
	updateExpression := "SET #status = :status, processed_at = :processedAt, chunk_count = :chunkCount"
	expressionAttributeNames := map[string]*string{
		"#status": aws.String("status"),
	}
	expressionAttributeValues := map[string]*dynamodb.AttributeValue{
		":status": {
			S: aws.String(document.Status),
		},
		":processedAt": {
			S: aws.String(document.ProcessedAt.Format(time.RFC3339)),
		},
		":chunkCount": {
			N: aws.String(fmt.Sprintf("%d", document.ChunkCount)),
		},
	}

	// Add error message if present
	if document.ErrorMessage != "" {
		updateExpression += ", error_message = :errorMessage"
		expressionAttributeValues[":errorMessage"] = &dynamodb.AttributeValue{
			S: aws.String(document.ErrorMessage),
		}
	}

	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(d.documentsTableName),
		Key: map[string]*dynamodb.AttributeValue{
			"user_id": {
				S: aws.String(document.UserID),
			},
			"document_id": {
				S: aws.String(document.DocumentID),
			},
		},
		UpdateExpression:          aws.String(updateExpression),
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
	}

	_, err := d.client.UpdateItem(input)
	if err != nil {
		return fmt.Errorf("failed to update document: %w", err)
	}

	return nil
}

// DeleteDocument removes a document from DynamoDB
func (d *DynamoDBClient) DeleteDocument(userID, documentID string) error {
	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(d.documentsTableName),
		Key: map[string]*dynamodb.AttributeValue{
			"user_id": {
				S: aws.String(userID),
			},
			"document_id": {
				S: aws.String(documentID),
			},
		},
	}

	_, err := d.client.DeleteItem(input)
	if err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	return nil
}

// Health check for DynamoDB connection
func (d *DynamoDBClient) HealthCheck() error {
	input := &dynamodb.DescribeTableInput{
		TableName: aws.String(d.healthTableName),
	}

	_, err := d.client.DescribeTable(input)
	if err != nil {
		return fmt.Errorf("DynamoDB health check failed: %w", err)
	}

	return nil
}
