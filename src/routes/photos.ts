import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PhotoService } from '../services/PhotoService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = Router();
const photoService = new PhotoService();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アップロードディレクトリの設定
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  }
});

// GET /api/photos - 写真一覧
router.get('/', (req: Request, res: Response) => {
  try {
    const { projectId, signboardId, page, limit } = req.query;

    let result;
    if (projectId) {
      result = photoService.getByProjectId(
        projectId as string,
        { page: parseInt(page as string) || 1, limit: parseInt(limit as string) || 20 }
      );
    } else {
      result = photoService.list({ page: parseInt(page as string) || 1, limit: parseInt(limit as string) || 20 });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' },
    });
  }
});

// GET /api/photos/:id - 特定の写真を取得
router.get('/:id', (req: Request, res: Response) => {
  try {
    const photo = photoService.get(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '写真が見つかりません' } });
    }
    res.json({ success: true, data: photo });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// POST /api/photos/upload - 写真をアップロード
router.post('/upload', upload.single('photo'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'ファイルがアップロードされていません' } });
    }

    const { projectId, signboardId, caption } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'projectIdは必須です' } });
    }

    // 画像メタデータを取得（実際の実装では画像ライブラリを使用）
    const photo = photoService.create({
      projectId,
      signboardId,
      filename: req.file.originalname,
      filepath: `/uploads/${req.file.filename}`,
      caption,
      metadata: {
        width: 1920,  // 実際はsharp等で取得
        height: 1080,
        size: req.file.size,
        format: path.extname(req.file.originalname).slice(1),
      },
    });

    res.status(201).json({ success: true, data: photo, message: '写真をアップロードしました' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// PUT /api/photos/:id - 写真を更新
router.put('/:id', (req: Request, res: Response) => {
  try {
    const photo = photoService.update(req.params.id, req.body);
    res.json({ success: true, data: photo, message: '写真を更新しました' });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

// DELETE /api/photos/:id - 写真を削除
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = photoService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '写真が見つかりません' } });
    }
    res.json({ success: true, message: '写真を削除しました' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '不明なエラー' } });
  }
});

export default router;
