import type { User } from "@/typeorm/entities/user.entity";

export interface DashboardProps {
    success?: boolean;
    users?: User[];
}