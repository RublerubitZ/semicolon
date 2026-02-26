# 설스터디 - 수능 국영수 학습 코칭 플랫폼

> 멘토와 함께하는 체계적인 수능 학습 관리 플랫폼

## 프로젝트 소개

**설스터디**는 수능 국어, 영어, 수학 학습을 위한 1:1 멘토링 기반 학습 코칭 플랫폼입니다.

### 핵심 가치
- **체계적인 학습 방법** - 멘토가 직접 설계하는 맞춤형 학습 플랜
- **실행력 향상** - 일일 플래너, 자기체크, 공부 시간 추적
- **표준화된 관리 품질** - 과목별 피드백 및 주기별 보고서 시스템

### 주요 기능

**멘티 (학생)**
- 플래너 - 일일/주간/월간 학습 계획 관리
  - 일일: 오늘의 할 일 확인, 완료 체크, 자기체크
  - 주간: 주간 학습 통계 및 달성률
  - 월간: 월간 캘린더 및 학습 현황
- 공부 시간 기록 - 과목별 학습 시간 타이머 추적
- 과제 제출 - 학습 결과물 이미지 업로드
- 피드백 확인 - 멘토의 일일/주간/월간 과목별 피드백 열람
- 보고서 - 주간/월간 학습 보고서 및 추이 분석
- 스트릭 & 히트맵 - 연속 학습 일수 및 공부 패턴 시각화
- 랭킹 - 멘티 간 학습 달성률 랭킹
- 알림 - 학습 리마인더 및 미완료 과제 알림
- 히스토리 - 과제별 제출 및 피드백 이력 조회
- 마이페이지 - 프로필 관리 및 알림 설정

**멘토 (선생님)**
- 멘티 관리 - 담당 학생 목록 및 대시보드 현황 파악
  - 일일/주간/월간 플래너 조회
  - 스트릭, 히트맵, 통계 확인
- 할 일 등록 - 학생별 맞춤 과제 생성 및 수정/승인
- 과제 코멘트 - 제출물에 코멘트 남기기
- 학습지 관리 - 칼럼/PDF 형태의 학습 자료 업로드
- 피드백 작성 - 일일/주간/월간 과목별 상세 피드백 제공
- 보고서 - 멘티별 주간/월간 학습 보고서 열람
- 랭킹 - 멘티 간 학습 달성률 비교

---

## 기술 스택

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- TailwindCSS v4
- TanStack Query v5
- Zustand v5
- Tiptap (리치 텍스트 에디터)
- Framer Motion
- React Hook Form + Zod

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM v6
- PostgreSQL
- JWT (Access + Refresh Token)
- node-cron (스케줄러)
- Winston (로거)

### Infrastructure
- Vercel (Frontend)
- Railway (Backend)
- Neon (PostgreSQL)
- Cloudinary (이미지/PDF)

---

## 프로젝트 구조

