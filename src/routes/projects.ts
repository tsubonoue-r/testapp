import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { ProjectStatus } from '../types/index.js';

const router = Router();
const projectService = new ProjectService();

/**
 * GET /api/projects
 * 案件一覧を取得
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ProjectStatus | undefined;

    const result = projectService.list({ page, limit, status });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * GET /api/projects/:id
 * 特定の案件を取得
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = projectService.get(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * POST /api/projects
 * 新しい案件を作成
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, location, startDate, endDate } = req.body;

    const project = projectService.create({
      name,
      description,
      location,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json({
      success: true,
      data: project,
      message: '案件を作成しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * PUT /api/projects/:id
 * 案件を更新
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.startDate) {
      updates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    const project = projectService.update(id, updates);

    res.json({
      success: true,
      data: project,
      message: '案件を更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * PATCH /api/projects/:id/status
 * 案件のステータスを更新
 */
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const project = projectService.updateStatus(id, status as ProjectStatus);

    res.json({
      success: true,
      data: project,
      message: 'ステータスを更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * PATCH /api/projects/:id/archive
 * 案件をアーカイブ/アンアーカイブ
 */
// router.patch('/:id/archive', (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { archived } = req.body;
// 
//     const project = projectService.update(id, { archived: archived ? 1 : 0 });
// 
//     res.json({
//       success: true,
//       data: project,
//       message: archived ? '案件をアーカイブしました' : '案件をアンアーカイブしました',
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       error: {
//         code: 'ARCHIVE_ERROR',
//         message: error instanceof Error ? error.message : '不明なエラー',
//       },
//     });
//   }
// });

/**
 * DELETE /api/projects/:id
 * 案件を削除
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = projectService.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `案件が見つかりません: ${id}`,
        },
      });
    }

    res.json({
      success: true,
      message: '案件を削除しました',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

/**
 * GET /api/projects/search
 * 案件を検索
 */
router.get('/search/query', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '検索クエリが必要です',
        },
      });
    }

    const projects = projectService.search(query);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
});

export default router;
