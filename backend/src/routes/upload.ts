import { Router, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGES_COUNT,
  MAX_PDFS_COUNT,
  CLOUDINARY_SUBMISSION_FOLDER,
  CLOUDINARY_WORKSHEET_FOLDER,
  SIGNED_URL_EXPIRY_SECONDS,
} from '../constants';

const router = Router();

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer 메모리 스토리지 설정 (이미지용)
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

// PDF 업로드용 별도 multer 설정
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    // PDF 타입만 허용
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`PDF 파일만 업로드 가능합니다. (현재: ${file.mimetype})`));
    }
  },
});

// Multer 에러 핸들러
const handleMulterError = (err: unknown, req: AuthRequest, res: Response, next: NextFunction) => {
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
      folder: CLOUDINARY_SUBMISSION_FOLDER,
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

// 다중 이미지 업로드
router.post('/images', (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.array('images', MAX_IMAGES_COUNT)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    // 모든 이미지 병렬 업로드
    const uploadPromises = req.files.map(async (file) => {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(base64Image, {
        folder: CLOUDINARY_SUBMISSION_FOLDER,
        resource_type: 'image',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      urls: results.map(r => r.url),
      publicIds: results.map(r => r.publicId),
      count: results.length,
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

// PDF 업로드
router.post('/pdf', (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadPdf.single('pdf')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    const base64Pdf = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const timestamp = Date.now();
    const originalName = req.file.originalname.replace(/\.[^/.]+$/, ""); // 확장자 제거
    // 한글 등 인코딩 시 길이가 급격히 늘어날 수 있으므로 safeName 길이를 제한
    const safeName = encodeURIComponent(originalName).replace(/%/g, "_").substring(0, 100);

    const result = await cloudinary.uploader.upload(base64Pdf, {
      folder: CLOUDINARY_WORKSHEET_FOLDER,
      resource_type: 'raw',
      public_id: `${safeName}_${timestamp}.pdf`,
      type: 'upload',
    });

    // Signed URL 생성
    const signedUrl = cloudinary.url(result.public_id, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRY_SECONDS,
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

// 다중 PDF 업로드
router.post('/pdfs', (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadPdf.array('pdfs', MAX_PDFS_COUNT)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    // 모든 PDF 병렬 업로드
    const uploadPromises = req.files.map(async (file) => {
      const base64Pdf = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const originalName = file.originalname.replace(/\.[^/.]+$/, ""); // 확장자 제거
      const safeName = encodeURIComponent(originalName).replace(/%/g, "_").substring(0, 100);

      const result = await cloudinary.uploader.upload(base64Pdf, {
        folder: CLOUDINARY_WORKSHEET_FOLDER,
        resource_type: 'raw',
        public_id: `${safeName}_${timestamp}_${randomId}.pdf`,
        type: 'upload',
      });

      // Signed URL 생성
      const signedUrl = cloudinary.url(result.public_id, {
        resource_type: 'raw',
        type: 'upload',
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRY_SECONDS,
      });

      return {
        url: signedUrl,
        publicId: result.public_id,
      };
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      urls: results.map(r => r.url),
      publicIds: results.map(r => r.publicId),
      count: results.length,
    });
  } catch (error) {
    console.error('Multiple PDFs upload error:', error);
    res.status(500).json({ error: 'PDF 업로드에 실패했습니다.' });
  }
});

export default router;