```
semicolon/
├── frontend/                 # Next.js 프론트엔드
│   └── src/
│       ├── app/
│       │   ├── mentee/           # 멘티 페이지 (모바일 최적화)
│       │   │   ├── page.tsx      # 일일 플래너 (홈)
│       │   │   ├── planner/      # 주간/월간 플래너
│       │   │   ├── calendar/     # 캘린더
│       │   │   ├── feedbacks/    # 피드백 목록
│       │   │   ├── history/      # 과제 히스토리
│       │   │   ├── reports/      # 보고서
│       │   │   └── tasks/[id]/   # 과제 상세
│       │   ├── mentor/           # 멘토 페이지 (PC 최적화)
│       │   │   ├── page.tsx      # 멘티 목록 (홈)
│       │   │   ├── mentees/      # 멘티 상세 및 플래너
│       │   │   ├── tasks/        # 과제 관리
│       │   │   ├── feedbacks/    # 피드백 관리
│       │   │   ├── worksheets/   # 학습지 관리
│       │   │   ├── reports/      # 보고서
│       │   │   └── calendar/     # 캘린더
│       │   └── login/            # 로그인
│       ├── components/       # 공통 컴포넌트
│       ├── stores/           # Zustand 스토어
│       ├── hooks/            # 커스텀 훅
│       ├── lib/              # API, 유틸리티
│       └── constants/        # 상수 정의
│
├── backend/                  # Express 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts       # 인증 (로그인, 프로필, 토큰 갱신)
│   │   │   ├── mentee.ts     # 멘티 API
│   │   │   ├── mentor.ts     # 멘토 API
│   │   │   ├── tasks.ts      # 과제 코멘트
│   │   │   ├── upload.ts     # 파일 업로드
│   │   │   ├── notification.ts # 알림
│   │   │   ├── reports.ts    # 보고서
│   │   │   └── errors.ts     # 에러 리포팅
│   │   ├── lib/
│   │   │   ├── scheduler.ts      # 알림 스케줄러
│   │   │   ├── notifications.ts  # 알림 생성 로직
│   │   │   ├── streak-manager.ts # 스트릭 관리
│   │   │   ├── heatmap-generator.ts # 히트맵 생성
│   │   │   ├── ranking-manager.ts   # 랭킹 계산
│   │   │   └── report-aggregator.ts # 보고서 집계
│   │   └── middleware/
│   │       └── auth.ts       # JWT 인증 미들웨어
│   └── prisma/
│       ├── schema.prisma     # DB 스키마
│       └── seed.ts           # 테스트 데이터
│
└── etc/                      # 문서
    ├── MVP_PLAN.md
    └── PLAN.md
```

---

## 시작하기

### 요구사항
- Node.js 20.x 이상
- PostgreSQL 15 이상

### 설치

```bash
# 저장소 클론
git clone git@github.com:RublerubitZ/semicolon.git
cd semicolon

# 백엔드 설정
cd backend
npm install
cp .env.example .env
# .env 파일에 DATABASE_URL, JWT_SECRET, CLOUDINARY_* 등 설정

# 프론트엔드 설정
cd ../frontend
npm install
```

### 환경 변수

**backend/.env**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=4000
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 데이터베이스 설정

```bash
cd backend

# 스키마 적용
npx prisma db push

# 테스트 계정 생성
npm run db:seed
```

### 실행

```bash
# 백엔드 (포트 4000)
cd backend && npm run dev

# 프론트엔드 (포트 3000)
cd frontend && npm run dev
```

---

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 멘토 | mentor@seolstudy.com | mentor123! |
| 멘티 | mentee1@seolstudy.com | mentee123! |
| 멘티 | mentee2@seolstudy.com | mentee123! |

---

## API 엔드포인트

### 인증 (`/api/auth`)
- `POST /login` - 로그인
- `GET /me` - 현재 사용자 (쿠키 기반)
- `GET /profile` - 프로필 조회
- `PATCH /update-profile` - 프로필 수정
- `PATCH /change-password` - 비밀번호 변경
- `POST /refresh` - 액세스 토큰 갱신

### 멘티 (`/api/mentee`)
- `GET /planner/daily?date=` - 일일 플래너
- `GET /planner/weekly?startDate=` - 주간 플래너
- `GET /planner/monthly?year=&month=` - 월간 플래너
- `GET /dashboard` - 대시보드
- `GET /stats` - 학습 통계
- `POST /tasks` - 할 일 추가
- `PUT /tasks/:id` - 할 일 수정
- `DELETE /tasks/:id` - 할 일 삭제
- `PATCH /tasks/:id/self-check` - 자기체크 업데이트
- `POST /tasks/:id/time` - 공부 시간 기록
- `POST /tasks/:id/submit` - 과제 제출
- `GET /daily-feedbacks` - 일일 피드백 목록
- `GET /weekly-feedbacks` - 주간 피드백 목록
- `GET /monthly-feedbacks` - 월간 피드백 목록
- `GET /reports/monthly` - 월간 보고서
- `GET /streak` - 스트릭 정보
- `GET /heatmap` - 히트맵 데이터
- `GET /ranking` - 랭킹
- `GET /notification-settings` - 알림 설정 조회
- `PATCH /notification-settings` - 알림 설정 수정

