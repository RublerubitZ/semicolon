# 코드 개선사항 보고서

## 🔴 긴급 개선 필요

### 1. **대용량 파일 리팩토링**
**문제**: 일부 파일이 500줄 이상으로 유지보수가 어려움

| 파일 | 줄 수 | 문제점 | 개선 방안 |
|------|-------|--------|-----------|
| `frontend/src/app/mentee/page.tsx` | 1,813줄 | 단일 파일에 모든 로직 | 컴포넌트 분리, 커스텀 훅 추출 |
| `frontend/src/app/mentee/tasks/[id]/page.tsx` | 927줄 | 복잡한 상태 관리 | 상태 관리 라이브러리 활용 또는 컴포넌트 분리 |
| `frontend/src/app/mentor/tasks/new/page.tsx` | 872줄 | 폼 로직 중복 | 공통 폼 컴포넌트 생성 |
| `frontend/src/app/mentor/mentees/[id]/page.tsx` | 792줄 | UI와 비즈니스 로직 혼재 | 프레젠테이션/컨테이너 패턴 적용 |

**개선 예시**:
```tsx
// ❌ Before: 1,813줄의 거대한 파일
// frontend/src/app/mentee/page.tsx

// ✅ After: 분리
// frontend/src/app/mentee/page.tsx (메인)
// frontend/src/app/mentee/components/Calendar.tsx
// frontend/src/app/mentee/components/TaskList.tsx
// frontend/src/app/mentee/components/TimeTable.tsx
// frontend/src/app/mentee/hooks/useTasks.ts
// frontend/src/app/mentee/hooks/useCalendar.ts
```

### 2. **localStorage 중앙 관리 부재**
**문제**: 133곳에서 localStorage를 직접 사용

**현재**:
```typescript
// 곳곳에서 직접 사용
localStorage.getItem('token')
localStorage.setItem('user', JSON.stringify(user))
localStorage.removeItem('token')
```

**개선안**:
```typescript
// ✅ lib/storage.ts
export const storage = {
  token: {
    get: () => localStorage.getItem('token'),
    set: (value: string) => localStorage.setItem('token', value),
    remove: () => localStorage.removeItem('token'),
  },
  user: {
    get: () => {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    },
    set: (value: User) => localStorage.setItem('user', JSON.stringify(value)),
    remove: () => localStorage.removeItem('user'),
  },
  // ... 다른 키들
};

// 사용
import { storage } from '@/lib/storage';
const token = storage.token.get();
```

### 3. **프로덕션 로깅 시스템 부재**
**문제**: console.log/error가 프로덕션에서도 실행됨 (백엔드 20+곳)

**현재**:
```typescript
console.log('[Prisma] Connection health check failed');
console.error('댓글 생성 오류:', error);
```

**개선안**:
```typescript
// ✅ backend/src/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // 프로덕션에서는 파일이나 외부 서비스로 전송
    ...(process.env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: 'error.log', level: 'error' })]
      : []
    ),
  ],
});

export { logger };

// 사용
logger.error('댓글 생성 오류:', { error, taskId });
logger.info('[Prisma] Connection health check failed');
```

## 🟡 권장 개선사항

### 4. **환경 변수 문서화 부족**
**문제**: 필요한 환경 변수가 문서화되지 않음

**개선안**: `.env.example` 파일을 더 상세하게 작성

```bash
# ✅ backend/.env.example (개선)
# ===========================================
# 데이터베이스
# ===========================================
# Neon PostgreSQL 또는 일반 PostgreSQL 연결 문자열
# 형식: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://user:password@localhost:5432/seolstudy"

# ===========================================
# 인증 및 보안
# ===========================================
# JWT 비밀키 (최소 32자 이상의 랜덤 문자열 권장)
# 생성 방법: openssl rand -base64 32
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# ===========================================
# 서버 설정
# ===========================================
# 서버 포트 (기본값: 4000)
PORT=4000

# 프론트엔드 URL (CORS 설정용)
FRONTEND_URL="http://localhost:3000"

# 환경 (development | production)
NODE_ENV="development"

# ===========================================
# 파일 업로드 (Cloudinary)
# ===========================================
# Cloudinary 대시보드에서 확인 가능
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# 업로드 폴더 경로
CLOUDINARY_SUBMISSION_FOLDER="seolstudy/submissions"
CLOUDINARY_WORKSHEET_FOLDER="seolstudy/worksheets"

# ===========================================
# 파일 업로드 제한
# ===========================================
# 최대 파일 크기 (MB)
MAX_FILE_SIZE_MB=10

# 최대 업로드 개수
MAX_IMAGES_COUNT=6
MAX_PDFS_COUNT=5

# Signed URL 만료 시간 (초, 기본 1년)
SIGNED_URL_EXPIRY_SECONDS=31536000

# ===========================================
# 스케줄러 (Cron)
# ===========================================
# 일일 리마인더 알림 (매일 오전 9시)
DAILY_REMINDER_CRON="0 9 * * *"

# 미완료 과제 알림 (매일 오후 9시)
INCOMPLETE_TASK_CRON="0 21 * * *"

# 스트릭 체크 (매일 오전 1시)
STREAK_CHECK_CRON="0 1 * * *"

# 타임존 (서울)
TZ="Asia/Seoul"

# ===========================================
# 히트맵 설정
# ===========================================
HEATMAP_DAYS=365
HEATMAP_TASK_WEIGHT=30
HEATMAP_LEVEL_1=60
HEATMAP_LEVEL_2=180
HEATMAP_LEVEL_3=300
```

