import { z } from "zod";

export const updateSettingsSchema = z.object({
	eventName: z.string().min(1).max(200).optional(),
	eventStartTime: z.string().datetime().nullable().optional(),
	votingEnabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const toggleVotingSchema = z.object({
	enabled: z.boolean(),
});

export const initiateUploadSchema = z.object({
	fileName: z.string().min(1),
	fileSize: z.number().positive(),
	contentType: z.string().min(1),
});

export const uploadChunkSchema = z.object({
	sessionId: z.string().uuid(),
	chunkIndex: z.number().int().nonnegative(),
});

export const finalizeUploadSchema = z.object({
	sessionId: z.string().uuid(),
});

export const cancelUploadSchema = z.object({
	sessionId: z.string().uuid(),
});

