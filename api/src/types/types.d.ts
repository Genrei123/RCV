export type TSignupForm = {
  fullName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  password: string;
};

export type TSigninForm = {
  email: string;
  password: string;
};

export type TUser = {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Extend the Express Request type to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: TUser;
    }
  }
}
