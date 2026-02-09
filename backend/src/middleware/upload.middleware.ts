import multer from "multer";
import { AppError } from "./error.middleware.js";

// File filter for images only
const imageFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new AppError("Only image files are allowed (jpeg, png, gif, webp, svg)", 400));
	}
};

// Memory storage for MinIO upload
const storage = multer.memoryStorage();

// Single image upload (max 5MB)
export const uploadImage = multer({
	storage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB
	},
});

// Multiple images upload (max 10 files, 5MB each)
export const uploadImages = multer({
	storage,
	fileFilter: imageFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB per file
		files: 10,
	},
});

// Generic file upload (any type, max 10MB)
export const uploadFile = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	},
});

// Video filter for video files only
const videoFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	const allowedMimeTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];

	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new AppError("Only video files are allowed (mp4, webm, ogg, mov)", 400));
	}
};

// Video upload (max 100MB)
export const uploadVideo = multer({
	storage,
	fileFilter: videoFilter,
	limits: {
		fileSize: 100 * 1024 * 1024, // 100MB
	},
});

// Chunk upload (max 10MB per chunk - for chunked uploads)
export const uploadChunk = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB per chunk
	},
});

