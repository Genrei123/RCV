import { Request, Response, NextFunction } from "express";
import {
  logout,
  me,
  refreshToken,
  userSignIn,
  userSignUp,
} from "../controllers/auth/Auth";
import { UserRepo } from "../typeorm/data-source";
import { AuditLogService } from "../services/auditLogService";
import bcryptjs from "bcryptjs";
import CryptoJS from "crypto-js";
import { createToken, verifyToken } from "../utils/JWT";
import { UserValidation } from "../typeorm/entities/user.entity";
import z from "zod";
import CustomError from "../utils/CustomError";
import { FirebaseAuthService } from "../services/firebaseAuthService";

// Mock all dependencies
jest.mock("../typeorm/data-source");
jest.mock("../services/auditLogService");
jest.mock("../services/firebaseAuthService");
jest.mock("bcryptjs");
jest.mock("crypto-js");
jest.mock("../utils/JWT");

type UserInput = z.infer<typeof UserValidation>;
const mockUser: UserInput = {
  firstName: "Juan",
  lastName: "Dela Cruz",
  extName: "Jr.",
  email: "juandelacruz@gmail.com",
  password: "securePassword123",
  badgeId: "BADGE123",
  status: "Pending",
  dateOfBirth: "1990-01-01",
  phoneNumber: "09171234567",
  location: "Manila",
  fullName: "Juan Dela Cruz Jr.",
  approved: false,
  appAccess: true,
  webAccess: false,
  walletAuthorized: false,
};

describe("Sign In", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "password123",
        rememberMe: false,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set default environment
    process.env.COOKIE_SECRET = "test-secret";
    process.env.NODE_ENV = "development";

    // Mock Firebase service to return a token
    (FirebaseAuthService.createCustomToken as jest.Mock).mockResolvedValue("firebase-custom-token-123");
  });

  describe("Error Cases", () => {
    it("should call next with error when user not found", async () => {
      // Arrange
      (UserRepo.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid email or password",
        })
      );
    });

    it("should call next with error when password is invalid", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "hashedPassword",
        role: "USER",
        approved: true,
        firstName: "John",
        lastName: "Doe",
        firebaseUid: "cxkBIq5Safft4hyafE3krH9dh5E3",
      };

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid email or password",
        })
      );
    });

    it("should return 403 when user is not approved", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "hashedPassword",
        role: "USER",
        approved: false,
        firstName: "John",
        lastName: "Doe",
        firebaseUid: "cxkBIq5Safft4hyafE3krH9dh5E3",
      };

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message:
          "Your account is pending approval. Please wait for an administrator to approve your account.",
        approved: false,
        email: "test@example.com",
      });
    });

    it("should return 500 when an unexpected error occurs", async () => {
      // Arrange
      const error = new Error("Database connection failed");
      (UserRepo.findOne as jest.Mock).mockRejectedValue(error);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Database connection failed",
        token: null,
        user: null,
      });
    });
  });

  describe("Success Cases", () => {
    it("should sign in user successfully", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "hashedPassword",
        role: "USER",
        approved: true,
        firstName: "John",
        lastName: "Doe",
        firebaseUid: "cxkBIq5Safft4hyafE3krH9dh5E3",
      };

      const mockToken = "jwt-token-123";
      const mockEncryptedCookie = "encrypted-cookie";

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(true);
      (createToken as jest.Mock).mockReturnValue(mockToken);
      (CryptoJS.DES.encrypt as jest.Mock).mockReturnValue({
        toString: () => mockEncryptedCookie,
      });
      (AuditLogService.logLogin as jest.Mock).mockResolvedValue(undefined);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(UserRepo.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: [
          "_id",
          "email",
          "password",
          "role",
          "approved",
          "firstName",
          "lastName",
          "firebaseUid",
        ],
      });

      expect(bcryptjs.compareSync).toHaveBeenCalledWith(
        "password123",
        "hashedPassword"
      );

      expect(createToken).toHaveBeenCalledWith({
        sub: "user123",
        isAdmin: false,
        iat: expect.any(Number),
      });

      expect(AuditLogService.logLogin).toHaveBeenCalledWith(
        "user123",
        req,
        "WEB"
      );

      expect(res.cookie).toHaveBeenCalledWith("token", mockEncryptedCookie, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: "/",
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User signed in successfully",
        token: mockToken,
        firebaseToken: expect.any(String),
        rememberMe: false,
        user: {
          _id: "user123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "USER",
          approved: true,
        },
      });
    });

    it("should sign in admin user with isAdmin flag", async () => {
      // Arrange
      const mockAdminUser = {
        _id: "admin123",
        email: "admin@example.com",
        password: "hashedPassword",
        role: "ADMIN",
        approved: true,
        firstName: "Admin",
        lastName: "User",
      };

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockAdminUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(true);
      (createToken as jest.Mock).mockReturnValue("admin-token");
      (CryptoJS.DES.encrypt as jest.Mock).mockReturnValue({
        toString: () => "encrypted",
      });
      (AuditLogService.logLogin as jest.Mock).mockResolvedValue(undefined);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(createToken).toHaveBeenCalledWith({
        sub: "admin123",
        isAdmin: true,
        iat: expect.any(Number),
      });
    });

    it("should set longer cookie expiry when rememberMe is true", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "hashedPassword",
        role: "USER",
        approved: true,
        firstName: "John",
        lastName: "Doe",
      };

      req.body.rememberMe = true;

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(true);
      (createToken as jest.Mock).mockReturnValue("token");
      (CryptoJS.DES.encrypt as jest.Mock).mockReturnValue({
        toString: () => "encrypted",
      });
      (AuditLogService.logLogin as jest.Mock).mockResolvedValue(undefined);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        "token",
        "encrypted",
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          rememberMe: true,
        })
      );
    });

    it("should set secure cookie in production", async () => {
      // Arrange
      process.env.NODE_ENV = "production";

      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "hashedPassword",
        role: "USER",
        approved: true,
        firstName: "John",
        lastName: "Doe",
      };

      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcryptjs.compareSync as jest.Mock).mockReturnValue(true);
      (createToken as jest.Mock).mockReturnValue("token");
      (CryptoJS.DES.encrypt as jest.Mock).mockReturnValue({
        toString: () => "encrypted",
      });
      (AuditLogService.logLogin as jest.Mock).mockResolvedValue(undefined);

      // Act
      await userSignIn(req as Request, res as Response, next);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith(
        "token",
        "encrypted",
        expect.objectContaining({
          secure: true,
        })
      );
    });
  });
});

