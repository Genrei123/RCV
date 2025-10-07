export interface User {
  _id?: string;
  role?: 'AGENT' | 'ADMIN' | 'USER';
  status?: 'Archived' | 'Active' | 'Pending';
  avatarUrl?: string;
  fName: string;
  mName?: string;
  lName: string;
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
  password: string;
  badgeId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
