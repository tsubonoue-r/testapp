import { Project, ProjectStatus } from '../types/index.js';
import { randomUUID } from 'crypto';

/**
 * 案件（プロジェクト）モデル
 */
export class ProjectModel {
  /**
   * 新しい案件を作成
   */
  static create(data: {
    name: string;
    description?: string;
    location: string;
    startDate: Date;
    endDate?: Date;
  }): Project {
    const now = new Date();

    return {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      status: ProjectStatus.PLANNED,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 案件を更新
   */
  static update(
    project: Project,
    updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
  ): Project {
    return {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * 案件のステータスを変更
   */
  static updateStatus(project: Project, status: ProjectStatus): Project {
    return this.update(project, { status });
  }

  /**
   * 案件が進行中かどうか
   */
  static isActive(project: Project): boolean {
    return project.status === ProjectStatus.IN_PROGRESS;
  }

  /**
   * 案件が完了しているかどうか
   */
  static isCompleted(project: Project): boolean {
    return project.status === ProjectStatus.COMPLETED;
  }

  /**
   * バリデーション
   */
  static validate(data: Partial<Project>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.name && data.name.trim().length === 0) {
      errors.push('案件名は必須です');
    }

    if (data.location && data.location.trim().length === 0) {
      errors.push('場所は必須です');
    }

    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      errors.push('開始日は終了日より前である必要があります');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
