import type { NextFunction, Request, Response } from "express";
import { UserRepo } from "../../typeorm/data-source";
import { UserValidation } from "../../typeorm/entities/user.entity";
import CustomError from "../../utils/CustomError";
import { z } from "zod";
import {
  parsePageParams,
  buildLinks,
  buildPaginationMeta,
} from "../../utils/pagination";
import { AuditLogService } from "../../services/auditLogService";
import { FirebaseAuthService } from "../../services/firebaseAuthService";
import * as admin from 'firebase-admin';

const IdSchema = z.string().uuid();

//para sa updateEntireUser
const Required_Fields: (keyof any)[] = [
  "firstName",
  "lastName",
  "middleName",
  "fullName",
  "dateOfBirth",
  "phoneNumber",
  "password",
  "stationedAt",
  "role",
];

// ididisplay yung selected values pag nag get all users
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const [users, total] = await UserRepo.findAndCount({
      select: [
        "_id",
        "firstName",
        "middleName",
        "lastName",
        "extName",
        "fullName",
        "email",
        "phoneNumber",
        "dateOfBirth",
        "location",
        "badgeId",
        "approved",
        "status",
        "role",
        "createdAt",
        "updatedAt",
      ],
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    return res
      .status(200)
      .json({ success: true, data: users, pagination: meta, links });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

function hasAllRequiredPutFields(body: Record<string, unknown>): boolean {
  return Required_Fields.every((f) =>
    Object.prototype.hasOwnProperty.call(body, f)
  );
}

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const user = await UserRepo.findOne({
      where: { _id: req.params.id },
      select: [
        "_id",
        "email",
        "role",
        "approved",
        "status",
        "firstName",
        "middleName",
        "lastName",
        "extName",
        "fullName",
        "phoneNumber",
        "dateOfBirth",
        "location",
        "currentLocation",
        "badgeId",
        "avatarUrl",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userData = UserValidation.safeParse(req.body);
  if (!userData.success) {
    return CustomError.security(400, "Invalid user data", userData.error);
  }

  try {
    const newUser = UserRepo.create(userData.data);
    await UserRepo.save(newUser);
    return res.status(201).json({
      success: true,
      user: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

export const updateEntireUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  if (!hasAllRequiredPutFields(req.body)) {
    return res.status(400).json({
      success: false,
      message:
        "Full user payload required for PUT. Missing fields detected. Use PATCH for partial updates.",
    });
  }

  const parsed = UserValidation.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user data",
      errors: parsed.error.flatten ? parsed.error.flatten() : parsed.error,
    });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    UserRepo.merge(user, parsed.data);
    const saved = await UserRepo.save(user);
    return res.status(200).json({
      success: true,
      user: saved,
      message: "User updated successfully",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

export const partialUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No fields supplied for partial update",
    });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const partialSchema = (UserValidation as any).partial
      ? (UserValidation as any).partial()
      : null;

    if (partialSchema) {
      const subsetParse = partialSchema.safeParse(req.body);
      if (!subsetParse.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid user data",
          errors: subsetParse.error.flatten
            ? subsetParse.error.flatten()
            : subsetParse.error,
        });
      }
      UserRepo.merge(user, subsetParse.data);
    } else {
      UserRepo.merge(user, req.body);
      const fullParse = UserValidation.safeParse(user);
      if (!fullParse.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid user data",
          errors: fullParse.error.flatten
            ? fullParse.error.flatten()
            : fullParse.error,
        });
      }
    }

    const saved = await UserRepo.save(user);
    return res.status(200).json({
      success: true,
      user: saved,
      message: "User updated successfully (partial)",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await UserRepo.remove(user);
    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Get all pending (unapproved) users
export const getPendingUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, skip } = parsePageParams(req, 10);
    const [users, total] = await UserRepo.findAndCount({
      where: { approved: false },
      select: [
        "_id",
        "firstName",
        "lastName",
        "email",
        "role",
        "status",
        "approved",
        "createdAt",
      ],
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const meta = buildPaginationMeta(page, limit, total);
    const links = buildLinks(req, page, limit, meta.total_pages);
    return res
      .status(200)
      .json({ success: true, data: users, pagination: meta, links });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

// Approve a user
export const approveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.approved = true;
    // Optionally set status to Active when approved
    if (user.status === "Pending") {
      user.status = "Active";
    }

    // Enable Firebase account if user has one
    if (user.firebaseUid) {
      try {
        await FirebaseAuthService.enableFirebaseUser(user.firebaseUid);
      } catch (error) {
        console.error('Failed to enable Firebase user:', error);
      }
    }

    const saved = await UserRepo.save(user);

    // Log the approval action
    const currentUserId = req.user?._id;
    if (currentUserId) {
      await AuditLogService.logApproveUser(currentUserId, user._id, req);
    }

    return res.status(200).json({
      success: true,
      user: saved,
      message: "User approved successfully",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Reject/unapprove a user
export const rejectUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const { reason } = req.body;
    
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.approved = false;
    user.status = "Rejected";
    if (reason) {
      user.rejectionReason = reason;
    }

    const saved = await UserRepo.save(user);

    // Log the rejection action
    const currentUserId = req.user?._id;
    if (currentUserId) {
      await AuditLogService.logRejectUser(currentUserId, user._id, req);
    }

    return res.status(200).json({
      success: true,
      user: saved,
      message: "User account has been rejected",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Update user access permissions (admin only)
export const updateUserAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const { webAccess, appAccess } = req.body;
    
    // Ensure at least one access type is enabled
    if (webAccess === false && appAccess === false) {
      return res.status(400).json({
        success: false,
        message: "User must have at least one access type enabled",
      });
    }

    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (webAccess !== undefined) user.webAccess = webAccess;
    if (appAccess !== undefined) user.appAccess = appAccess;

    const saved = await UserRepo.save(user);

    return res.status(200).json({
      success: true,
      user: saved,
      message: "User access permissions updated successfully",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Toggle user approval status
export const toggleUserApproval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.approved = !user.approved;

    // Update status based on approval
    if (user.approved && user.status === "Pending") {
      user.status = "Active";
    } else if (!user.approved && user.status === "Active") {
      user.status = "Pending";
    }

    // Sync Firebase account status
    if (user.firebaseUid) {
      try {
        if (user.approved) {
          await FirebaseAuthService.enableFirebaseUser(user.firebaseUid);
        } else {
          await FirebaseAuthService.disableFirebaseUser(user.firebaseUid);
        }
      } catch (error) {
        console.error('Failed to sync Firebase user status:', error);
      }
    }

    const saved = await UserRepo.save(user);

    // Log the toggle action
    const currentUserId = req.user?._id;
    if (currentUserId) {
      if (user.approved) {
        await AuditLogService.logApproveUser(currentUserId, user._id, req);
      } else {
        await AuditLogService.logRevokeAccess(currentUserId, user._id, req);
      }
    }

    return res.status(200).json({
      success: true,
      user: saved,
      message: `User ${user.approved ? "approved" : "unapproved"} successfully`,
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Update user's own profile
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await UserRepo.findOneBy({ _id: userId });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Only allow updating certain fields
    const allowedFields = [
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      "phoneNumber",
      "location",
      "badgeId",
      "email",
      "avatarUrl",
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Update fullName if name fields changed
    if (updates.firstName || updates.middleName || updates.lastName) {
      const firstName = updates.firstName || user.firstName;
      const middleName = updates.middleName || user.middleName || "";
      const lastName = updates.lastName || user.lastName;
      updates.fullName = `${firstName} ${middleName} ${lastName}`
        .replace(/\s+/g, " ")
        .trim();
    }

    Object.assign(user, updates);
    const saved = await UserRepo.save(user);

    // Log profile update
    await AuditLogService.createLog({
      action: "User updated their profile",
      actionType: "UPDATE_PROFILE",
      userId,
      platform: "WEB",
      metadata: { updatedFields: Object.keys(updates) },
      req,
    });

    return res.status(200).json({
      success: true,
      data: saved,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Upload and set user's profile avatar (expects base64 image string in body.image)
import fs from "fs";
import path from "path";

export const uploadProfileAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { image } = req.body as { image?: string };
    if (!image || typeof image !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Missing image data" });
    }

    // Strip data URI prefix if present
    const base64 = image.replace(/^data:image\/[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // Ensure uploads/avatars directory exists (at project root)
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const avatarsDir = path.join(uploadsRoot, "avatars");
    fs.mkdirSync(avatarsDir, { recursive: true });

    // Save as PNG named by user id
    const filePath = path.join(avatarsDir, `${userId}.png`);
    fs.writeFileSync(
      filePath,
      Buffer.from(base64, "base64") as unknown as NodeJS.ArrayBufferView
    );

    // Compute public URL (served by static /uploads)
    const publicUrl = `/uploads/avatars/${userId}.png`;

    // Update user record
    const user = await UserRepo.findOneBy({ _id: userId });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.avatarUrl = publicUrl;
    const saved = await UserRepo.save(user);

    // Log profile update
    await AuditLogService.createLog({
      action: "User updated their avatar",
      actionType: "UPDATE_PROFILE",
      userId,
      platform: "WEB",
      metadata: { avatarUrl: publicUrl },
      req,
    });

    return res
      .status(200)
      .json({ success: true, data: saved, avatarUrl: publicUrl });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

// Archive user's own account
export const archiveUserAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await UserRepo.findOneBy({ _id: userId });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Disable Firebase account if user has one
    if (user.firebaseUid) {
      try {
        await FirebaseAuthService.disableFirebaseUser(user.firebaseUid);
      } catch (error) {
        // Continue with archiving even if Firebase disable fails
        console.error('Failed to disable Firebase user:', error);
      }
    }

    // Set account to archived status
    user.status = "Archived";
    user.approved = false;

    const saved = await UserRepo.save(user);

    // Log account archive
    await AuditLogService.createLog({
      action: "User archived their account",
      actionType: "ARCHIVE_ACCOUNT",
      userId,
      platform: "WEB",
      req,
    });

    return res.status(200).json({
      success: true,
      data: saved,
      message: "Account archived successfully",
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};
