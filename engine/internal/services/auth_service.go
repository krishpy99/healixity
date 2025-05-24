package services

import (
	"context"
	"encoding/json"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"go.uber.org/zap"
)

// AuthService handles Clerk authentication and user management
type AuthService struct {
	logger *zap.Logger
}

// NewAuthService creates a new auth service instance
func NewAuthService(logger *zap.Logger) *AuthService {
	return &AuthService{
		logger: logger,
	}
}

// GetUserProfile retrieves a user's profile information by user ID
func (s *AuthService) GetUserProfile(ctx context.Context, userID string) (*clerk.User, error) {
	s.logger.Debug("Getting user profile", zap.String("user_id", userID))

	return user.Get(ctx, userID)
}

// UpdateUserMetadata updates a user's public metadata
func (s *AuthService) UpdateUserMetadata(ctx context.Context, userID string, metadata map[string]interface{}) (*clerk.User, error) {
	s.logger.Debug("Updating user metadata", zap.String("user_id", userID))

	// Convert metadata to json.RawMessage
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}

	rawMessage := json.RawMessage(metadataBytes)

	return user.Update(ctx, userID, &user.UpdateParams{
		PublicMetadata: &rawMessage,
	})
}

// UpdateUserPrivateMetadata updates a user's private metadata
func (s *AuthService) UpdateUserPrivateMetadata(ctx context.Context, userID string, metadata map[string]interface{}) (*clerk.User, error) {
	s.logger.Debug("Updating user private metadata", zap.String("user_id", userID))

	// Convert metadata to json.RawMessage
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}

	rawMessage := json.RawMessage(metadataBytes)

	return user.Update(ctx, userID, &user.UpdateParams{
		PrivateMetadata: &rawMessage,
	})
}

// ListUsers retrieves a list of users (admin function)
func (s *AuthService) ListUsers(ctx context.Context) (*clerk.UserList, error) {
	s.logger.Debug("Listing users")

	return user.List(ctx, &user.ListParams{})
}

// GetUserEmail retrieves a user's email address
func (s *AuthService) GetUserEmail(ctx context.Context, userID string) (string, error) {
	userData, err := s.GetUserProfile(ctx, userID)
	if err != nil {
		return "", err
	}

	if len(userData.EmailAddresses) > 0 {
		return userData.EmailAddresses[0].EmailAddress, nil
	}

	return "", nil
}

// GetUserUsername retrieves a user's username
func (s *AuthService) GetUserUsername(ctx context.Context, userID string) (string, error) {
	userData, err := s.GetUserProfile(ctx, userID)
	if err != nil {
		return "", err
	}

	if userData.Username != nil {
		return *userData.Username, nil
	}

	return "", nil
}

// ValidateSessionClaims validates session claims and returns user information
func (s *AuthService) ValidateSessionClaims(ctx context.Context, claims *clerk.SessionClaims) (bool, error) {
	// The session claims are already validated by Clerk middleware
	// Here you can add additional validation logic if needed

	s.logger.Debug("Validating session claims", zap.String("user_id", claims.Subject))

	// Optional: Verify the user still exists and is active
	_, err := s.GetUserProfile(ctx, claims.Subject)
	if err != nil {
		s.logger.Error("Failed to get user profile for session validation",
			zap.String("user_id", claims.Subject),
			zap.Error(err))
		return false, err
	}

	return true, nil
}

// GetUserRoles retrieves user roles from metadata or organization
func (s *AuthService) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	userData, err := s.GetUserProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check public metadata for roles
	if len(userData.PublicMetadata) > 0 {
		var metadata map[string]interface{}
		if err := json.Unmarshal(userData.PublicMetadata, &metadata); err == nil {
			if roles, ok := metadata["roles"].([]interface{}); ok {
				stringRoles := make([]string, len(roles))
				for i, role := range roles {
					if str, ok := role.(string); ok {
						stringRoles[i] = str
					}
				}
				return stringRoles, nil
			}
		}
	}

	return []string{}, nil
}

// HasRole checks if a user has a specific role
func (s *AuthService) HasRole(ctx context.Context, userID string, role string) (bool, error) {
	roles, err := s.GetUserRoles(ctx, userID)
	if err != nil {
		return false, err
	}

	for _, userRole := range roles {
		if userRole == role {
			return true, nil
		}
	}

	return false, nil
}
