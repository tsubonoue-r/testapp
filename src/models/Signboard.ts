import { Signboard, SignboardContent, SignboardTemplate } from '../types/index.js';
import { randomUUID } from 'crypto';

/**
 * 工事看板モデル
 */
export class SignboardModel {
  /**
   * 新しい工事看板を作成
   */
  static create(data: {
    projectId: string;
    title: string;
    content: SignboardContent;
    template?: SignboardTemplate;
  }): Signboard {
    const now = new Date();

    return {
      id: randomUUID(),
      projectId: data.projectId,
      title: data.title,
      content: data.content,
      template: data.template || SignboardTemplate.STANDARD,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 工事看板を更新
   */
  static update(
    signboard: Signboard,
    updates: Partial<Omit<Signboard, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
  ): Signboard {
    return {
      ...signboard,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * 工事看板の内容を更新
   */
  static updateContent(signboard: Signboard, content: Partial<SignboardContent>): Signboard {
    return this.update(signboard, {
      content: {
        ...signboard.content,
        ...content,
      },
    });
  }

  /**
   * テンプレートを変更
   */
  static changeTemplate(signboard: Signboard, template: SignboardTemplate): Signboard {
    return this.update(signboard, { template });
  }

  /**
   * バリデーション
   */
  static validate(data: Partial<Signboard>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.title && data.title.trim().length === 0) {
      errors.push('タイトルは必須です');
    }

    if (data.content) {
      if (!data.content.projectName || data.content.projectName.trim().length === 0) {
        errors.push('工事名は必須です');
      }

      if (!data.content.constructionPeriod || data.content.constructionPeriod.trim().length === 0) {
        errors.push('工事期間は必須です');
      }

      if (!data.content.contractor || data.content.contractor.trim().length === 0) {
        errors.push('施工会社は必須です');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 工事看板データをフォーマット（表示用）
   */
  static format(signboard: Signboard): string {
    const { content } = signboard;
    const lines: string[] = [
      `【${content.projectName}】`,
      `工事期間: ${content.constructionPeriod}`,
      `施工会社: ${content.contractor}`,
    ];

    if (content.supervisor) {
      lines.push(`監督者: ${content.supervisor}`);
    }

    if (content.contact) {
      lines.push(`連絡先: ${content.contact}`);
    }

    if (content.customFields) {
      Object.entries(content.customFields).forEach(([key, value]) => {
        lines.push(`${key}: ${value}`);
      });
    }

    return lines.join('\n');
  }
}
