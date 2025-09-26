package utils

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

var debugLogger *log.Logger

func init() {
	// Create logs directory if it doesn't exist
	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Printf("Failed to create logs directory: %v", err)
		return
	}

	// Create log file with timestamp
	timestamp := time.Now().Format("2006-01-02")
	logFile := filepath.Join(logDir, fmt.Sprintf("debug-%s.log", timestamp))

	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Failed to open log file: %v", err)
		return
	}

	debugLogger = log.New(file, "", log.LstdFlags|log.Lshortfile)
	debugLogger.Printf("=== Debug logging started ===")
}

// LogDebug writes debug messages to the log file
func LogDebug(format string, args ...interface{}) {
	if debugLogger != nil {
		debugLogger.Printf("[DEBUG] "+format, args...)
	} else {
		// Fallback to standard log if file logger failed to initialize
		log.Printf("[DEBUG] "+format, args...)
	}
}

// LogError writes error messages to the log file
func LogError(format string, args ...interface{}) {
	if debugLogger != nil {
		debugLogger.Printf("[ERROR] "+format, args...)
	} else {
		log.Printf("[ERROR] "+format, args...)
	}
}

// LogInfo writes info messages to the log file
func LogInfo(format string, args ...interface{}) {
	if debugLogger != nil {
		debugLogger.Printf("[INFO] "+format, args...)
	} else {
		log.Printf("[INFO] "+format, args...)
	}
}