/**
 * 파일 업로드 및 제한 관련 상수
 */

// 파일 크기 제한 (MB → Bytes 변환)
export const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// 파일 개수 제한
export const MAX_IMAGES_COUNT = parseInt(process.env.MAX_IMAGES_COUNT || '6', 10);
export const MAX_PDFS_COUNT = parseInt(process.env.MAX_PDFS_COUNT || '5', 10);

// 과제 학습 자료 개수 제한 (PDF + 칼럼 합산)
export const MAX_TASK_MATERIALS = parseInt(process.env.MAX_TASK_MATERIALS || '5', 10);

// Cloudinary 폴더 경로
export const CLOUDINARY_SUBMISSION_FOLDER =
  process.env.CLOUDINARY_SUBMISSION_FOLDER || 'seolstudy/submissions';
export const CLOUDINARY_WORKSHEET_FOLDER =
  process.env.CLOUDINARY_WORKSHEET_FOLDER || 'seolstudy/worksheets';

// Signed URL 만료 시간 (초)
export const SIGNED_URL_EXPIRY_SECONDS =
  parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '31536000', 10); // 기본 1년

// 히트맵 일수 범위
export const HEATMAP_DAYS = parseInt(process.env.HEATMAP_DAYS || '365', 10);

// 쿼리 결과 제한
export const DEFAULT_TASK_LIMIT = 10;
export const MAX_QUERY_LIMIT = 100;
