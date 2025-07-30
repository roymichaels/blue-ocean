import usersAgent from '../agents/users-agent';
import { User } from '../types';

class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getUserProfile(id: string): Promise<User | null> {
    return usersAgent.get(id) || null;
  }

  async updateUserRole(userId: string, role: 'user' | 'driver' | 'admin'): Promise<void> {
    const user = await this.getUserProfile(userId);
    if (!user) return;
    user.role = role;
    await usersAgent.update(user);
  }
}

export default DatabaseService;
