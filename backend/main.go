package main

import (
	"log"
	"net/http"
	"os"

	"pfhealth/backend/middleware"
)

func main() {
	// Create a new mux router
	mux := http.NewServeMux()

	// Add your routes here
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from the backend!"))
	})

	// Wrap the mux with CORS middleware
	handler := middleware.WithCORS(mux)

	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start the server
	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
