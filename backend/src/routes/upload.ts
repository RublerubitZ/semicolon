import { Router, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 파일 크기 제한 (MB)
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer 메모리 스토리지 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    // 허용되는 이미지 타입
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식입니다. (${file.mimetype}) 지원 형식: JPG, PNG, GIF, WEBP`));
    }
  },
});

// Multer 에러 핸들러
const handleMulterError = (err: any, req: AuthRequest, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.`,
        code: 'FILE_TOO_LARGE',
        maxSize: `${MAX_FILE_SIZE_MB}MB`,
      });
    }
    return res.status(400).json({
      error: `파일 업로드 오류: ${err.message}`,
      code: err.code,
    });
  }
  if (err) {
    return res.status(400).json({
      error: err.message || '파일 업로드에 실패했습니다.',
    });
  }
  next();
};

router.use(authMiddleware);

// 이미지 업로드
router.post('/image', (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // Buffer를 base64로 변환하여 Cloudinary에 업로드
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'seolstudy/submissions',
      resource_type: 'image',
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

// PDF 업로드
router.post('/pdf', upload.single('pdf'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    const base64Pdf = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const timestamp = Date.now();

    const result = await cloudinary.uploader.upload(base64Pdf, {
      folder: 'seolstudy/worksheets',
      resource_type: 'raw',
      public_id: `worksheet_${timestamp}.pdf`,
      type: 'upload',
    });

    // Signed URL 생성 (1년 유효)
    const signedUrl = cloudinary.url(result.public_id, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 31536000, // 1년
    });

    res.json({
      url: signedUrl,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: 'PDF 업로드에 실패했습니다.' });
  }
});

export default router;