### 5. **API 엔드포인트 상수화**
**문제**: API 경로가 문자열로 하드코딩됨

**현재**:
```typescript
await fetch(`${getApiUrl()}/api/mentee/tasks/${item.id}/time`, ...)
await fetch(`${getApiUrl()}/api/auth/login`, ...)
```

**개선안**:
```typescript
// ✅ frontend/src/constants/apiEndpoints.ts
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
    profile: '/api/auth/profile',
  },
  mentee: {
    tasks: {
      list: '/api/mentee/tasks',
      detail: (id: string) => `/api/mentee/tasks/${id}`,
      time: (id: string) => `/api/mentee/tasks/${id}/time`,
    },
  },
  mentor: {
    tasks: {
      list: '/api/mentor/tasks',
      create: '/api/mentor/tasks',
    },
  },
} as const;

// 사용
import { apiPost } from '@/lib/api';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';

await apiPost(API_ENDPOINTS.mentee.tasks.time(item.id), data);
```

### 6. **매직 넘버 제거**
**문제**: 숫자 리터럴이 코드에 직접 사용됨

**발견된 매직 넘버들**:
```typescript
// frontend/src/constants/timeouts.ts
AUTO_LOGOUT_IDLE: 30 * 60 * 1000,  // ✅ 이미 상수화됨
TOKEN_REFRESH_INTERVAL: 25 * 60 * 1000,  // ✅ 이미 상수화됨

// 하지만 다른 곳에서는...
if (response.status === 401) { ... }  // ❌ HTTP 상태 코드
if (error.status === 404) { ... }      // ❌ HTTP 상태 코드
```

**개선안**:
```typescript
// ✅ frontend/src/constants/httpStatus.ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// 사용
if (response.status === HTTP_STATUS.UNAUTHORIZED) { ... }
```

### 7. **타입 안전성 개선**
**문제**: `any` 타입 사용

**발견된 사례**:
```typescript
submissions: any[];
studyLogs: any[];
feedbacks: any[];
```

**개선안**:
```typescript
// ✅ types/task.ts
export interface TaskSubmission {
  id: string;
  taskId: string;
  menteeId: string;
  imageUrls: string[];
  comment?: string;
  createdAt: string;
}

export interface StudyLog {
  id: string;
  menteeId: string;
  taskId?: string;
  subject: string;
  date: string;
  duration: number;
  startTime?: string;
  endTime?: string;
}

export interface Feedback {
  id: string;
  taskId: string;
  mentorId: string;
  content: string;
  summary?: string;
  subject: string;
  feedbackDate: string;
}

// 사용
interface Task {
  submissions: TaskSubmission[];
  studyLogs: StudyLog[];
  feedbacks: Feedback[];
}
```

## 🟢 추가 개선 제안

### 8. **에러 처리 표준화**
**문제**: 에러 처리가 일관성 없음

**개선안**:
```typescript
// ✅ lib/errorHandler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ApiError(500, error.message);
  }

  throw new ApiError(500, 'Unknown error occurred');
}

// 사용
try {
  const res = await apiPost('/api/tasks', data);
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
} catch (error) {
  handleApiError(error);
}
```

### 9. **React Query 도입 검토**
**문제**: 데이터 fetching 로직이 컴포넌트에 분산됨

**개선안**:
```typescript
// ✅ hooks/queries/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';

export function useTasks(date: string) {
  return useQuery({
    queryKey: ['tasks', date],
    queryFn: async () => {
      const res = await apiGet(`/api/mentee/planner/${date}`);
      return res.json();
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await apiPost('/api/mentor/tasks', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// 사용
function TaskList() {
  const { data, isLoading, error } = useTasks('2024-02-08');
  const createTask = useCreateTask();

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return <div>{/* ... */}</div>;
}
```

### 10. **환경별 설정 분리**
**문제**: 개발/프로덕션 설정이 혼재

**개선안**:
```typescript
// ✅ config/index.ts
const config = {
  development: {
    apiUrl: 'http://localhost:4000',
    enableDebug: true,
    logLevel: 'debug',
  },
  production: {
    apiUrl: 'https://semicolon-production.up.railway.app',
    enableDebug: false,
    logLevel: 'error',
  },
} as const;

const env = (process.env.NODE_ENV as keyof typeof config) || 'development';

export default config[env];
```

## 우선순위

### 즉시 적용 (1-2주)
1. ✅ **토큰 자동 갱신** (완료)
2. ✅ **DB 마이그레이션 설정** (완료)
3. 🔴 **localStorage 중앙 관리**
4. 🔴 **프로덕션 로깅 시스템**

### 단기 목표 (1개월)
5. 🟡 **대용량 파일 리팩토링** (우선순위: mentee/page.tsx)
6. 🟡 **API 엔드포인트 상수화**
7. 🟡 **환경 변수 문서화**

### 중기 목표 (2-3개월)
8. 🟢 **타입 안전성 개선**
9. 🟢 **에러 처리 표준화**
10. 🟢 **React Query 도입 검토**

## 추가 도구 추천

### 코드 품질
- **ESLint**: 이미 사용 중이면 규칙 강화
- **Prettier**: 코드 포맷팅 자동화
- **Husky**: Git hooks로 커밋 전 린트 검사
- **TypeScript strict mode**: 타입 안전성 강화

### 모니터링
- **Sentry**: 프론트/백엔드 에러 트래킹
- **LogRocket**: 사용자 세션 녹화
- **Vercel Analytics**: 프론트엔드 성능 모니터링

### 테스팅
- **Jest**: 유닛 테스트
- **Playwright**: E2E 테스트
- **React Testing Library**: 컴포넌트 테스트
