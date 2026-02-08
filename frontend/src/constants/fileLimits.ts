/**
 * 파일 업로드 제한 관련 상수
 */

export const FILE_LIMITS = {
  // 파일 크기 제한 (bytes)
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_PDF_SIZE: 10 * 1024 * 1024, // 10MB

  // 파일 개수 제한
  MAX_IMAGES_COUNT: 6,
  MAX_PDFS_COUNT: 5,
  MAX_TASK_MATERIALS: 5, // 과제 학습 자료 최대 개수 (PDF + 칼럼 합산)

  // 허용되는 MIME 타입
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_PDF_TYPE: 'application/pdf',
} as const;

// 크기를 MB 단위로 변환
export const FILE_SIZE_MB = {
  IMAGE: FILE_LIMITS.MAX_IMAGE_SIZE / (1024 * 1024),
  PDF: FILE_LIMITS.MAX_PDF_SIZE / (1024 * 1024),
} as const;
