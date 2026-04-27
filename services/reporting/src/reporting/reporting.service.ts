import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface DashboardStats {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  completedThisWeek: number;
  completedThisMonth: number;
  totalTodos: number;
  completionRate: number;
  averagePriority: string;
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);
  private readonly todoApi = process.env.TODO_API_URL || 'http://localhost:3000/api';

  async getDashboardStats(userId: number, token?: string): Promise<DashboardStats> {
    this.logger.log(`Getting dashboard stats for user ${userId}`);
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch all todos for the user
      const todosRes = await axios.get(`${this.todoApi}/todos?limit=1000`, { headers });
      const todos = todosRes.data?.data || todosRes.data || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const stats: DashboardStats = {
        overdue: 0,
        dueToday: 0,
        dueSoon: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        totalTodos: todos.length,
        completionRate: 0,
        averagePriority: 'medium',
      };

      const priorities = { low: 1, medium: 2, high: 3 };
      let totalPriority = 0;
      let priorityCount = 0;

      for (const todo of todos) {
        const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;

        if (todo.completed) {
          const completedAt = new Date(todo.updatedAt || todo.createdAt);
          if (completedAt >= weekAgo) stats.completedThisWeek++;
          if (completedAt >= monthAgo) stats.completedThisMonth++;
        } else {
          if (dueDate) {
            if (dueDate < today) {
              stats.overdue++;
            } else if (dueDate >= today && dueDate < tomorrow) {
              stats.dueToday++;
            } else if (dueDate >= tomorrow && dueDate <= weekFromNow) {
              stats.dueSoon++;
            }
          }

          // Calculate priority
          if (todo.priority) {
            totalPriority += priorities[todo.priority as keyof typeof priorities] || 2;
            priorityCount++;
          }
        }
      }

      // Calculate completion rate
      const completed = todos.filter((t: any) => t.completed).length;
      stats.completionRate = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;

      // Calculate average priority
      if (priorityCount > 0) {
        const avgPriority = Math.round(totalPriority / priorityCount);
        stats.averagePriority = avgPriority <= 1 ? 'low' : avgPriority >= 3 ? 'high' : 'medium';
      }

      this.logger.log(`Dashboard stats calculated: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error('Error fetching dashboard stats', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async getPriorityBreakdown(userId: number, token?: string) {
    this.logger.log(`Getting priority breakdown for user ${userId}`);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const todosRes = await axios.get(`${this.todoApi}/todos?limit=1000`, { headers });
      const todos = todosRes.data?.data || todosRes.data || [];

      const breakdown = {
        low: { total: 0, completed: 0 },
        medium: { total: 0, completed: 0 },
        high: { total: 0, completed: 0 },
      };

      for (const todo of todos) {
        const priority = (todo.priority || 'medium') as keyof typeof breakdown;
        breakdown[priority].total++;
        if (todo.completed) breakdown[priority].completed++;
      }

      return breakdown;
    } catch (error) {
      this.logger.error('Error fetching priority breakdown', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async getCategoryBreakdown(userId: number, token?: string) {
    this.logger.log(`Getting category breakdown for user ${userId}`);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const todosRes = await axios.get(`${this.todoApi}/todos?limit=1000`, { headers });
      const todos = todosRes.data?.data || todosRes.data || [];

      const breakdown: Record<string, { total: number; completed: number }> = {};

      for (const todo of todos) {
        const category = todo.category || 'Uncategorized';
        if (!breakdown[category]) {
          breakdown[category] = { total: 0, completed: 0 };
        }
        breakdown[category].total++;
        if (todo.completed) breakdown[category].completed++;
      }

      return breakdown;
    } catch (error) {
      this.logger.error('Error fetching category breakdown', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async getCompletionTrend(userId: number, days: number = 30, token?: string) {
    this.logger.log(`Getting completion trend for user ${userId} (last ${days} days)`);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const todosRes = await axios.get(`${this.todoApi}/todos?limit=10000`, { headers });
      const todos = todosRes.data?.data || todosRes.data || [];

      const trend: Record<string, { completed: number; created: number }> = {};

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      for (const todo of todos) {
        const createdDate = new Date(todo.createdAt);
        const updatedDate = new Date(todo.updatedAt || todo.createdAt);

        if (createdDate >= startDate) {
          const dateKey = createdDate.toISOString().split('T')[0];
          if (!trend[dateKey]) trend[dateKey] = { completed: 0, created: 0 };
          trend[dateKey].created++;
        }

        if (todo.completed && updatedDate >= startDate) {
          const dateKey = updatedDate.toISOString().split('T')[0];
          if (!trend[dateKey]) trend[dateKey] = { completed: 0, created: 0 };
          trend[dateKey].completed++;
        }
      }

      return trend;
    } catch (error) {
      this.logger.error('Error fetching completion trend', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
}
