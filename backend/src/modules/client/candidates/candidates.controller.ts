import type { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/index.js";
import { sendSuccess } from "@/utils/index.js";
import { getPublicUrl } from "@/services/index.js";

// Helper to add presigned image URL to candidate
const withImageUrl = async <T extends { image: string | null }>(
	candidate: T
): Promise<T & { imageUrl: string | null }> => {
	return {
		...candidate,
		imageUrl: candidate.image ? await getPublicUrl(candidate.image) : null,
	};
};

// Helper to add presigned icon URL to category
const withIconUrl = async <T extends { icon: string | null }>(category: T): Promise<T & { iconUrl: string | null }> => {
	return {
		...category,
		iconUrl: category.icon ? await getPublicUrl(category.icon) : null,
	};
};

/**
 * Get candidates by category ID
 */
export const getByCategoryId = async (
	req: Request<{ categoryId: string }>,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { categoryId } = req.params;

		// Check if category exists and is active
		const category = await prisma.category.findFirst({
			where: {
				id: categoryId,
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				icon: true,
			},
		});

		if (!category) {
			res.status(404).json({ success: false, message: "Category not found" });
			return;
		}

		// Get candidates for this category
		const candidates = await prisma.candidate.findMany({
			where: {
				categoryId: categoryId,
			},
			select: {
				id: true,
				nomineeId: true,
				name: true,
				image: true,
			},
		});

		// Sort numerically by nomineeId (convert to number for proper numerical ordering)
		candidates.sort((a, b) => {
			const numA = parseInt(a.nomineeId, 10) || 0;
			const numB = parseInt(b.nomineeId, 10) || 0;
			return numA - numB;
		});

		// Add presigned URLs
		const categoryWithUrl = await withIconUrl(category);
		const candidatesWithUrls = await Promise.all(candidates.map(withImageUrl));

		sendSuccess(
			res,
			{ category: categoryWithUrl, candidates: candidatesWithUrls },
			"Candidates fetched successfully"
		);
	} catch (error) {
		next(error);
	}
};

