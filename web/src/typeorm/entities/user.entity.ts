export interface User {
  _id?: string;
  role?: 'AGENT' | 'ADMIN' | 'USER';
  status?: 'Archived' | 'Active' | 'Pending' | 'Rejected';
  rejectionReason?: string;
  webAccess?: boolean;
  appAccess?: boolean;
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
  idDocumentUrl?: string;
  selfieWithIdUrl?: string;
  walletAddress?: string;
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
