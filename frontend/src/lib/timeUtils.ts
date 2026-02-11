
/**
 * 시간 문자열(HH:MM)을 분 단위 정수로 변환
 */
export const parseMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * 분 단위 정수를 시간 문자열(HH:MM)로 변환
 */
export const formatMinutesToTime = (minutes: number): string => {
  let adjustedMinutes = minutes;
  if (adjustedMinutes >= 24 * 60) adjustedMinutes -= 24 * 60;
  
  const h = Math.floor(adjustedMinutes / 60);
  const m = adjustedMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * 두 시간 사이의 간격(분) 계산
 * 자정 넘김(23:00 ~ 01:00) 처리 포함
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  
  let duration = end - start;
  if (duration < 0) {
    duration += 24 * 60; // 자정 넘김
  }
  return duration;
};

/**
 * 시간 범위 중복 체크
 * @param targetStart 체크할 시작 시간 (HH:MM)
 * @param targetEnd 체크할 종료 시간 (HH:MM)
 * @param existingStart 기존 일정 시작 시간 (HH:MM)
 * @param existingEnd 기존 일정 종료 시간 (HH:MM)
 * @returns 중복 여부 (boolean)
 */
/** 자정을 넘기는 공부의 최대 종료 시간 (오전 4시) */
export const OVERNIGHT_MAX_HOUR = 4;

/**
 * 공부 시간 유효성 검증
 * - 시작=종료 → 무효
 * - 자정 넘김 시 종료 시간이 오전 4시 이후면 무효
 * @returns null이면 유효, 문자열이면 에러 메시지
 */
export const validateStudyTime = (startTime: string, endTime: string): string | null => {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);

  if (start === end) {
    return '시작 시간과 종료 시간이 같습니다.';
  }

  // 자정 넘김: 종료 시간이 시작 시간보다 작은 경우
  if (end < start && end > OVERNIGHT_MAX_HOUR * 60) {
    return `자정을 넘기는 경우 오전 ${OVERNIGHT_MAX_HOUR}시 이전까지만 가능합니다.`;
  }

  return null;
};

export const isTimeOverlapping = (
  targetStart: string, 
  targetEnd: string, 
  existingStart: string, 
  existingEnd: string
): boolean => {
  const start = parseMinutes(targetStart);
  let end = parseMinutes(targetEnd);

  const exStart = parseMinutes(existingStart);
  let exEnd = parseMinutes(existingEnd);

  // 자정 넘김 처리 (종료 시간이 시작 시간보다 작거나 같으면 다음날로 간주)
  if (end <= start) end += 24 * 60;
  if (exEnd <= exStart) exEnd += 24 * 60;

  // 두 구간이 겹치는지 확인
  // (A 시작 < B 종료) AND (A 종료 > B 시작)
  return start < exEnd && end > exStart;
};
