import type { User } from './user.entity';

export interface AuditTrail {
  id: string;
  userId: string;
  action: string;
  type: string;
  details?: string;
  timestamp: Date;
  user?: User;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}
