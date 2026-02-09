import type { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/index.js";
import { sendSuccess, sendCreated } from "@/utils/index.js";
import { AppError } from "@/middleware/index.js";
import { uploadFile, deleteFile, getPublicUrl, extractObjectPath } from "@/services/index.js";
import { v4 as uuidv4 } from "uuid";
import type { CreateCandidateInput, UpdateCandidateInput, ImportCandidatesInput } from "./candidates.schema.js";

const IMAGE_FOLDER = "candidates/photos";

// Helper to add presigned image URL to candidate
const withImageUrl = async <T extends { image: string | null }>(
	candidate: T
): Promise<T & { imageUrl: string | null }> => {
	return {
		...candidate,
		imageUrl: candidate.image ? await getPublicUrl(candidate.image) : null,
	};
};

// Helper to add presigned image URLs to multiple candidates
const withImageUrls = async <T extends { image: string | null }>(
	candidates: T[]
): Promise<(T & { imageUrl: string | null })[]> => {
	return Promise.all(candidates.map(withImageUrl));
};

export const index = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const candidates = await prisma.candidate.findMany({
			orderBy: { createdAt: "asc" },
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		candidates.sort((a, b) => {
			const numA = parseInt(a.nomineeId, 10) || 0;
			const numB = parseInt(b.nomineeId, 10) || 0;
			return numA - numB;
		});

		const candidatesWithUrls = await withImageUrls(candidates);
		sendSuccess(res, candidatesWithUrls);
	} catch (error) {
		next(error);
	}
};

export const show = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params;

		const candidate = await prisma.candidate.findUnique({
			where: { id },
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		if (!candidate) {
			throw new AppError("Candidate not found", 404);
		}

		const candidateWithUrl = await withImageUrl(candidate);
		sendSuccess(res, candidateWithUrl);
	} catch (error) {
		next(error);
	}
};

export const store = async (
	req: Request<object, object, CreateCandidateInput>,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { nomineeId, name, category } = req.body;
		const file = req.file;

		const existingCategory = await prisma.category.findUnique({
			where: { name: category },
		});

		if (!existingCategory) {
			throw new AppError("Category not found", 404);
		}

		// Upload image to MinIO if provided
		let imagePath: string | undefined;
		if (file) {
			const extension = file.originalname.split(".").pop();
			const fileName = `${uuidv4()}.${extension}`;
			imagePath = await uploadFile(fileName, file.buffer, file.mimetype, IMAGE_FOLDER);
		}

		const candidate = await prisma.candidate.create({
			data: {
				nomineeId,
				name,
				categoryId: existingCategory.id,
				image: imagePath || null, // Store only object path
			},
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		const candidateWithUrl = await withImageUrl(candidate);
		sendCreated(res, candidateWithUrl, "Candidate created successfully");
	} catch (error) {
		next(error);
	}
};

export const update = async (
	req: Request<{ id: string }, object, UpdateCandidateInput>,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { id } = req.params;
		const { nomineeId, name, category } = req.body;
		const file = req.file;

		const existingCandidate = await prisma.candidate.findUnique({
			where: { id },
		});

		if (!existingCandidate) {
			throw new AppError("Candidate not found", 404);
		}

		// Only lookup category if it's being updated
		let categoryId: string | undefined;
		if (category) {
			const existingCategory = await prisma.category.findUnique({
				where: { name: category },
			});

			if (!existingCategory) {
				throw new AppError("Category not found", 404);
			}
			categoryId = existingCategory.id;
		}

		// Upload new image to MinIO if provided
		let imagePath: string | undefined;
		if (file) {
			// Delete old image if exists
			if (existingCandidate.image) {
				try {
					const oldImagePath = extractObjectPath(existingCandidate.image);
					await deleteFile(oldImagePath);
				} catch {
					// Ignore delete errors for old file
				}
			}

			const extension = file.originalname.split(".").pop();
			const fileName = `${uuidv4()}.${extension}`;
			imagePath = await uploadFile(fileName, file.buffer, file.mimetype, IMAGE_FOLDER);
		}

		const candidate = await prisma.candidate.update({
			where: { id },
			data: {
				...(nomineeId !== undefined && { nomineeId }),
				...(name !== undefined && { name }),
				...(categoryId !== undefined && { categoryId }),
				...(imagePath && { image: imagePath }), // Store only object path
			},
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		const candidateWithUrl = await withImageUrl(candidate);
		sendSuccess(res, candidateWithUrl, "Candidate updated successfully");
	} catch (error) {
		next(error);
	}
};

export const destroy = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params;

		const existingCandidate = await prisma.candidate.findUnique({
			where: { id },
		});

		if (!existingCandidate) {
			throw new AppError("Candidate not found", 404);
		}

		// Delete image from MinIO if exists
		if (existingCandidate.image) {
			try {
				const imagePath = extractObjectPath(existingCandidate.image);
				await deleteFile(imagePath);
			} catch {
				// Ignore delete errors
			}
		}

		await prisma.candidate.delete({
			where: { id },
		});

		sendSuccess(res, null, "Candidate deleted successfully");
	} catch (error) {
		next(error);
	}
};

export const destroyAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const result = await prisma.candidate.deleteMany();

		sendSuccess(res, { count: result.count }, "All candidates deleted successfully");
	} catch (error) {
		next(error);
	}
};

