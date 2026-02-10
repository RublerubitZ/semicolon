/**
 * 과목 관련 상수 정의 (백엔드용)
 * 프론트엔드와 동일한 Subject 타입 사용
 */

export type Subject = 'KOREAN' | 'ENGLISH' | 'MATH' | 'ETC';

/**
 * 유효한 과목 목록
 */
export const VALID_SUBJECTS: Subject[] = ['KOREAN', 'ENGLISH', 'MATH', 'ETC'];

/**
 * 과목별 한글 라벨
 */
export const SUBJECT_LABELS: Record<Subject, string> = {
  KOREAN: '국어',
  ENGLISH: '영어',
  MATH: '수학',
  ETC: '기타',
};

/**
 * 유틸리티 함수: 과목 값 검증
 */
export function isValidSubject(subject: string): subject is Subject {
  return VALID_SUBJECTS.includes(subject as Subject);
}

/**
 * 유틸리티 함수: 과목 값으로 라벨 가져오기
 */
export function getSubjectLabel(subject: Subject): string {
  return SUBJECT_LABELS[subject];
}
