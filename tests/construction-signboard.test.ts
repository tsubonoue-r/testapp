import { describe, it, expect } from 'vitest';
import { ConstructionSignboardAPI } from '../src/api/index.js';
import { ProjectStatus, SignboardTemplate } from '../src/types/index.js';

describe('工事看板写真システム', () => {
  describe('APIヘルスチェック', () => {
    it('ヘルスチェックが成功する', () => {
      const api = new ConstructionSignboardAPI();
      const health = api.health();

      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('バージョン情報を取得できる', () => {
      const api = new ConstructionSignboardAPI();
      const version = api.version();

      expect(version.name).toBe('工事看板写真システム');
      expect(version.version).toBe('1.0.0');
    });
  });

  describe('案件管理', () => {
    it('新しい案件を作成できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        description: 'テスト用の工事案件',
        location: '東京都',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      });

      expect(project.id).toBeTruthy();
      expect(project.name).toBe('テスト工事');
      expect(project.status).toBe(ProjectStatus.PLANNED);
    });

    it('案件を取得できる', () => {
      const api = new ConstructionSignboardAPI();

      const created = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const retrieved = api.projects.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('案件のステータスを更新できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const updated = api.projects.updateStatus(project.id, ProjectStatus.IN_PROGRESS);

      expect(updated.status).toBe(ProjectStatus.IN_PROGRESS);
    });

    it('案件を一覧取得できる', () => {
      const api = new ConstructionSignboardAPI();

      api.projects.create({
        name: '案件1',
        location: '東京都',
        startDate: new Date(),
      });

      api.projects.create({
        name: '案件2',
        location: '神奈川県',
        startDate: new Date(),
      });

      const list = api.projects.list();

      expect(list.items.length).toBe(2);
      expect(list.pagination.total).toBe(2);
    });
  });

  describe('工事看板管理', () => {
    it('新しい工事看板を作成できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const signboard = api.signboards.create({
        projectId: project.id,
        title: 'テスト看板',
        content: {
          projectName: 'テスト工事',
          constructionPeriod: '2025年',
          contractor: 'テスト建設',
        },
      });

      expect(signboard.id).toBeTruthy();
      expect(signboard.projectId).toBe(project.id);
      expect(signboard.template).toBe(SignboardTemplate.STANDARD);
    });

    it('工事看板の内容を更新できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const signboard = api.signboards.create({
        projectId: project.id,
        title: 'テスト看板',
        content: {
          projectName: 'テスト工事',
          constructionPeriod: '2025年',
          contractor: 'テスト建設',
        },
      });

      const updated = api.signboards.updateContent(signboard.id, {
        supervisor: '山田太郎',
      });

      expect(updated.content.supervisor).toBe('山田太郎');
    });
  });

  describe('写真管理', () => {
    it('新しい写真を登録できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const photo = api.photos.create({
        projectId: project.id,
        filename: 'test-photo.jpg',
        filepath: '/photos/test-photo.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          size: 1024000,
          format: 'jpg',
        },
      });

      expect(photo.id).toBeTruthy();
      expect(photo.projectId).toBe(project.id);
      expect(photo.filename).toBe('test-photo.jpg');
    });

    it('写真のキャプションを更新できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      const photo = api.photos.create({
        projectId: project.id,
        filename: 'test-photo.jpg',
        filepath: '/photos/test-photo.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          size: 1024000,
          format: 'jpg',
        },
      });

      const updated = api.photos.updateCaption(photo.id, 'テストキャプション');

      expect(updated.caption).toBe('テストキャプション');
    });

    it('案件IDで写真を取得できる', () => {
      const api = new ConstructionSignboardAPI();

      const project = api.projects.create({
        name: 'テスト工事',
        location: '東京都',
        startDate: new Date(),
      });

      api.photos.create({
        projectId: project.id,
        filename: 'photo1.jpg',
        filepath: '/photos/photo1.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          size: 1024000,
          format: 'jpg',
        },
      });

      api.photos.create({
        projectId: project.id,
        filename: 'photo2.jpg',
        filepath: '/photos/photo2.jpg',
        metadata: {
          width: 1920,
          height: 1080,
          size: 1024000,
          format: 'jpg',
        },
      });

      const result = api.photos.getByProjectId(project.id);

      expect(result.items.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});
