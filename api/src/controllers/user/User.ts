import type { NextFunction, Request, Response } from 'express';
import { UserRepo } from '../../typeorm/data-source';
import { UserValidation } from '../../typeorm/entities/user.entity';
import CustomError from '../../utils/CustomError';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await UserRepo.find({
            select: ['_id', 'fullName', 'email', 'role', 'createdAt', 'updatedAt']
        });
        return res.status(200).json({ success: true, users });
    } catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    if (!UserValidation.parse({ id: req.params.id }) ) {
        return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }

    try {
        const user = await UserRepo.findOne({
            where: { _id: req.params.id },
            select: ['_id', 'fullName', 'email', 'role', 'createdAt', 'updatedAt']
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const userData = UserValidation.safeParse(req.body);
    if (!userData.success) {
        return CustomError.security(400, 'Invalid user data', userData.error);
    }

    try {
        const newUser = UserRepo.create(userData.data);
        await UserRepo.save(newUser);
        return res.status(201).json({ success: true, user: newUser });
    }
    catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

export const updateEntireUser = async (req: Request, res: Response, next: NextFunction) => {
    if (!UserValidation.parse({ id: req.params.id }) ) {
        return CustomError.security(400, 'Invalid User ID');
    }
    const userData = UserValidation.safeParse(req.body);
    if (!userData.success) {
        return CustomError.security(400, 'Invalid user data', userData.error);
    }
    try {
        const user = await UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        UserRepo.merge(user, userData.data);
        const result = await UserRepo.save(user);
        return res.status(200).json({ success: true, user: result });
    } catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

export const partialUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
    if (!UserValidation.parse({ id: req.params.id }) ) {
        return CustomError.security(400, 'Invalid User ID');
    }
    const userData = UserValidation.partial().safeParse(req.body);
    if (!userData.success) {
        return CustomError.security(400, 'Invalid user data', userData.error);
    }
    try {
        const user = await UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        UserRepo.merge(user, userData.data);
        const result = await UserRepo.save(user);
        return res.status(200).json({ success: true, user: result });
    }
    catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    if (!UserValidation.parse({ id: req.params.id }) ) {
        return CustomError.security(400, 'Invalid User ID');
    }
    try {
        const user = await UserRepo.findOneBy({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await UserRepo.remove(user);
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        next(error);
        return CustomError.security(500, 'Server Error');
    }
}

