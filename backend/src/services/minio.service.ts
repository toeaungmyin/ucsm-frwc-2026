import { Client } from "minio";
import { env } from "@/config/index.js";
import { Readable } from "stream";

// MinIO client instance
const minioClient = new Client({
	endPoint: env.MINIO_ENDPOINT,
	port: parseInt(env.MINIO_PORT),
	useSSL: env.MINIO_USE_SSL === "true",
	accessKey: env.MINIO_ACCESS_KEY,
	secretKey: env.MINIO_SECRET_KEY,
});

const BUCKET_NAME = env.MINIO_BUCKET;

// Internal MinIO URL (used by the client for generating URLs)
const INTERNAL_MINIO_URL = `${env.MINIO_USE_SSL === "true" ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

/**
 * Replace internal MinIO URL with public URL in presigned URLs
 */
const toPublicUrl = (presignedUrl: string): string => {
	if (env.MINIO_PUBLIC_URL) {
		return presignedUrl.replace(INTERNAL_MINIO_URL, env.MINIO_PUBLIC_URL);
	}
	return presignedUrl;
};

/**
 * Initialize MinIO bucket if it doesn't exist
 */
export const initializeBucket = async (): Promise<void> => {
	try {
		const bucketExists = await minioClient.bucketExists(BUCKET_NAME);

		if (!bucketExists) {
			await minioClient.makeBucket(BUCKET_NAME);
			console.log(`✅ MinIO bucket "${BUCKET_NAME}" created successfully`);

			// Set bucket policy to allow public read access (optional)
			const policy = {
				Version: "2012-10-17",
				Statement: [
					{
						Effect: "Allow",
						Principal: { AWS: ["*"] },
						Action: ["s3:GetObject"],
						Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
					},
				],
			};
			await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
		} else {
			console.log(`✅ MinIO bucket "${BUCKET_NAME}" already exists`);
		}
	} catch (error) {
		console.error("❌ MinIO initialization error:", error);
		throw error;
	}
};

/**
 * Upload a file to MinIO
 */
export const uploadFile = async (
	fileName: string,
	fileBuffer: Buffer,
	contentType: string,
	folder?: string
): Promise<string> => {
	const objectName = folder ? `${folder}/${fileName}` : fileName;

	await minioClient.putObject(BUCKET_NAME, objectName, fileBuffer, fileBuffer.length, {
		"Content-Type": contentType,
	});

	return objectName;
};

/**
 * Upload a file from a readable stream
 */
export const uploadStream = async (
	fileName: string,
	stream: Readable,
	size: number,
	contentType: string,
	folder?: string
): Promise<string> => {
	const objectName = folder ? `${folder}/${fileName}` : fileName;

	await minioClient.putObject(BUCKET_NAME, objectName, stream, size, {
		"Content-Type": contentType,
	});

	return objectName;
};

/**
 * Get a file from MinIO
 */
export const getFile = async (objectName: string): Promise<Readable> => {
	return await minioClient.getObject(BUCKET_NAME, objectName);
};

/**
 * Get file stats/metadata
 */
export const getFileStats = async (objectName: string) => {
	return await minioClient.statObject(BUCKET_NAME, objectName);
};

/**
 * Delete a file from MinIO
 */
export const deleteFile = async (objectName: string): Promise<void> => {
	await minioClient.removeObject(BUCKET_NAME, objectName);
};

/**
 * Delete multiple files from MinIO
 */
export const deleteFiles = async (objectNames: string[]): Promise<void> => {
	await minioClient.removeObjects(BUCKET_NAME, objectNames);
};

/**
 * Generate a presigned URL for file download
 */
export const getPresignedUrl = async (
	objectName: string,
	expirySeconds: number = 3600
): Promise<string> => {
	const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds);
	return toPublicUrl(url);
};

/**
 * Generate a presigned URL for file upload
 */
export const getPresignedUploadUrl = async (objectName: string, expirySeconds: number = 3600): Promise<string> => {
	const url = await minioClient.presignedPutObject(BUCKET_NAME, objectName, expirySeconds);
	return toPublicUrl(url);
};

/**
 * List all files in a folder/prefix
 */
export const listFiles = async (prefix?: string): Promise<string[]> => {
	return new Promise((resolve, reject) => {
		const files: string[] = [];
		const stream = minioClient.listObjects(BUCKET_NAME, prefix, true);

		stream.on("data", (obj) => {
			if (obj.name) {
				files.push(obj.name);
			}
		});

		stream.on("error", reject);
		stream.on("end", () => resolve(files));
	});
};

/**
 * Check if a file exists
 */
export const fileExists = async (objectName: string): Promise<boolean> => {
	try {
		await minioClient.statObject(BUCKET_NAME, objectName);
		return true;
	} catch {
		return false;
	}
};

/**
 * Extract object path from a stored value (handles both object paths and legacy full URLs)
 * @param storedValue - The value stored in DB (could be object path or full URL)
 * @returns The clean object path for MinIO operations
 */
export const extractObjectPath = (storedValue: string): string => {
	// If it's already a clean object path (doesn't start with http), return as-is
	if (!storedValue.startsWith("http")) {
		return storedValue;
	}

	// Handle legacy URLs like: https://domain/storage/bucket/path/to/file.ext
	// Extract the path after /storage/bucket/
	const match = storedValue.match(/\/storage\/[^/]+\/(.+)$/);
	if (match) {
		return match[1];
	}

	// Handle MinIO presigned URLs - extract object path from the URL path
	try {
		const url = new URL(storedValue);
		// Remove leading slash and bucket name if present
		const pathParts = url.pathname.split("/").filter(Boolean);
		if (pathParts[0] === BUCKET_NAME) {
			return pathParts.slice(1).join("/");
		}
		return pathParts.join("/");
	} catch {
		// If URL parsing fails, return as-is
		return storedValue;
	}
};

/**
 * Get a temporary signed URL for a file from MinIO
 * Handles both clean object paths and legacy full URLs stored in DB
 * @param storedValue - The value stored in DB (object path or legacy URL)
 * @param expirySeconds - URL expiry time in seconds (default: 24 hours)
 */
export const getPublicUrl = async (storedValue: string, expirySeconds: number = 86400): Promise<string> => {
	const objectPath = extractObjectPath(storedValue);
	const url = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, expirySeconds);
	return toPublicUrl(url);
};

/**
 * Copy a file within MinIO
 */
export const copyFile = async (sourceObject: string, destObject: string): Promise<void> => {
	await minioClient.copyObject(BUCKET_NAME, destObject, `/${BUCKET_NAME}/${sourceObject}`);
};

/**
 * Upload file from buffer (used for assembling chunks)
 */
export const uploadFileFromBuffer = async (
	fileName: string,
	fileBuffer: Buffer,
	contentType: string,
	folder?: string
): Promise<string> => {
	return await uploadFile(fileName, fileBuffer, contentType, folder);
};

// Export the MinIO client for advanced usage
export { minioClient, BUCKET_NAME };

