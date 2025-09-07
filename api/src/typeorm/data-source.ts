import { DataSource } from 'typeorm';
import config from './config/config';
import { User } from './entities/user.entity';
import { Agent } from './entities/agent.entity';
import { Admin } from './entities/admin.entity';

// Initialize the datasource/database connection
export const DB = new DataSource(config);

// Export Repository for the Entities
// https://typeorm.io/working-with-repository
const UserRepo = DB.getRepository(User);
const AgentRepo = DB.getRepository(Agent);
const AdminRepo = DB.getRepository(Admin);



export { UserRepo, AgentRepo, AdminRepo };
