// Main server file - Refactored to use modular structure
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { setupDatabase } = require("./setupDatabase");
const routes = require("./src/routes");
const { errorHandler, notFound } = require("./src/middleware/errorMiddleware");
const constants = require("./src/config/constants");
const logger = require("./src/utils/logger");

const app = express();

// Middleware for JSON parsing (but not for webhook)
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: constants.CORS_ORIGINS,
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Tutoring Platform MySQL API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: constants.PORT,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Funny Tutor Backend API",
    status: "running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Mount all routes
app.use(routes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database with error handling
(async () => {
  try {
    logger.info("Initializing database...");
    await setupDatabase();
    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Database initialization failed:", error.message);
    logger.warn("Server will continue without database setup");
  }
})();

// Start the server
const PORT = constants.PORT;
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, (error) => {
  if (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
  logger.info("Server started successfully!");
  logger.info(`Server is listening on ${HOST}:${PORT}`);
  logger.info(`Health check available at: http://${HOST}:${PORT}/health`);
  logger.info(`API endpoint available at: http://${HOST}:${PORT}/`);
});

// Handle server errors
server.on("error", (error) => {
  logger.error("Server error:", error);
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});