// Remove image from candidate
export const removeImage = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params;

		const existingCandidate = await prisma.candidate.findUnique({
			where: { id },
		});

		if (!existingCandidate) {
			throw new AppError("Candidate not found", 404);
		}

		// Delete image from MinIO if exists
		if (existingCandidate.image) {
			try {
				const imagePath = extractObjectPath(existingCandidate.image);
				await deleteFile(imagePath);
			} catch {
				// Ignore delete errors
			}
		}

		const candidate = await prisma.candidate.update({
			where: { id },
			data: { image: null },
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		const candidateWithUrl = await withImageUrl(candidate);
		sendSuccess(res, candidateWithUrl, "Image removed successfully");
	} catch (error) {
		next(error);
	}
};

export const exportCandidates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const candidates = await prisma.candidate.findMany({
			orderBy: { createdAt: "asc" },
			include: {
				category: {
					select: { id: true, name: true },
				},
			},
		});

		const exportData = {
			exportedAt: new Date().toISOString(),
			totalCount: candidates.length,
			candidates: candidates.map((c) => ({
				id: c.id,
				nomineeId: c.nomineeId,
				name: c.name,
				categoryId: c.categoryId,
				categoryName: c.category.name,
				image: c.image,
				createdAt: c.createdAt.toISOString(),
			})),
		};

		sendSuccess(res, exportData, "Candidates exported successfully");
	} catch (error) {
		next(error);
	}
};

export const importCandidates = async (
	req: Request<object, object, ImportCandidatesInput>,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { candidates, skipDuplicates = true } = req.body;

		if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
			throw new AppError("No candidates provided for import", 400);
		}

		// Validate all category IDs exist
		const categoryIds = [...new Set(candidates.map((c) => c.categoryId))];
		const existingCategories = await prisma.category.findMany({
			where: { id: { in: categoryIds } },
			select: { id: true },
		});
		const existingCategoryIds = new Set(existingCategories.map((c) => c.id));

		const invalidCategoryIds = categoryIds.filter((id) => !existingCategoryIds.has(id));
		if (invalidCategoryIds.length > 0) {
			throw new AppError(`Invalid category IDs: ${invalidCategoryIds.join(", ")}`, 400);
		}

		// Check for existing candidates by id
		const existingCandidates = await prisma.candidate.findMany({
			where: {
				id: { in: candidates.map((c) => c.id) },
			},
			select: { id: true },
		});
		const existingIds = new Set(existingCandidates.map((c) => c.id));

		// Filter out duplicates if skipDuplicates is true
		const candidatesToImport = skipDuplicates ? candidates.filter((c) => !existingIds.has(c.id)) : candidates;

		if (!skipDuplicates && existingIds.size > 0) {
			throw new AppError(`Duplicate candidates found: ${Array.from(existingIds).join(", ")}`, 400);
		}

		if (candidatesToImport.length === 0) {
			sendSuccess(
				res,
				{ imported: 0, skipped: candidates.length, total: candidates.length },
				"All candidates already exist, nothing to import"
			);
			return;
		}

		// Import candidates with their original IDs
		await prisma.candidate.createMany({
			data: candidatesToImport.map((c) => ({
				id: c.id,
				nomineeId: c.nomineeId,
				name: c.name,
				categoryId: c.categoryId,
				image: c.image || null,
			})),
			skipDuplicates: true,
		});

		const imported = candidatesToImport.length;
		const skipped = candidates.length - imported;

		sendCreated(
			res,
			{ imported, skipped, total: candidates.length },
			`${imported} candidates imported successfully${skipped > 0 ? `, ${skipped} duplicates skipped` : ""}`
		);
	} catch (error) {
		next(error);
	}
};
