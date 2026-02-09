import { v4 as uuidv4 } from "uuid";
import { uploadFileFromBuffer } from "./minio.service.js";

export interface UploadSession {
	id: string;
	fileName: string;
	contentType: string;
	folder?: string;
	totalSize: number;
	uploadedSize: number;
	chunks: Map<number, Buffer>;
	createdAt: Date;
	lastActivity: Date;
}

// In-memory storage for upload sessions (in production, use Redis)
const uploadSessions = new Map<string, UploadSession>();

// Cleanup old sessions (older than 24 hours)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
	const now = Date.now();
	for (const [sessionId, session] of uploadSessions.entries()) {
		if (now - session.lastActivity.getTime() > SESSION_EXPIRY) {
			// Remove expired session (chunks will be garbage collected)
			uploadSessions.delete(sessionId);
		}
	}
}, CLEANUP_INTERVAL);

/**
 * Create a new upload session
 */
export const createUploadSession = async (
	fileName: string,
	contentType: string,
	totalSize: number,
	folder?: string
): Promise<string> => {
	const sessionId = uuidv4();

	const session: UploadSession = {
		id: sessionId,
		fileName,
		contentType,
		folder,
		totalSize,
		uploadedSize: 0,
		chunks: new Map(),
		createdAt: new Date(),
		lastActivity: new Date(),
	};

	uploadSessions.set(sessionId, session);
	return sessionId;
};

/**
 * Get upload session
 */
export const getUploadSession = (sessionId: string): UploadSession | undefined => {
	return uploadSessions.get(sessionId);
};

/**
 * Upload a chunk and update session
 */
export const uploadChunk = async (
	sessionId: string,
	chunkBuffer: Buffer,
	chunkIndex: number
): Promise<{ progress: number; uploadedSize: number; totalSize: number }> => {
	const session = uploadSessions.get(sessionId);
	if (!session) {
		throw new Error("Upload session not found");
	}

	// Store the chunk
	session.chunks.set(chunkIndex, chunkBuffer);
	session.uploadedSize += chunkBuffer.length;
	session.lastActivity = new Date();

	uploadSessions.set(sessionId, session);

	return {
		progress: (session.uploadedSize / session.totalSize) * 100,
		uploadedSize: session.uploadedSize,
		totalSize: session.totalSize,
	};
};

/**
 * Complete the upload
 */
export const completeUpload = async (sessionId: string): Promise<string> => {
	const session = uploadSessions.get(sessionId);
	if (!session) {
		throw new Error("Upload session not found");
	}

	// Sort chunks by index and assemble the file
	const sortedChunkIndices = Array.from(session.chunks.keys()).sort((a, b) => a - b);
	const chunks = sortedChunkIndices.map((index) => session.chunks.get(index)!);

	// Combine all chunks into a single buffer
	const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const fileBuffer = Buffer.concat(chunks, totalSize);

	// Upload the complete file to MinIO
	const objectPath = await uploadFileFromBuffer(
		session.fileName,
		fileBuffer,
		session.contentType,
		session.folder
	);

	// Remove session
	uploadSessions.delete(sessionId);

	return objectPath;
};

/**
 * Abort the upload
 */
export const abortUpload = async (sessionId: string): Promise<void> => {
	const session = uploadSessions.get(sessionId);
	if (!session) {
		return;
	}

	// Just remove the session (chunks are in memory, will be garbage collected)
	uploadSessions.delete(sessionId);
};