### 멘토 (`/api/mentor`)
- `GET /mentees` - 멘티 목록
- `GET /mentees/:id` - 멘티 상세
- `GET /mentees/:id/tasks` - 멘티 과제 목록
- `GET /mentees/:id/planner/daily` - 멘티 일일 플래너
- `GET /mentees/:id/planner/weekly` - 멘티 주간 플래너
- `GET /mentees/:id/planner/monthly` - 멘티 월간 플래너
- `GET /mentees/:menteeId/stats/dashboard` - 멘티 대시보드 통계
- `GET /mentees/:id/streak` - 멘티 스트릭
- `GET /mentees/:id/heatmap` - 멘티 히트맵
- `GET /ranking` - 전체 랭킹
- `POST /tasks` - 과제 생성
- `PUT /tasks/:id` - 과제 수정
- `PATCH /tasks/:id/approve` - 과제 제출 승인
- `DELETE /tasks/:id` - 과제 삭제
- `GET /feedbacks` - 피드백 목록
- `GET /mentees/:menteeId/feedbacks` - 멘티별 피드백
- `POST /feedbacks` - 피드백 작성
- `PUT /feedbacks/:id` - 피드백 수정
- `DELETE /feedbacks/:id` - 피드백 삭제
- `POST /daily-feedbacks` - 일일 피드백 작성
- `PUT /daily-feedbacks/:id` - 일일 피드백 수정
- `GET /mentees/:menteeId/daily-feedbacks` - 멘티 일일 피드백 조회
- `POST /weekly-feedbacks` - 주간 피드백 작성
- `PUT /weekly-feedbacks/:id` - 주간 피드백 수정
- `GET /mentees/:menteeId/weekly-feedbacks` - 멘티 주간 피드백 조회
- `POST /monthly-feedbacks` - 월간 피드백 작성
- `PUT /monthly-feedbacks/:id` - 월간 피드백 수정
- `GET /mentees/:menteeId/monthly-feedbacks` - 멘티 월간 피드백 조회
- `GET /worksheets` - 학습지 목록
- `POST /worksheets` - 학습지 생성
- `PUT /worksheets/:id` - 학습지 수정
- `DELETE /worksheets/:id` - 학습지 삭제

### 과제 코멘트 (`/api/tasks`)
- `POST /tasks/:taskId/comments` - 코멘트 작성
- `GET /tasks/:taskId/comments` - 코멘트 목록
- `DELETE /tasks/:taskId/comments/:commentId` - 코멘트 삭제

### 파일 업로드 (`/api/upload`)
- `POST /image` - 이미지 업로드 (단건)
- `POST /images` - 이미지 업로드 (다건)
- `POST /pdf` - PDF 업로드 (단건)
- `POST /pdfs` - PDF 업로드 (다건)

### 알림 (`/api/notifications`)
- `GET /` - 알림 목록
- `GET /unread-count` - 읽지 않은 알림 수
- `PATCH /:id/read` - 알림 읽음 처리
- `PATCH /read-all` - 전체 알림 읽음 처리

### 보고서 (`/api/reports`)
- `GET /weekly` - 주간 보고서
- `GET /monthly` - 월간 보고서
- `GET /trends` - 학습 추이

---

## 팀
- **PM**: 이승민
- **프론트엔드**: 김민석
- **백엔드**: 구승율 / 조현빈
- **UI/UX**: 공지호 / 김태희

---

## 참고 자료

- [설스터디 노션](https://malachite-fontina-5e0.notion.site/2cfa56db406080f68bd2f8624b344a63)
- [상담 신청](https://forms.gle/FchKdDcm23JdGHpK9)
