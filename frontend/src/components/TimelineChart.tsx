/**
 * 타임라인 차트 컴포넌트 (GANTT 스타일)
 * 하루 24시간 동안의 공부 기록을 시각화합니다
 */

interface StudyLog {
  id: string;
  subject: string;
  startTime: string; // "09:00" 형식
  endTime: string;   // "10:30" 형식
  task: {
    id: string;
    title: string;
  };
}

interface TimelineChartProps {
  studyLogs: StudyLog[];
}

// 시간을 분으로 변환 ("09:00" -> 540)
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// 분을 시간 문자열로 변환 (90 -> "1시간 30분")
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

// 과목별 색상
const getSubjectColor = (subject: string) => {
  const colors: Record<string, string> = {
    KOREAN: 'bg-blue-500 hover:bg-blue-600',
    ENGLISH: 'bg-green-500 hover:bg-green-600',
    MATH: 'bg-orange-500 hover:bg-orange-600',
  };
  return colors[subject] || 'bg-gray-500 hover:bg-gray-600';
};

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = {
    KOREAN: '국어',
    ENGLISH: '영어',
    MATH: '수학',
  };
  return labels[subject] || subject;
};

export default function TimelineChart({ studyLogs }: TimelineChartProps) {
  // 시작/종료 시간이 있는 로그만 필터링
  const allValidLogs = studyLogs.filter((log) => log.startTime && log.endTime);

  // 중복 로그 병합: 같은 subject, startTime, endTime, task.id를 가진 로그는 하나로 합침
  const validLogs = allValidLogs.reduce((acc, log) => {
    const key = `${log.subject}-${log.startTime}-${log.endTime}-${log.task.id}`;
    const existing = acc.find((l) =>
      `${l.subject}-${l.startTime}-${l.endTime}-${l.task.id}` === key
    );
    if (!existing) {
      acc.push(log);
    }
    return acc;
  }, [] as StudyLog[]);

  if (validLogs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">일일 타임라인</h3>
        <p className="text-center text-gray-500 py-8">
          기록된 공부 시간이 없습니다.
        </p>
      </div>
    );
  }

  // 총 공부 시간 계산
  const totalMinutes = validLogs.reduce((sum, log) => {
    const start = parseTime(log.startTime);
    const end = parseTime(log.endTime);
    return sum + (end - start);
  }, 0);

  // 시간 가이드 라인 (6시간 간격)
  const timeMarkers = [0, 6, 12, 18, 24];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">일일 타임라인</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          총 공부 시간: <span className="font-bold text-black dark:text-white">{formatDuration(totalMinutes)}</span>
        </div>
      </div>

      {/* 타임라인 차트 */}
      <div className="space-y-3">
        {/* 시간 가이드 */}
        <div className="relative h-6 mb-2">
          <div className="absolute inset-0 flex">
            {timeMarkers.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-gray-500 dark:text-gray-400"
                style={{
                  position: 'absolute',
                  left: `${(hour / 24) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                {hour}:00
              </div>
            ))}
          </div>
        </div>

        {/* 공부 기록 막대 */}
        <div className="space-y-2">
          {validLogs.map((log) => {
            const startMinutes = parseTime(log.startTime);
            const endMinutes = parseTime(log.endTime);
            const duration = endMinutes - startMinutes;

            // 위치와 너비 계산 (24시간 = 100%)
            const left = (startMinutes / (24 * 60)) * 100;
            const width = (duration / (24 * 60)) * 100;

            return (
              <div key={log.id} className="relative h-12">
                {/* 배경 그리드 */}
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="absolute inset-0 flex">
                    {timeMarkers.slice(1).map((hour) => (
                      <div
                        key={hour}
                        className="border-l border-gray-200 dark:border-gray-600"
                        style={{
                          position: 'absolute',
                          left: `${(hour / 24) * 100}%`,
                          height: '100%',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* 공부 시간 막대 */}
                <div
                  className={`absolute h-full rounded flex items-center px-2 text-white text-xs font-medium cursor-pointer transition-all ${getSubjectColor(
                    log.subject
                  )}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: '2px',
                  }}
                  title={`${getSubjectLabel(log.subject)} - ${log.task.title}\n${log.startTime} - ${log.endTime} (${formatDuration(duration)})`}
                >
                  <span className="truncate">
                    {getSubjectLabel(log.subject)} - {log.task.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">국어</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">영어</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">수학</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
          💡 막대에 마우스를 올리면 상세 정보를 볼 수 있습니다
        </p>
      </div>
    </div>
  );
}
