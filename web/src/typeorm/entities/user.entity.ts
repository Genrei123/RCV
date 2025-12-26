export interface User {
  _id?: string;
  role?: 'AGENT' | 'ADMIN' | 'USER';
  status?: 'Archived' | 'Active' | 'Pending';
  approved?: boolean;
  avatarUrl?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extName?: string;
  fullName: string;
  email: string;
  location: string;
  currentLocation?: {
    latitude: string;
    longitude: string;
  };
  dateOfBirth: string;
  phoneNumber: string;
  password?: string;
  badgeId: string;
  companyOwnerId?: string;
  isSuperAdmin?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: Partial<User>;
  pendingApproval?: boolean;
  approved?: boolean;
}
