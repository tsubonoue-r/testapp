import { Project, ProjectStatus, ListResult, Pagination } from '../types/index.js';
import { ProjectModel } from '../models/Project.js';

/**
 * 案件管理サービス
 */
export class ProjectService {
  private projects: Map<string, Project> = new Map();

  /**
   * 新しい案件を作成
   */
  create(data: {
    name: string;
    description?: string;
    location: string;
    startDate: Date;
    endDate?: Date;
  }): Project {
    const validation = ProjectModel.validate(data);
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const project = ProjectModel.create(data);
    this.projects.set(project.id, project);
    return project;
  }

  /**
   * IDで案件を取得
   */
  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /**
   * すべての案件を取得（ページネーション対応）
   */
  list(options: { page?: number; limit?: number; status?: ProjectStatus } = {}): ListResult<Project> {
    const { page = 1, limit = 10, status } = options;

    let projects = Array.from(this.projects.values());

    if (status) {
      projects = projects.filter((p) => p.status === status);
    }

    projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = projects.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = projects.slice(start, end);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 案件を更新
   */
  update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
  ): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`案件が見つかりません: ${id}`);
    }

    const validation = ProjectModel.validate({ ...project, ...updates });
    if (!validation.valid) {
      throw new Error(`バリデーションエラー: ${validation.errors.join(', ')}`);
    }

    const updated = ProjectModel.update(project, updates);
    this.projects.set(id, updated);
    return updated;
  }

  /**
   * 案件のステータスを変更
   */
  updateStatus(id: string, status: ProjectStatus): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`案件が見つかりません: ${id}`);
    }

    const updated = ProjectModel.updateStatus(project, status);
    this.projects.set(id, updated);
    return updated;
  }

  /**
   * 案件を削除
   */
  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  /**
   * 進行中の案件を取得
   */
  getActiveProjects(): Project[] {
    return Array.from(this.projects.values()).filter((p) => ProjectModel.isActive(p));
  }

  /**
   * 完了した案件を取得
   */
  getCompletedProjects(): Project[] {
    return Array.from(this.projects.values()).filter((p) => ProjectModel.isCompleted(p));
  }

  /**
   * 名前で案件を検索
   */
  search(query: string): Project[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.projects.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.location.toLowerCase().includes(lowerQuery)
    );
  }
}
