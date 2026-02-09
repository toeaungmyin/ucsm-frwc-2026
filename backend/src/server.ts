import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/index.js";
import { prisma } from "./config/index.js";
import { errorHandler, notFoundHandler } from "./middleware/index.js";
import {
	authRoutes,
	candidatesRoutes,
	categoriesRoutes,
	ticketRoutes,
	dashboardRoutes,
	settingsRoutes,
	clientCategoriesRoutes,
	clientCandidatesRoutes,
	clientConfigRoutes,
	clientTicketsRoutes,
	clientVotesRoutes,
} from "./modules/index.js";
import { initializeBucket } from "./services/index.js";
import type { Server } from "http";

const app = express();
let server: Server;

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Request body limits - prevent DoS attacks
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request timeout middleware
app.use((_req, res, next) => {
	res.setTimeout(30000, () => {
		res.status(408).json({ success: false, message: "Request timeout" });
	});
	next();
});

// Rate limiting - Different limits for different routes
// Admin routes: 100 requests per 0.5 minutes
const adminRateLimiter = rateLimit({
	windowMs: 0.5 * 60 * 1000,
	max: 100,
	message: { success: false, message: "Too many requests, please try again later" },
	standardHeaders: true,
	legacyHeaders: false,
});

// Client/Voting routes: 500 requests per minute (high traffic on event day)
const clientRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 500,
	message: { success: false, message: "Too many requests, please try again later" },
	standardHeaders: true,
	legacyHeaders: false,
});

// Voting specific: 30 votes per minute per IP (prevent spam)
const votingRateLimiter = rateLimit({
	windowMs: 10 * 1000,
	max: 10,
	message: { success: false, message: "Too many voting attempts, please slow down" },
	standardHeaders: true,
	legacyHeaders: false,
});

// Admin routes
app.use("/api/admin", adminRateLimiter, authRoutes);
app.use("/api/dashboard", adminRateLimiter, dashboardRoutes);
app.use("/api/settings", adminRateLimiter, settingsRoutes);
app.use("/api/categories", adminRateLimiter, categoriesRoutes);
app.use("/api/candidates", adminRateLimiter, candidatesRoutes);
app.use("/api/tickets", adminRateLimiter, ticketRoutes);

// Client routes with higher limits
app.use("/api/client/categories", clientRateLimiter, clientCategoriesRoutes);
app.use("/api/client/candidates", clientRateLimiter, clientCandidatesRoutes);
app.use("/api/client/config", clientRateLimiter, clientConfigRoutes);
app.use("/api/client/tickets", clientRateLimiter, clientTicketsRoutes);
app.use("/api/client/votes", votingRateLimiter, clientVotesRoutes);

// Health check with database connectivity
app.get("/api/health", async (_req, res) => {
	try {
		// Check database connectivity
		await prisma.$queryRaw`SELECT 1`;

		res.json({
			status: "ok",
			timestamp: new Date().toISOString(),
			database: "connected",
			uptime: process.uptime(),
		});
	} catch (error) {
		res.status(503).json({
			status: "error",
			timestamp: new Date().toISOString(),
			database: "disconnected",
			message: "Database connection failed",
		});
	}
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
	console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);

	// Stop accepting new connections
	server?.close(() => {
		console.log("✅ HTTP server closed");
	});

	try {
		// Close database connections
		await prisma.$disconnect();
		console.log("✅ Database connections closed");

		console.log("✅ Graceful shutdown completed");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error during graceful shutdown:", error);
		process.exit(1);
	}
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error("❌ Uncaught Exception:", error);
	gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

// Start server
const startServer = async () => {
	try {
		// Test database connection
		await prisma.$connect();
		console.log("✅ Database connected");

		// Initialize MinIO bucket
		await initializeBucket();

		server = app.listen(env.PORT, () => {
			console.log(`🚀 Server running on http://localhost:${env.PORT}`);
			console.log(`📊 Environment: ${env.NODE_ENV}`);
		});

		// Set server timeout
		server.timeout = 30000;
		server.keepAliveTimeout = 65000;
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

startServer();
