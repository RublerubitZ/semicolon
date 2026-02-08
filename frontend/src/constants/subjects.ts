/**
 * 과목 관련 상수 정의
 * 모든 컴포넌트에서 이 파일의 상수를 사용해야 합니다.
 */

export type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

export interface SubjectConfig {
  value: Subject;
  label: string;
  color: string;
  textColor: string;
}

/**
 * 기본 과목 목록
 * 색상 테마: 국어-핑크/빨강, 영어-노랑, 수학-파랑
 */
export const DEFAULT_SUBJECTS: SubjectConfig[] = [
  {
    value: 'KOREAN',
    label: '국어',
    color: 'bg-pink-100 outline-pink-300/50',
    textColor: 'text-gray-900',
  },
  {
    value: 'ENGLISH',
    label: '영어',
    color: 'bg-amber-100 outline-amber-300/30',
    textColor: 'text-gray-900',
  },
  {
    value: 'MATH',
    label: '수학',
    color: 'bg-blue-200/60 outline-blue-200',
    textColor: 'text-black',
  },
];

/**
 * 과목별 라벨 매핑
 */
export const SUBJECT_LABELS: Record<Subject, string> = {
  KOREAN: '국어',
  ENGLISH: '영어',
  MATH: '수학',
};

/**
 * 과목별 색상 매핑 (다양한 스타일용)
 */
export const SUBJECT_COLORS: Record<Subject, { primary: string; secondary: string; text: string }> = {
  KOREAN: {
    primary: 'bg-pink-100',
    secondary: 'bg-pink-50',
    text: 'text-pink-700',
  },
  ENGLISH: {
    primary: 'bg-amber-100',
    secondary: 'bg-amber-50',
    text: 'text-amber-700',
  },
  MATH: {
    primary: 'bg-blue-100',
    secondary: 'bg-blue-50',
    text: 'text-blue-700',
  },
};

/**
 * 과목별 뱃지 스타일 (bg + text 결합)
 */
export const SUBJECT_BADGE_COLORS: Record<Subject, string> = {
  KOREAN: 'bg-pink-100 text-pink-800',
  ENGLISH: 'bg-amber-100 text-amber-800',
  MATH: 'bg-blue-100 text-blue-800',
};

/**
 * 유틸리티 함수: 과목 값으로 라벨 가져오기
 */
export function getSubjectLabel(subject: string): string {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  return found ? found.label : subject;
}

/**
 * 유틸리티 함수: 과목 값으로 스타일 가져오기
 */
export function getSubjectStyles(subject: string): string {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  if (found) return `${found.color} ${found.textColor}`;
  return 'bg-gray-100 outline-gray-200 text-gray-700';
}

/**
 * 유틸리티 함수: 과목 값으로 뱃지 색상 가져오기
 */
export function getSubjectBadgeColor(subject: string): string {
  if (subject in SUBJECT_BADGE_COLORS) {
    return SUBJECT_BADGE_COLORS[subject as Subject];
  }
  return 'bg-gray-100 text-gray-700';
}

/**
 * 기본 과목 목록 (값만)
 */
export const DEFAULT_SUBJECT_VALUES: Subject[] = ['KOREAN', 'ENGLISH', 'MATH'];
