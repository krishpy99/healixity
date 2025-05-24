package storage

import (
	"bytes"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"

	"health-dashboard-backend/internal/config"
)

// S3Client wraps the AWS S3 client
type S3Client struct {
	client   *s3.S3
	uploader *s3manager.Uploader
	bucket   string
}

// NewS3Client creates a new S3 client
func NewS3Client(cfg *config.Config) (*S3Client, error) {
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

	client := s3.New(sess)

	return &S3Client{
		client:   client,
		uploader: s3manager.NewUploader(sess),
		bucket:   cfg.S3Bucket,
	}, nil
}

// UploadFile uploads a file to S3
func (s *S3Client) UploadFile(key string, content io.Reader, contentType string, metadata map[string]*string) (string, error) {
	input := &s3manager.UploadInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        content,
		ContentType: aws.String(contentType),
		Metadata:    metadata,
	}

	result, err := s.uploader.Upload(input)
	if err != nil {
		return "", fmt.Errorf("failed to upload file to S3: %w", err)
	}

	return result.Location, nil
}

// UploadBytes uploads byte data to S3
func (s *S3Client) UploadBytes(key string, data []byte, contentType string, metadata map[string]*string) (string, error) {
	return s.UploadFile(key, bytes.NewReader(data), contentType, metadata)
}

// DownloadFile downloads a file from S3
func (s *S3Client) DownloadFile(key string) ([]byte, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	result, err := s.client.GetObject(input)
	if err != nil {
		return nil, fmt.Errorf("failed to download file from S3: %w", err)
	}
	defer result.Body.Close()

	data, err := io.ReadAll(result.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read file content: %w", err)
	}

	return data, nil
}

// GetFileInfo gets metadata about a file in S3
func (s *S3Client) GetFileInfo(key string) (*s3.HeadObjectOutput, error) {
	input := &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	result, err := s.client.HeadObject(input)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info from S3: %w", err)
	}

	return result, nil
}

// DeleteFile deletes a file from S3
func (s *S3Client) DeleteFile(key string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	_, err := s.client.DeleteObject(input)
	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	return nil
}

// ListFiles lists files in S3 with a given prefix
func (s *S3Client) ListFiles(prefix string, maxKeys int64) (*s3.ListObjectsV2Output, error) {
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(prefix),
	}

	if maxKeys > 0 {
		input.MaxKeys = aws.Int64(maxKeys)
	}

	result, err := s.client.ListObjectsV2(input)
	if err != nil {
		return nil, fmt.Errorf("failed to list files from S3: %w", err)
	}

	return result, nil
}

// GeneratePresignedURL generates a pre-signed URL for file access
func (s *S3Client) GeneratePresignedURL(key string, expirationMinutes int) (string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	req, _ := s.client.GetObjectRequest(input)

	// Set expiration time
	duration := time.Duration(expirationMinutes) * time.Minute
	url, err := req.Presign(duration)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url, nil
}

// CopyFile copies a file within S3
func (s *S3Client) CopyFile(sourceKey, destKey string) error {
	copySource := fmt.Sprintf("%s/%s", s.bucket, sourceKey)

	input := &s3.CopyObjectInput{
		Bucket:     aws.String(s.bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(destKey),
	}

	_, err := s.client.CopyObject(input)
	if err != nil {
		return fmt.Errorf("failed to copy file in S3: %w", err)
	}

	return nil
}

// HealthCheck checks if S3 bucket is accessible
func (s *S3Client) HealthCheck() error {
	input := &s3.HeadBucketInput{
		Bucket: aws.String(s.bucket),
	}

	_, err := s.client.HeadBucket(input)
	if err != nil {
		return fmt.Errorf("S3 health check failed: %w", err)
	}

	return nil
}

// GetBucketName returns the configured bucket name
func (s *S3Client) GetBucketName() string {
	return s.bucket
}
