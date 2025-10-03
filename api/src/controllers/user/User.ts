import type { NextFunction, Request, Response } from "express";
import { UserRepo } from "../../typeorm/data-source";
import { UserValidation } from "../../typeorm/entities/user.entity";
import CustomError from "../../utils/CustomError";
import { z } from "zod";

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
    const users = await UserRepo.find({
      select: [
        "_id",
        "firstName",
        "lastName",
        "email",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
    return CustomError.security(500, "Server Error");
  }
};

function hasAllRequiredPutFields(body: Record<string, unknown>): boolean {
  return Required_Fields.every(f => Object.prototype.hasOwnProperty.call(body, f));
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
      select: ["_id", "email", "role", "createdAt", "updatedAt"],
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
    return res
      .status(201)
      .json({
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
      message: "Full user payload required for PUT. Missing fields detected. Use PATCH for partial updates."
    });
  }

  const parsed = UserValidation.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user data",
      errors: parsed.error.flatten ? parsed.error.flatten() : parsed.error
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
    return res.status(200).json({ success: true, user: saved,  message: "User updated successfully" });
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
      message: "No fields supplied for partial update"
    });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
            : subsetParse.error
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
            : fullParse.error
        });
      }
    }

    const saved = await UserRepo.save(user);
    return res.status(200).json({
      success: true,
      user: saved,
      message: "User updated successfully (partial)"
    });
  } catch (error) {
    return next(CustomError.security(500, "Server Error"));
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: "Invalid User ID" });
  }

  try {
    const user = await UserRepo.findOneBy({ _id: idResult.data });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await UserRepo.remove(user);
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    return next(CustomError.security(500, "Server Error"));
  }
};
