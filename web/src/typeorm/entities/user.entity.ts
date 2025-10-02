export const UserValidation = {
  id: 'string',
  firstName: 'string',
  lastName: 'string',
  middleName: 'string',
  fullName: 'string',
  email: 'string',
  dateOfBirth: 'Date',
  phoneNumber: 'string',
  password: 'string',
  stationedAt: 'string',
  createdAt: 'Date',
  updatedAt: 'Date',
  isActive: 'boolean',
  role: 'number',
};

export interface User {
  _id: string;
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