describe("Sign Up", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: mockUser,
    } as Request;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("Error Cases", () => {
    it("should return 400 when validation fails", async () => {
      req.body = {
        firstName: "123",
        email: "invalid-email",
      };
      await userSignUp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining(
          new CustomError(400, "Validation Error", expect.any(Object))
        )
      );
    });

    it("should return 400 when email already exists", async () => {
      (UserRepo.findOneBy as jest.Mock).mockResolvedValue({
        email: "juandelacruz@gmail.com",
      });
      await userSignUp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining(
          new CustomError(400, "Email already in use", {
            email: "juandelacruz@gmail.com",
          })
        )
      );
    });
  });

  describe("Success Cases", () => {
    it("should sign up user successfully", async () => {
      (UserRepo.findOneBy as jest.Mock).mockResolvedValue(null);
      (UserRepo.save as jest.Mock).mockImplementation((user) => ({
        ...user,
        _id: "newUserId123",
      }));
      (bcryptjs.hashSync as jest.Mock).mockReturnValue("hashedPassword");
      (FirebaseAuthService.createFirebaseUser as jest.Mock).mockResolvedValue({
        firebaseUser: { uid: "cxkBIq5Safft4hyafE3krH9dh5E3" },
        dbUser: {
          _id: "newUserId123",
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          approved: false,
          firebaseUid: "cxkBIq5Safft4hyafE3krH9dh5E3",
        },
      });
      await userSignUp(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message:
          "Registration successful! Your account is pending approval. You will be notified once an administrator approves your account.",
        user: {
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          approved: false,
          firebaseUid: "cxkBIq5Safft4hyafE3krH9dh5E3",
        },
        pendingApproval: true,
      });
    });
  });
});

describe("Log Out", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  beforeEach(() => {
    req = {};
    res = {
      clearCookie: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("Error Cases", () => {
    it("should handle errors gracefully", async () => {
      (res.clearCookie as jest.Mock).mockImplementation(() => {
        throw new Error("Some error occurred");
      });
      await logout(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Logout failed",
      });
    });
  });

  describe("Success Cases", () => {
    it("should log out user successfully", async () => {
      await logout(req as Request, res as Response, next);
      expect(res.clearCookie).toHaveBeenCalledWith("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Logged out successfully",
      });
    });
  });
});

describe("Refresh Token", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      cookie: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("Error Cases", () => {
    it("should handle undefined cookies", async () => {
      req.cookies = undefined;
      await refreshToken(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        new CustomError(400, "No token provided", {
          token: null,
        })
      );
    });

    it("should handle invalid token", async () => {
      req.cookies = {
        token: "invalid-token",
      };
      (verifyToken as jest.Mock).mockReturnValue({
        success: false,
        decoded: null,
        isAdmin: false,
      });
      await refreshToken(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        new CustomError(401, "Token is invalid", {
          token: "invalid-token",
        })
      );
    });
  });

  describe("Success Cases", () => {
    it("should refresh token successfully", async () => {
      req.cookies = {
        token: "encrypted-token",
      };
      (verifyToken as jest.Mock).mockReturnValue({
        success: true,
        decoded: { sub: "user123" },
        isAdmin: false,
      });
      (createToken as jest.Mock).mockReturnValue("new-jwt-token");
      await refreshToken(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Token refreshed successfully",
        token: expect.any(String),
      });
    });
  });
});

describe("User Information", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  beforeEach(() => {
    req = {
      headers: {}, // Initialize headers
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("Error Cases", () => {
    it("should return error when no token is provided", async () => {
      req.headers = {}; // No authorization header
      await refreshToken(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        new CustomError(400, "No token provided", {
          token: null,
        })
      );
    });

    it("should return invalid token error when token is invalid", async () => {
      req.headers = {
        authorization: "Bearer invalid-token",
      };

      (verifyToken as jest.Mock).mockReturnValue(
        new CustomError(400, "Token is invalid", {
          token: req.headers.authorization,
        })
      );
    });
  });

  describe("Success Cases", () => {
    it("should return user information", async () => {
      const mockUser = {
        _id: "user123",
        firstName: "John",
        middleName: "Martson",
        lastName: "Doe",
        email: "johnmartson@gmail.com",
        phoneNumber: "09171234567",
        location: "Manila",
        role: "USER",
        badgeId: "BADGE123",
        avatarUrl: "https://firestoragebucket.io/avatar.jpg",
      };
      req.headers = {
        authorization: "Bearer valid-token",
      };
      (verifyToken as jest.Mock).mockReturnValue({
        success: true,
        decoded: { sub: "user123" },
        isAdmin: false,
      });
      (UserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      await me(req as Request, res as Response, next);
      expect(res.send).toHaveBeenCalledWith(mockUser);
    });
  });
});
