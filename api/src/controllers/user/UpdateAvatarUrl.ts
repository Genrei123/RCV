import { Request, Response, NextFunction } from "express";
import { DB as AppDataSource } from "../../typeorm/data-source";
import { User } from "../../typeorm/entities/user.entity";
import CustomError from "../../utils/CustomError";
import { AuditLogService } from "../../services/auditLogService";
import { FirebaseStorageValidator } from "../../utils/FirebaseStorageValidator";

const UserRepo = AppDataSource.getRepository(User);

/**
 * Update user's avatar URL after Firebase Storage upload
 * 
 * This endpoint ONLY updates the database with the Firebase Storage URL.
 * The actual image upload is done client-side directly to Firebase Storage.
 * 
 * Security:
 * - Validates URL is from Firebase Storage
 * - Validates URL is from our bucket (rcv-flutter.firebasestorage.app)
 * - Validates URL points to avatars/ folder
 * - Validates URL points to an image file
 * 
 * Request body:
 * {
 *   "avatarUrl": "https://firebasestorage.googleapis.com/v0/b/rcv-flutter.firebasestorage.app/o/avatars%2Fuser123.jpg?alt=media&token=..."
 * }
 * 
 * @route PATCH /api/v1/user/profile/avatar-url
 */
export const updateAvatarUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { avatarUrl } = req.body;
    
    // Type validation
    if (!avatarUrl || typeof avatarUrl !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Avatar URL must be a string" });
    }

    // Security validation - comprehensive checks
    const validation = FirebaseStorageValidator.validateAvatarUrl(avatarUrl);
    if (!validation.valid) {
      return res
        .status(400)
        .json({ 
          success: false, 
          message: validation.error || "Invalid avatar URL"
        });
    }

    // Find user
    const user = await UserRepo.findOneBy({ _id: userId });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update avatar URL
    const oldAvatarUrl = user.avatarUrl;
    user.avatarUrl = avatarUrl;
    const saved = await UserRepo.save(user);

    // Log the update
    await AuditLogService.createLog({
      action: "User updated profile avatar",
      actionType: "UPDATE_PROFILE",
      userId,
      platform: req.headers["user-agent"]?.includes("Mobile") ? "MOBILE" : "WEB",
      metadata: { 
        oldAvatarUrl,
        newAvatarUrl: avatarUrl,
        filePath: FirebaseStorageValidator.extractFilePath(avatarUrl),
      },
      req,
    });

    return res.status(200).json({
      success: true,
      avatarUrl: saved.avatarUrl,
      message: "Avatar URL updated successfully",
    });
  } catch (error) {
    console.error("Error updating avatar URL:", error);
    return next(CustomError.security(500, "Failed to update avatar URL"));
  }
};

/**
 * NOTE: Remove the old uploadProfileAvatar function that saves base64 to filesystem!
 * 
 * DELETE THIS OLD FUNCTION:
 * export const uploadProfileAvatar = async (req, res, next) => {
 *   // ... old base64 upload code ...
 * }
 * 
 * It's no longer needed because:
 * 1. Images are uploaded directly to Firebase Storage from client
 * 2. This new updateAvatarUrl endpoint just stores the URL
 * 3. No more filesystem storage on API server
 */
