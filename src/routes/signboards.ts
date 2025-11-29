import { Router, Request, Response } from 'express';
import { SignboardService } from '../services/SignboardService.js';
import { SignboardTemplate } from '../types/index.js';

const router = Router();
const signboardService = new SignboardService();

// GET /api/signboards - 工事看板一覧
router.get('/', (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const signboards = projectId
      ? signboardService.getByProjectId(projectId as string)
      : signboardService.list();

    res.json({ success: true, data: signboards });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' },
    });
  }
});

// GET /api/signboards/:id - 特定の工事看板を取得
router.get('/:id', (req: Request, res: Response) => {
  try {
    const signboard = signboardService.get(req.params.id);
    if (!signboard) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '工事看板が見つかりません' } });
    }
    res.json({ success: true, data: signboard });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// POST /api/signboards - 新しい工事看板を作成
router.post('/', (req: Request, res: Response) => {
  try {
    const { projectId, title, content, template } = req.body;
    const signboard = signboardService.create({ projectId, title, content, template });
    res.status(201).json({ success: true, data: signboard, message: '工事看板を作成しました' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// PUT /api/signboards/:id - 工事看板を更新
router.put('/:id', (req: Request, res: Response) => {
  try {
    const signboard = signboardService.update(req.params.id, req.body);
    res.json({ success: true, data: signboard, message: '工事看板を更新しました' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// DELETE /api/signboards/:id - 工事看板を削除
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = signboardService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '工事看板が見つかりません' } });
    }
    res.json({ success: true, message: '工事看板を削除しました' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

export default router;
