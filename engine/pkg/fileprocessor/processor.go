package fileprocessor

import (
	"fmt"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

// FileProcessor handles text extraction from various file formats
type FileProcessor struct{}

// NewFileProcessor creates a new file processor
func NewFileProcessor() *FileProcessor {
	return &FileProcessor{}
}

// ExtractText extracts text from a file based on its type
func (fp *FileProcessor) ExtractText(content []byte, fileType string) (string, error) {
	switch strings.ToLower(fileType) {
	case "pdf":
		return fp.extractTextFromPDF(content)
	case "txt":
		return fp.extractTextFromTXT(content)
	case "md", "markdown":
		return fp.extractTextFromMarkdown(content)
	default:
		return "", fmt.Errorf("unsupported file type: %s", fileType)
	}
}

// extractTextFromPDF extracts text from PDF files
func (fp *FileProcessor) extractTextFromPDF(content []byte) (string, error) {
	// Create a reader from the byte content
	reader := &ByteReaderAt{data: content}

	// Open PDF
	pdfReader, err := pdf.NewReader(reader, int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("failed to open PDF: %w", err)
	}

	var text strings.Builder

	// Extract text from each page
	for i := 1; i <= pdfReader.NumPage(); i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}

		pageText, err := page.GetPlainText(nil)
		if err != nil {
			// Continue with other pages if one fails
			continue
		}

		text.WriteString(pageText)
		text.WriteString("\n\n") // Add page separator
	}

	return strings.TrimSpace(text.String()), nil
}

// extractTextFromTXT extracts text from plain text files
func (fp *FileProcessor) extractTextFromTXT(content []byte) (string, error) {
	return string(content), nil
}

// extractTextFromMarkdown extracts text from Markdown files
func (fp *FileProcessor) extractTextFromMarkdown(content []byte) (string, error) {
	// For now, just return as plain text
	// In the future, you could use a markdown parser to extract clean text
	return string(content), nil
}

// ChunkText splits text into chunks for vector processing
func (fp *FileProcessor) ChunkText(text string, chunkSize int, overlap int) []string {
	if len(text) == 0 {
		return nil
	}

	// Normalize line endings and clean up text
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")

	// Remove excessive whitespace
	lines := strings.Split(text, "\n")
	var cleanLines []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleanLines = append(cleanLines, line)
		}
	}

	cleanText := strings.Join(cleanLines, "\n")

	if len(cleanText) <= chunkSize {
		return []string{cleanText}
	}

	var chunks []string
	runes := []rune(cleanText)

	for i := 0; i < len(runes); i += chunkSize - overlap {
		end := i + chunkSize
		if end > len(runes) {
			end = len(runes)
		}

		chunk := string(runes[i:end])

		// Try to break at sentence or paragraph boundaries
		chunk = fp.adjustChunkBoundary(chunk)

		chunks = append(chunks, strings.TrimSpace(chunk))

		// If this is the last chunk, break
		if end >= len(runes) {
			break
		}
	}

	return chunks
}

// adjustChunkBoundary tries to break chunks at natural boundaries
func (fp *FileProcessor) adjustChunkBoundary(chunk string) string {
	if len(chunk) == 0 {
		return chunk
	}

	// Try to break at sentence boundaries (. ! ?)
	for i := len(chunk) - 1; i >= len(chunk)*3/4; i-- {
		if chunk[i] == '.' || chunk[i] == '!' || chunk[i] == '?' {
			if i+1 < len(chunk) && (chunk[i+1] == ' ' || chunk[i+1] == '\n') {
				return chunk[:i+1]
			}
		}
	}

	// Try to break at paragraph boundaries
	for i := len(chunk) - 1; i >= len(chunk)*3/4; i-- {
		if chunk[i] == '\n' {
			return chunk[:i]
		}
	}

	// Try to break at word boundaries
	for i := len(chunk) - 1; i >= len(chunk)*3/4; i-- {
		if chunk[i] == ' ' {
			return chunk[:i]
		}
	}

	return chunk
}

// GetSupportedFormats returns a list of supported file formats
func (fp *FileProcessor) GetSupportedFormats() []string {
	return []string{"pdf", "txt", "md", "markdown"}
}

// IsFormatSupported checks if a file format is supported
func (fp *FileProcessor) IsFormatSupported(fileType string) bool {
	supportedFormats := fp.GetSupportedFormats()
	for _, format := range supportedFormats {
		if strings.ToLower(fileType) == format {
			return true
		}
	}
	return false
}

// ExtractMetadata extracts metadata from the file content
func (fp *FileProcessor) ExtractMetadata(content []byte, fileType string) (map[string]interface{}, error) {
	metadata := make(map[string]interface{})

	metadata["file_type"] = fileType
	metadata["file_size"] = len(content)

	switch strings.ToLower(fileType) {
	case "pdf":
		return fp.extractPDFMetadata(content, metadata)
	default:
		text, err := fp.ExtractText(content, fileType)
		if err != nil {
			return metadata, err
		}

		metadata["character_count"] = len(text)
		metadata["word_count"] = len(strings.Fields(text))
		metadata["line_count"] = len(strings.Split(text, "\n"))
	}

	return metadata, nil
}

// extractPDFMetadata extracts PDF-specific metadata
func (fp *FileProcessor) extractPDFMetadata(content []byte, metadata map[string]interface{}) (map[string]interface{}, error) {
	reader := &ByteReaderAt{data: content}

	pdfReader, err := pdf.NewReader(reader, int64(len(content)))
	if err != nil {
		return metadata, fmt.Errorf("failed to open PDF for metadata: %w", err)
	}

	metadata["page_count"] = pdfReader.NumPage()

	// Extract text for character/word counts
	text, err := fp.extractTextFromPDF(content)
	if err != nil {
		return metadata, err
	}

	metadata["character_count"] = len(text)
	metadata["word_count"] = len(strings.Fields(text))
	metadata["line_count"] = len(strings.Split(text, "\n"))

	return metadata, nil
}

// ByteReaderAt implements io.ReaderAt for byte slices
type ByteReaderAt struct {
	data []byte
}

// ReadAt implements io.ReaderAt
func (b *ByteReaderAt) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 || off >= int64(len(b.data)) {
		return 0, io.EOF
	}

	n = copy(p, b.data[off:])
	if n < len(p) {
		err = io.EOF
	}

	return n, err
}
