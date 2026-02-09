import { Router } from "express";
import { authMiddleware, validateBody, uploadVideo, uploadChunk } from "@/middleware/index.js";
import {
	getSettings,
	updateSettings,
	toggleVoting,
	uploadPromoVideo,
	deletePromoVideo,
	initiatePromoVideoUpload,
	uploadPromoVideoChunk,
	finalizePromoVideoUpload,
	cancelPromoVideoUpload,
} from "./settings.controller.js";
import {
	updateSettingsSchema,
	toggleVotingSchema,
	initiateUploadSchema,
	finalizeUploadSchema,
	cancelUploadSchema,
} from "./settings.schema.js";

const router = Router();

// All settings routes require admin authentication
router.use(authMiddleware);

// Get current settings
router.get("/", getSettings);

// Update settings
router.patch("/", validateBody(updateSettingsSchema), updateSettings);

// Toggle voting on/off
router.post("/toggle-voting", validateBody(toggleVotingSchema), toggleVoting);

// Upload promo video (legacy - single upload)
router.post("/promo-video", uploadVideo.single("video"), uploadPromoVideo);

// Chunked upload endpoints
router.post("/promo-video/initiate", validateBody(initiateUploadSchema), initiatePromoVideoUpload);
router.post("/promo-video/chunk", uploadChunk.single("chunk"), uploadPromoVideoChunk);
router.post("/promo-video/finalize", validateBody(finalizeUploadSchema), finalizePromoVideoUpload);
router.post("/promo-video/cancel", validateBody(cancelUploadSchema), cancelPromoVideoUpload);

// Delete promo video
router.delete("/promo-video", deletePromoVideo);

export default router;

