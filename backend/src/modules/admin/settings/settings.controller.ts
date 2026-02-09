import type { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/index.js";
import { sendSuccess } from "@/utils/index.js";
import { AppError } from "@/middleware/index.js";
import {
	uploadFile,
	deleteFile,
	getPublicUrl,
	extractObjectPath,
	createUploadSession,
	getUploadSession,
	uploadChunk,
	completeUpload,
	abortUpload,
} from "@/services/index.js";
import type { UpdateSettingsInput } from "./settings.schema.js";
import { v4 as uuidv4 } from "uuid";

// Default settings ID (singleton pattern)
const SETTINGS_ID = "default";

/**
 * Get current settings
 */
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		// Get or create settings
		let settings = await prisma.settings.findUnique({
			where: { id: SETTINGS_ID },
		});

		if (!settings) {
			// Create default settings if not exists
			settings = await prisma.settings.create({
				data: {
					id: SETTINGS_ID,
					eventName: "UCSM Fresher Welcome 2026",
					votingEnabled: false,
				},
			});
		}

		// Build response with video URL if exists
		const response = {
			...settings,
			promoVideoUrl: settings.promoVideo ? await getPublicUrl(settings.promoVideo) : null,
		};

		sendSuccess(res, response, "Settings fetched successfully");
	} catch (error) {
		next(error);
	}
};

/**
 * Update settings
 */
export const updateSettings = async (
	req: Request & { body: UpdateSettingsInput },
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { eventName, eventStartTime, votingEnabled } = req.body;

		// Upsert settings
		const settings = await prisma.settings.upsert({
			where: { id: SETTINGS_ID },
			update: {
				...(eventName !== undefined && { eventName }),
				...(eventStartTime !== undefined && {
					eventStartTime: eventStartTime ? new Date(eventStartTime) : null,
				}),
				...(votingEnabled !== undefined && { votingEnabled }),
			},
			create: {
				id: SETTINGS_ID,
				eventName: eventName || "UCSM Fresher Welcome 2026",
				eventStartTime: eventStartTime ? new Date(eventStartTime) : null,
				votingEnabled: votingEnabled || false,
			},
		});

		sendSuccess(res, settings, "Settings updated successfully");
	} catch (error) {
		next(error);
	}
};

/**
 * Toggle voting on/off
 */
