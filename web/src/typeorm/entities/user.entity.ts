export interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  middleName: string;
  email: string;
  dateOfBirth: Date;
  phoneNumber: string;
  password: string;
  stationedAt: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  role: number;
}