export const toggleVoting = async (
	req: Request & { body: { enabled: boolean } },
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { enabled } = req.body;

		const settings = await prisma.settings.upsert({
			where: { id: SETTINGS_ID },
			update: { votingEnabled: enabled },
			create: {
				id: SETTINGS_ID,
				votingEnabled: enabled,
			},
		});

		sendSuccess(
			res,
			{ votingEnabled: settings.votingEnabled },
			`Voting ${enabled ? "enabled" : "disabled"} successfully`
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Upload promo video
 */
export const uploadPromoVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const file = req.file;

		if (!file) {
			throw new AppError("No video file provided", 400);
		}

		// Get current settings to check if there's an existing video
		const currentSettings = await prisma.settings.findUnique({
			where: { id: SETTINGS_ID },
		});

		// Delete old video if exists
		if (currentSettings?.promoVideo) {
			try {
				await deleteFile(extractObjectPath(currentSettings.promoVideo));
			} catch {
				// Ignore delete errors for old file
			}
		}

		// Generate unique filename
		const fileExtension = file.originalname.split(".").pop() || "mp4";
		const fileName = `promo-${uuidv4()}.${fileExtension}`;

		// Upload to MinIO
		const objectPath = await uploadFile(fileName, file.buffer, file.mimetype, "videos");

		// Update settings with new video path
		const settings = await prisma.settings.upsert({
			where: { id: SETTINGS_ID },
			update: { promoVideo: objectPath },
			create: {
				id: SETTINGS_ID,
				promoVideo: objectPath,
			},
		});

		sendSuccess(
			res,
			{
				promoVideo: settings.promoVideo,
				videoUrl: await getPublicUrl(objectPath),
			},
			"Promo video uploaded successfully"
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Delete promo video
 */
export const deletePromoVideo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		// Get current settings
		const currentSettings = await prisma.settings.findUnique({
			where: { id: SETTINGS_ID },
		});

		if (!currentSettings?.promoVideo) {
			throw new AppError("No promo video to delete", 404);
		}

		// Delete from MinIO
		await deleteFile(extractObjectPath(currentSettings.promoVideo));

		// Update settings to remove video path
		const settings = await prisma.settings.update({
			where: { id: SETTINGS_ID },
			data: { promoVideo: null },
		});

		sendSuccess(res, settings, "Promo video deleted successfully");
	} catch (error) {
		next(error);
	}
};

/**
 * Initiate chunked upload for promo video
 */
export const initiatePromoVideoUpload = async (
	req: Request & { body: { fileName: string; fileSize: number; contentType: string } },
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { fileName, fileSize, contentType } = req.body;

		if (!fileName || !fileSize || !contentType) {
			throw new AppError("Missing required fields: fileName, fileSize, contentType", 400);
		}

		// Validate file type
		const allowedMimeTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
		if (!allowedMimeTypes.includes(contentType)) {
			throw new AppError("Only video files are allowed (mp4, webm, ogg, mov)", 400);
		}

		// Generate unique filename
		const fileExtension = fileName.split(".").pop() || "mp4";
		const uniqueFileName = `promo-${uuidv4()}.${fileExtension}`;

		// Create upload session
		const sessionId = await createUploadSession(uniqueFileName, contentType, fileSize, "videos");

		sendSuccess(
			res,
			{
				sessionId,
				fileName: uniqueFileName,
				chunkSize: 5 * 1024 * 1024, // 5MB chunks
			},
			"Upload session created successfully"
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Upload a chunk of the promo video
 */
export const uploadPromoVideoChunk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		// Parse form data fields (multer puts them in req.body)
		const sessionId = req.body.sessionId;
		const chunkIndex = req.body.chunkIndex ? parseInt(req.body.chunkIndex, 10) : undefined;
		const chunk = req.file;

		if (!sessionId || chunkIndex === undefined || isNaN(chunkIndex)) {
			throw new AppError("Missing required fields: sessionId, chunkIndex", 400);
		}

		if (!chunk) {
			throw new AppError("No chunk file provided", 400);
		}

		// Verify session exists
		const session = getUploadSession(sessionId);
		if (!session) {
			throw new AppError("Upload session not found or expired", 404);
		}

		// Upload chunk (partNumber is 1-indexed)
		const partNumber = chunkIndex + 1;
		const progress = await uploadChunk(sessionId, chunk.buffer, partNumber);

		sendSuccess(res, progress, "Chunk uploaded successfully");
	} catch (error) {
		next(error);
	}
};

/**
 * Finalize chunked upload for promo video
 */
export const finalizePromoVideoUpload = async (
	req: Request & { body: { sessionId: string } },
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { sessionId } = req.body;

		if (!sessionId) {
			throw new AppError("Missing required field: sessionId", 400);
		}

		// Verify session exists
		const session = getUploadSession(sessionId);
		if (!session) {
			throw new AppError("Upload session not found or expired", 404);
		}

		// Complete the upload
		const objectPath = await completeUpload(sessionId);

		// Get current settings to check if there's an existing video
		const currentSettings = await prisma.settings.findUnique({
			where: { id: SETTINGS_ID },
		});

		// Delete old video if exists
		if (currentSettings?.promoVideo) {
			try {
				await deleteFile(extractObjectPath(currentSettings.promoVideo));
			} catch {
				// Ignore delete errors for old file
			}
		}

		// Update settings with new video path
		const settings = await prisma.settings.upsert({
			where: { id: SETTINGS_ID },
			update: { promoVideo: objectPath },
			create: {
				id: SETTINGS_ID,
				promoVideo: objectPath,
			},
		});

		sendSuccess(
			res,
			{
				promoVideo: settings.promoVideo,
				videoUrl: await getPublicUrl(objectPath),
			},
			"Promo video uploaded successfully"
		);
	} catch (error) {
		next(error);
	}
};

/**
 * Cancel chunked upload for promo video
 */
export const cancelPromoVideoUpload = async (
	req: Request & { body: { sessionId: string } },
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { sessionId } = req.body;

		if (!sessionId) {
			throw new AppError("Missing required field: sessionId", 400);
		}

		await abortUpload(sessionId);

		sendSuccess(res, {}, "Upload cancelled successfully");
	} catch (error) {
		next(error);
	}
};

