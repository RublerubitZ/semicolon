# 설스터디 MVP 해커톤 - 보완된 요구사항 분석 및 구현 계획

> **파일 관리**: 기존 PLAN.md는 유지하고, 새로운 MVP 요건은 `MVP_PLAN.md`로 별도 관리
> **추가 요건 우선순위**: 마이페이지 > 알림
> **제외 기능**: 1:1 채팅 (멘토 피드백으로 대체)

## 1. 요구사항 변경 요약

### 기존 계획 vs 새 MVP 요건

| 항목 | 기존 PLAN.md | 새 MVP 요건 |
|------|-------------|-------------|
| **핵심 기능** | AI 기반 학습 추천/플랜 자동 생성 | 멘토가 직접 할 일/학습지 등록 |
| **인증** | JWT + Google OAuth | 사전 세팅된 테스트 계정 (회원가입 없음) |
| **멘토-멘티** | 매칭 알고리즘 | 고정 매칭 (멘토1, 멘티2) |
| **대상 화면** | 반응형 통합 | 멘티: 모바일 웹앱 / 멘토: PC |
| **학습 진단** | 설문 기반 프로파일 | 없음 |
| **콘텐츠** | 외부 AI 추천 | 자체 학습지(칼럼/PDF) |

### 제거할 항목
- AI 학습 자료 추천 엔진 (OpenAI GPT-4 연동)
- AI 기반 학습 플랜 자동 생성
- 학습 스타일 진단 설문
- 멘토-멘티 매칭 알고리즘
- Google OAuth 소셜 로그인
- Redis 캐시 (AI 응답 캐싱용)

### 추가할 항목
- Task (할 일): 멘토가 등록하는 고정 과제
- TaskSubmission: 멘티 jpg 과제 제출
- Feedback: 할일별 상세 피드백
- Worksheet: 자체 학습지 (칼럼/PDF)
- PlannerComment: 멘티 질문/코멘트
- Notification: 과제 미완료, 피드백 알림

---

## 2. MVP 필수 요건 정리

### 2.1 로그인
- 역할별 접속 (멘티/멘토)
- 사전 세팅된 테스트 계정
- 멘토 1명, 멘티 2명

### 2.2 멘티 화면 (모바일 웹앱)

#### 플래너 (일일/주간/월간)
**일일 플래너 (메인)**
- 날짜가 상단에 표시
- 플래너 상단: 코멘트/질문 입력 영역
- 멘토 고정 '할 일' (멘티 변경 불가)
- 멘티 추가 '할 일' 등록 가능
- 할일 옆 '공부 시간 체크'
- 완료/미완료 상태 표시

**주간 플래너**
- 주 단위 캘린더 뷰
- 날짜별 할 일 요약 표시
- 날짜 클릭 시 일일 플래너로 이동
- 주간 학습 시간 통계
- 과목별 주간 달성률

**월간 플래너**
- 월간 캘린더 뷰
- 날짜별 할 일 개수 표시
- 완료율 시각화 (색상/아이콘)
- 날짜 클릭 시 일일 플래너로 이동
- 월간 학습 통계 요약

#### 과제 상세 페이지
- 할 일 클릭 → 과제 상세 이동
- 학습지 칼럼 형식 표시
- PDF 다운로드
- jpg 이미지 업로드 (과제 결과)

#### 과목별 피드백 확인
- 과목별(국/영/수) 피드백 관리
- 중요 피드백 요약 강조
- 상세 피드백 확인

### 2.3 멘토 화면 (PC 우선)

#### 담당 멘티 목록
- 학생 리스트/카드 형태
- 제출 과제 및 피드백 확인

#### 할 일 등록
- 학생별 날짜별 할 일 생성
- 할 일: 이름, 목표, 과목, 날짜, 학습지 등록

#### 피드백 작성
- 할일별 피드백 작성
- 요약 영역, 총평 작성
- 특정 날짜 피드백 업로드

---

## 3. 데이터베이스 스키마 (핵심 모델)

```prisma
// 사용자
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String
  name          String
  role          Role     @default(MENTEE)
  profileImage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  menteeTasks       Task[]           @relation("MenteeTasks")
  mentorTasks       Task[]           @relation("MentorTasks")
  submissions       TaskSubmission[]
  feedbacksGiven    Feedback[]       @relation("FeedbacksMentor")
  worksheets        Worksheet[]
  studyTimeLogs     StudyTimeLog[]
  plannerComments   PlannerComment[]
  notifications     Notification[]
  mentorRelation    MentorMentee[]   @relation("Mentor")
  menteeRelation    MentorMentee[]   @relation("Mentee")
}

enum Role {
  MENTEE
  MENTOR
  ADMIN
}

// 멘토-멘티 관계
model MentorMentee {
  id        String   @id @default(cuid())
  mentorId  String
  menteeId  String
  createdAt DateTime @default(now())

  mentor User @relation("Mentor", fields: [mentorId], references: [id])
  mentee User @relation("Mentee", fields: [menteeId], references: [id])

  @@unique([mentorId, menteeId])
}

// 할 일 (과제)
model Task {
  id          String   @id @default(cuid())
  menteeId    String
  mentorId    String?
  title       String
  description String?
  subject     Subject
  date        DateTime @db.Date
  worksheetId String?
  pdfUrl      String?
  isFixed     Boolean  @default(false) // 멘토가 등록한 고정 과제
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  mentee      User            @relation("MenteeTasks", fields: [menteeId], references: [id])
  mentor      User?           @relation("MentorTasks", fields: [mentorId], references: [id])
  worksheet   Worksheet?      @relation(fields: [worksheetId], references: [id])
  submissions TaskSubmission[]
  feedbacks   Feedback[]
  studyLogs   StudyTimeLog[]
}

enum Subject {
  KOREAN    // 국어
  ENGLISH   // 영어
  MATH      // 수학
}

// 과제 제출
model TaskSubmission {
  id        String   @id @default(cuid())
  taskId    String
  menteeId  String
  imageUrls String[]
  comment   String?
  createdAt DateTime @default(now())

  task   Task @relation(fields: [taskId], references: [id])
  mentee User @relation(fields: [menteeId], references: [id])
}

// 피드백
model Feedback {
  id           String   @id @default(cuid())
  taskId       String
  mentorId     String
  content      String
  summary      String?  // 요약
  subject      Subject
  feedbackDate DateTime @db.Date
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  task   Task @relation(fields: [taskId], references: [id])
  mentor User @relation("FeedbacksMentor", fields: [mentorId], references: [id])
}

// 학습지
model Worksheet {
  id          String        @id @default(cuid())
  createdById String
  title       String
  subject     Subject
  content     Json?         // 칼럼 형식 콘텐츠
  pdfUrl      String?
  type        WorksheetType @default(COLUMN)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  createdBy User   @relation(fields: [createdById], references: [id])
  tasks     Task[]
}

enum WorksheetType {
  COLUMN
  PDF
}

// 공부 시간 기록
model StudyTimeLog {
  id       String   @id @default(cuid())
  menteeId String
  taskId   String?
  subject  Subject
  date     DateTime @db.Date
  duration Int      // 분 단위
  createdAt DateTime @default(now())

  mentee User  @relation(fields: [menteeId], references: [id])
  task   Task? @relation(fields: [taskId], references: [id])
}

// 플래너 코멘트/질문
model PlannerComment {
  id        String   @id @default(cuid())
  menteeId  String
  date      DateTime @db.Date
  content   String
  createdAt DateTime @default(now())

  mentee User @relation(fields: [menteeId], references: [id])
}

// 알림
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  content   String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id])
}

enum NotificationType {
  TASK_INCOMPLETE   // 과제 미완료
  NEW_FEEDBACK      // 새 피드백
  REMINDER          // 리마인더
}

// 리마인더 (알림 예약)
model Reminder {
  id            String         @id @default(cuid())
  taskId        String
  menteeId      String
  scheduledAt   DateTime       // 알림 발송 예정 시각
  type          ReminderType   @default(BEFORE_DUE)
  minutesBefore Int            @default(60)  // 마감 몇 분 전 (기본 1시간)
  isSent        Boolean        @default(false)
  sentAt        DateTime?      // 실제 발송 시각
  createdAt     DateTime       @default(now())

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  mentee User @relation(fields: [menteeId], references: [id])

  @@index([scheduledAt, isSent])  // 발송 대기 조회용
  @@index([menteeId])
}

enum ReminderType {
  BEFORE_DUE        // 마감 전 알림
  MORNING           // 아침 알림 (오늘 할 일 요약)
  EVENING           // 저녁 알림 (미완료 과제 리마인드)
  CUSTOM            // 사용자 지정 시간
}

// 사용자별 알림 설정
model UserNotificationSetting {
  id                    String   @id @default(cuid())
  userId                String   @unique
  enableReminder        Boolean  @default(true)
  morningReminderTime   String?  // "08:00" 형식
  eveningReminderTime   String?  // "21:00" 형식
  defaultMinutesBefore  Int      @default(60)  // 기본 마감 전 알림 시간
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

---

## 4. API 엔드포인트 (핵심)

### 인증
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 멘티 API
**플래너**
- `GET /api/mentee/planner/daily?date=` - 일일 플래너 (해당 날짜 할 일 + 코멘트)
- `GET /api/mentee/planner/weekly?startDate=` - 주간 플래너 (주간 할 일 + 통계)
- `GET /api/mentee/planner/monthly?year=&month=` - 월간 플래너 (월간 할 일 + 통계)

**할 일**
- `POST /api/mentee/tasks` - 할 일 추가 (멘티 자체 등록)
- `PATCH /api/mentee/tasks/:id/complete` - 완료 처리
- `POST /api/mentee/tasks/:id/time` - 공부 시간 기록
- `GET /api/mentee/tasks/:id` - 과제 상세
- `POST /api/mentee/tasks/:id/submit` - 과제 제출 (이미지 업로드)

**피드백 & 기타**
- `GET /api/mentee/feedbacks` - 피드백 목록 (과목별 필터)
- `GET /api/mentee/feedbacks/:id` - 피드백 상세
- `POST /api/mentee/comments` - 코멘트/질문 작성
- `GET /api/mentee/stats` - 통계 (과목별 달성률, 주간/월간 포함)

### 멘토 API
**멘티 관리**
- `GET /api/mentor/mentees` - 담당 멘티 목록
- `GET /api/mentor/mentees/:id` - 멘티 상세 (할 일, 제출물, 피드백)
- `GET /api/mentor/mentees/:id/planner/daily?date=` - 멘티 일일 플래너 조회
- `GET /api/mentor/mentees/:id/planner/weekly?startDate=` - 멘티 주간 플래너 조회
- `GET /api/mentor/mentees/:id/planner/monthly?year=&month=` - 멘티 월간 플래너 조회

**할 일 & 피드백**
- `POST /api/mentor/tasks` - 할 일 생성 (고정 과제)
- `PUT /api/mentor/tasks/:id` - 할 일 수정
- `DELETE /api/mentor/tasks/:id` - 할 일 삭제
- `POST /api/mentor/feedbacks` - 피드백 작성
- `PUT /api/mentor/feedbacks/:id` - 피드백 수정

**학습지**
- `GET /api/mentor/worksheets` - 학습지 목록
- `POST /api/mentor/worksheets` - 학습지 생성

### 파일 업로드
- `POST /api/upload/image` - jpg 업로드 (Cloudinary)
- `POST /api/upload/pdf` - PDF 업로드 (Cloudinary)

### 알림
- `GET /api/notifications` - 알림 목록
- `PATCH /api/notifications/:id/read` - 읽음 처리

### 리마인더
- `GET /api/reminders` - 내 리마인더 목록
- `POST /api/reminders` - 리마인더 생성 (특정 과제에 대해)
- `PUT /api/reminders/:id` - 리마인더 수정
- `DELETE /api/reminders/:id` - 리마인더 삭제
- `GET /api/reminders/settings` - 알림 설정 조회
- `PUT /api/reminders/settings` - 알림 설정 수정

### 리마인더 처리 (서버 내부/크론)
- `POST /api/internal/reminders/process` - 발송 대기 리마인더 처리 (크론잡)

---

## 5. 프론트엔드 페이지 구조

```
/
├── /                         # 메인 랜딩 페이지 (로그인 전)
├── /login                    # 로그인 페이지

├── (mentee)/                 # 멘티 그룹 (모바일 웹앱)
│   ├── /                     # 일일 플래너 (메인)
│   ├── /planner/weekly       # 주간 플래너
│   ├── /planner/monthly      # 월간 플래너
│   ├── /tasks/[id]           # 과제 상세
│   ├── /feedbacks            # 피드백 목록
│   ├── /feedbacks/[id]       # 피드백 상세
│   ├── /mypage               # 마이페이지
│   └── /notifications        # 알림

├── (mentor)/                 # 멘토 그룹 (PC 우선)
│   ├── /                     # 담당 멘티 목록 (대시보드)
│   ├── /mentees/[id]         # 멘티 상세
│   ├── /mentees/[id]/planner # 멘티 일일 플래너 조회
│   ├── /mentees/[id]/planner/weekly   # 멘티 주간 플래너 조회
│   ├── /mentees/[id]/planner/monthly  # 멘티 월간 플래너 조회
│   ├── /tasks/new            # 할 일 생성
│   ├── /tasks/[id]/edit      # 할 일 수정
│   ├── /feedbacks/new        # 피드백 작성
│   ├── /feedbacks/[id]/edit  # 피드백 수정
│   ├── /worksheets           # 학습지 관리
│   └── /worksheets/new       # 학습지 생성
```

---

## 6. 핵심 컴포넌트

### 랜딩 페이지
- `Hero.tsx` - 히어로 섹션
- `Features.tsx` - 서비스 소개
- `CTAButton.tsx` - 로그인/시작하기 버튼

### 공통
- `Header.tsx` - 헤더 (역할별 다름)
- `BottomNav.tsx` - 하단 네비게이션 (멘티 모바일)
- `Sidebar.tsx` - 사이드바 (멘토 PC)
- `SubjectBadge.tsx` - 과목 뱃지 (국/영/수)

### 플래너 (멘티)
**일일 플래너**
- `DailyPlanner.tsx` - 일일 플래너 메인
- `TaskItem.tsx` - 할 일 아이템
- `TaskForm.tsx` - 할 일 추가 폼
- `StudyTimeInput.tsx` - 공부 시간 입력
- `PlannerCommentInput.tsx` - 코멘트/질문 입력

**주간 플래너**
- `WeeklyPlanner.tsx` - 주간 플래너 메인
- `WeekCalendarView.tsx` - 주간 캘린더 뷰
- `WeeklyStats.tsx` - 주간 통계 (학습 시간, 달성률)
- `DayTaskSummary.tsx` - 날짜별 할 일 요약

**월간 플래너**
- `MonthlyPlanner.tsx` - 월간 플래너 메인
- `MonthCalendar.tsx` - 월간 캘린더
- `MonthlyStats.tsx` - 월간 통계
- `CalendarDateCell.tsx` - 캘린더 날짜 셀 (완료율 표시)

### 과제 (멘티)
- `TaskDetail.tsx` - 과제 상세
- `WorksheetViewer.tsx` - 학습지 뷰어 (칼럼/PDF)
- `ImageUploader.tsx` - 이미지 업로드
- `SubmissionPreview.tsx` - 제출물 미리보기

### 피드백 (멘티)
- `FeedbackList.tsx` - 피드백 목록
- `FeedbackCard.tsx` - 피드백 카드
- `FeedbackDetail.tsx` - 피드백 상세
- `SubjectFilter.tsx` - 과목 필터

### 멘티 관리 (멘토)
- `MenteeList.tsx` - 멘티 목록
- `MenteeCard.tsx` - 멘티 카드
- `MenteeDetail.tsx` - 멘티 상세
- `TaskCreateForm.tsx` - 할 일 생성 폼
- `FeedbackForm.tsx` - 피드백 작성 폼
- `WorksheetManager.tsx` - 학습지 관리

### 마이페이지
- `ProfileCard.tsx` - 프로필 카드
- `SubjectProgressChart.tsx` - 과목별 달성률 차트
- `ConsultButton.tsx` - 상담받아보기 버튼

---

## 7. 개발 일정 (5일)

### Day 1: 기본 인프라 + 인증
- [x] 프로젝트 초기 설정 (Next.js + Express + Prisma)
- [x] DB 스키마 작성 및 마이그레이션
- [x] 테스트 계정 시드 데이터
- [x] 로그인 API + 페이지
- [x] 역할별 라우팅 미들웨어

### Day 2: 멘티 플래너 (일일/주간/월간)
- [x] 멘티 레이아웃 (모바일 최적화)
- [x] 일일 플래너 UI
- [x] 할 일 목록 API 연동
- [x] 할 일 완료/시간 기록
- [x] 코멘트/질문 입력
- [x] 주간 플래너 뷰
- [x] 월간 플래너 뷰
- [x] 플래너 통계 API 연동

### Day 3: 과제 상세 + 멘토 화면
- [x] 과제 상세 페이지
- [x] 학습지 뷰어 (칼럼/PDF)
- [x] 이미지 업로드 (Cloudinary)
- [x] 멘토 레이아웃 (PC)
- [x] 멘티 목록
- [x] 할 일 등록 폼

### Day 4: 피드백 + 기능 완성
- [x] 멘토 피드백 작성
- [x] 멘티 피드백 확인
- [x] 과목별 필터링
- [x] 피드백 요약 표시

### Day 5: 추가 기능 + 배포
- [x] **마이페이지** (프로필, 과목별 달성률, 상담 버튼)
- [x] 월간 캘린더
- [x] 버그 수정 + QA
- [x] Vercel + Railway 배포
- [ ] (선택) 알림 시스템

### 추가 완료된 기능 (2026-02-03)
- [x] **아이콘 시스템**: react-icons 설치 및 Edit/Delete 아이콘 적용
  - [x] `/frontend/src/components/icons.ts` 생성
  - [x] 멘티 플래너 수정/삭제 아이콘 적용
  - [x] 멘토 학습지/과제 수정/삭제 아이콘 적용
- [x] **과제 제출 검증 로직 개선**
  - [x] 멘토 생성 과제(isFixed=true): 이미지 업로드 필수
  - [x] 멘티 생성 과제(isFixed=false): 이미지 또는 코멘트 선택
  - [x] 동적 UI 라벨 표시
- [x] **상태 관리 버그 수정**
  - [x] 과제 제출 모달 isUploading 상태 초기화
  - [x] 버튼 활성화 로직 개선

---

## 8. 테스트 계정

```
멘토: mentor@seolstudy.com / mentor123!
멘티1: mentee1@seolstudy.com / mentee123!
멘티2: mentee2@seolstudy.com / mentee123!
```

### 시드 데이터
- 멘토 1명 ↔ 멘티 2명 고정 매칭
- 샘플 할 일 (각 멘티별 3개)
- 샘플 학습지 (국/영/수 각 1개)
- 샘플 피드백 (각 과목별 1개)

---

## 9. 수정/생성 대상 파일

| 파일 | 작업 |
|------|------|
| `PLAN.md` | 유지 (기존 아이디어 보관) |
| `MVP_PLAN.md` | **신규 생성** - 해커톤 MVP 요건 (현재 파일) |
| `backend/prisma/schema.prisma` | 새 스키마로 교체 |
| `backend/prisma/seed.ts` | 테스트 계정 + 샘플 데이터 |
| `backend/src/routes/` | API 엔드포인트 |
| `backend/src/middleware/auth.ts` | 인증 미들웨어 |
| `frontend/src/app/(mentee)/` | 멘티 페이지 그룹 |
| `frontend/src/app/(mentor)/` | 멘토 페이지 그룹 |
| `frontend/src/app/login/` | 로그인 페이지 |

---

## 10. 검증 계획

1. **로그인**: 테스트 계정으로 멘티/멘토 화면 분기 확인
2. **플래너**: 날짜 이동, 할 일 추가/완료/시간 기록
3. **과제**: PDF 다운로드, 이미지 업로드
4. **피드백**: 멘토 작성 → 멘티 확인 플로우
5. **마이페이지**: 프로필 표시, 달성률 차트

---

## 11. 기술 스택 (MVP 최적화)

### 프론트엔드
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Zustand (상태 관리)
- React Hook Form + Zod (폼 검증)
- date-fns (날짜 처리)

### 백엔드
- Node.js 20 LTS
- Express.js + TypeScript
- Prisma (ORM)
- PostgreSQL (Neon)
- JWT (인증)

### 인프라
- Vercel (프론트엔드)
- Railway (백엔드)
- Neon (PostgreSQL)
- Cloudinary (이미지/PDF)

---

## 12. 리마인더 시스템 (확장 기능)

### 12.1 개요
과제 마감 전 또는 특정 시간에 멘티에게 알림을 발송하는 시스템

### 12.2 리마인더 유형

| 유형 | 설명 | 기본 시간 |
|------|------|----------|
| `BEFORE_DUE` | 과제 마감 전 알림 | 마감 1시간 전 |
| `MORNING` | 아침 알림 (오늘 할 일 요약) | 08:00 |
| `EVENING` | 저녁 알림 (미완료 과제 리마인드) | 21:00 |
| `CUSTOM` | 사용자 지정 시간 | 사용자 설정 |

### 12.3 리마인더 생성 시점

1. **자동 생성**
   - 멘토가 과제(Task) 생성 시 → `BEFORE_DUE` 리마인더 자동 생성
   - 매일 자정 → 다음 날 `MORNING`, `EVENING` 리마인더 배치 생성

2. **수동 생성**
   - 멘티가 특정 과제에 대해 커스텀 리마인더 추가

### 12.4 알림 발송 플로우

```
[크론잡 (매 분 실행)]
    ↓
scheduledAt <= NOW AND isSent = false 인 리마인더 조회
    ↓
각 리마인더에 대해:
  1. Notification 레코드 생성 (앱 내 알림)
  2. (선택) 푸시 알림 발송 (FCM/APNs)
  3. (선택) 이메일 발송
  4. Reminder.isSent = true, sentAt = NOW 업데이트
```

### 12.5 scheduledAt 계산 로직

```typescript
// BEFORE_DUE: 과제 마감일 - minutesBefore
// 예: 마감일 2024-01-15, minutesBefore = 60
// → scheduledAt = 2024-01-14 23:00:00

const task = { date: new Date('2024-01-15') }; // 마감일 (00:00:00)
const minutesBefore = 60;

// 마감일을 23:59:59로 설정 (하루의 끝)
const dueDateTime = new Date(task.date);
dueDateTime.setHours(23, 59, 59, 0);

// minutesBefore 만큼 빼기
const scheduledAt = new Date(dueDateTime.getTime() - minutesBefore * 60 * 1000);
// 결과: 2024-01-15 22:59:59 (마감 1시간 전)
```

### 12.6 사용자 설정

```typescript
interface UserNotificationSetting {
  enableReminder: boolean;        // 알림 활성화 여부
  morningReminderTime: string;    // "08:00"
  eveningReminderTime: string;    // "21:00"
  defaultMinutesBefore: number;   // 60 (1시간 전)
}
```

### 12.7 구현 우선순위

| 단계 | 기능 | 설명 |
|------|------|------|
| **Phase 1** | 기본 리마인더 | Task 생성 시 BEFORE_DUE 자동 생성 + 앱 내 알림 |
| **Phase 2** | 알림 설정 | 사용자별 알림 시간/활성화 설정 |
| **Phase 3** | 정기 알림 | MORNING/EVENING 배치 생성 |
| **Phase 4** | 푸시 알림 | FCM 연동 (모바일 푸시) |

### 12.8 크론잡 설정 (Railway/Vercel)

```javascript
// Railway: cron job 또는 외부 서비스 (cron-job.org)
// 매 분 실행: * * * * *

// API 엔드포인트
POST /api/internal/reminders/process
Header: X-Cron-Secret: <secret>
```

### 12.9 관련 UI

**멘티 화면**
- 과제 상세 페이지: "알림 설정" 버튼 → 리마인더 시간 선택
- 마이페이지 > 알림 설정: 기본 알림 시간 설정, 알림 ON/OFF

**멘토 화면**
- 과제 생성 시: "알림 발송" 체크박스, 알림 시간 선택

---

## 13. 플래너 확장 기능

### 13.1 개요
기존 할일 관리 + 타임테이블 기반 학습 기록 시스템으로 확장

### 13.2 스키마 변경

```prisma
// 멘티 자가점검 상태
enum SelfCheckStatus {
  PENDING      // 미시작 (○)
  IN_PROGRESS  // 진행 중 (△)
  DONE         // 완료 (V)
  NOT_DONE     // 미진행 (X)
}

model Task {
  // 기존 필드 유지
  id          String   @id @default(cuid())
  menteeId    String
  mentorId    String?
  title       String
  description String?
  subject     String
  date        DateTime @db.Date
  worksheetId String?
  pdfUrl      String?
  isFixed     Boolean  @default(false)

  // [NEW] 멘티 자가점검 (V, △, X, ○) - 멘토에게 보여주기용
  selfCheck       SelfCheckStatus @default(PENDING)
  selfCheckedAt   DateTime?       // 자가점검 시간

  // [NEW] 멘토 승인 (달성률 반영)
  isApproved      Boolean   @default(false)
  approvedAt      DateTime?
  approvedBy      String?   // 승인한 멘토 ID

  // 기존 isCompleted는 deprecated → isApproved로 대체
  // isCompleted  Boolean  @default(false)  // 제거 예정

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations...
}

// StudyTimeLog 확장 (타임테이블 지원)
model StudyTimeLog {
  id        String   @id @default(cuid())
  menteeId  String
  taskId    String?
  subject   String
  date      DateTime @db.Date

  // 기존 (하위 호환)
  duration  Int      // 분 단위 총 시간

  // 새로 추가 (타임테이블용)
  startTime String?  // "06:00" 형식
  endTime   String?  // "07:30" 형식

  createdAt DateTime @default(now())

  mentee User  @relation(fields: [menteeId], references: [id])
  task   Task? @relation(fields: [taskId], references: [id])

  @@index([menteeId, date])
}
```

### 13.3 할 일 목록 (Task Management)

#### 과목별 그룹화
- 국어, 영어, 수학, 기타과목 등 과목별로 할 일을 묶어서 표시
- 각 그룹 내에서 생성, 수정, 삭제 가능

#### 2단계 상태 체크 시스템

**1. 멘티 자가점검 (selfCheck)** - 멘토에게 제출/보고용
| 상태 | 아이콘 | 설명 | 색상 |
|------|--------|------|------|
| `DONE` | ✓ (V) | 완료했다고 생각함 | 녹색 테두리 |
| `IN_PROGRESS` | △ | 일부 진행함 | 노란색 테두리 |
| `NOT_DONE` | ✗ (X) | 못했음 (솔직한 자가점검) | 빨간색 테두리 |
| `PENDING` | ○ | 아직 시작 안함 | 회색 테두리 |

> ⚠️ **멘티 자가점검은 달성률에 반영되지 않음!**
> 멘토에게 "이만큼 했어요"를 보여주는 용도

**2. 멘토 승인 (isApproved)** - 실제 달성률 반영
| 상태 | 아이콘 | 설명 | 효과 |
|------|--------|------|------|
| 승인됨 | ✅ | 멘토가 완료 확인함 | **달성률 +1** |
| 미승인 | ⬜ | 아직 확인 안됨 | 달성률 반영 X |

> ✅ **멘토가 승인해야만 달성률이 올라감!**

#### UI 표시 예시
```
┌─────────────────────────────────────────────────┐
│         [멘티 자가점검]      [멘토 승인]        │
├─────────────────────────────────────────────────┤
│  📘 국어 독서 30분                        🔒   │
│     멘티: ✓완료  →  멘토: ✅승인됨             │
├─────────────────────────────────────────────────┤
│  📗 영어 단어 암기                              │
│     멘티: △진행중  →  멘토: ⬜대기중           │
├─────────────────────────────────────────────────┤
│  📙 수학 기출문제                         🔒   │
│     멘티: ✗못함  →  멘토: ⬜대기중             │
└─────────────────────────────────────────────────┘

[오늘의 달성률: 1/3 = 33%]  ← 멘토 승인 기준!
```

#### 달성률 계산 공식
```typescript
// 달성률 = 멘토 승인된 과제 / 전체 과제
const approvedTasks = tasks.filter(t => t.isApproved).length;
const totalTasks = tasks.length;
const completionRate = (approvedTasks / totalTasks) * 100;

// 멘티 자가점검(selfCheck)은 달성률에 영향 없음!
// 오직 멘토가 승인(isApproved=true)해야 달성률 상승
```

#### 워크플로우
```
[멘티]                          [멘토]
  │                               │
  ├── 과제 수행                    │
  │                               │
  ├── 자가점검 (V/△/X) ──────────▶│ 멘티 진행상황 확인
  │                               │
  │                               ├── 과제 검토
  │                               │
  |                               |- 과제 제출 및 달성률 반영
  │◀─────────────────────────────── 승인 (✅)
  │                               │
  └── 달성률 확인                  │
```

#### 멘토 고정 과제
- 멘토가 등록한 과제는 삭제/수정 불가
- 🔒 자물쇠 아이콘 + "멘토 요청" 뱃지로 표시
- 멘티는 자가점검(V, △, X)만 가능

#### 자체 할 일 추가
- 멘티가 스스로 공부할 내용 추가 가능
- 과목 선택 또는 직접 입력 (기타)
- 멘토가 승인하면 달성률에 반영

### 13.4 타임테이블 및 학습 기록 (Time Tracking)

#### 시간대별 시각화
```
[타임테이블 UI]
06:00 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
07:00 ┃████████████░░░░░░░░░░░░░░░░░░░░  ← 국어 (1시간)
08:00 ┃░░░░░░░░░░░░████████████████████  ← 수학 (1.5시간)
09:00 ┃████████████████████████████████
10:00 ┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
...
```

- **시간 범위**: 06시 ~ 익일 05시 (24시간)
- **시각화**: 과목별 색상 블록으로 표시
- **입력 방식**:
  - 터치/드래그로 시간 블록 선택
  - 또는 시작/종료 시간 직접 입력

#### 총 학습 시간 자동 계산
```
┌─────────────────────────────────┐
│  📊 TOTAL TIME: 4시간 30분      │
│  ├ 국어: 1시간 00분             │
│  ├ 수학: 2시간 00분             │
│  └ 영어: 1시간 30분             │
└─────────────────────────────────┘
```

### 13.5 메모 및 코멘트 (Memo Area)

#### 데일리 메모
- 학습 중 느낀 점, 어려웠던 부분 기록
- 자유 텍스트 입력

#### 멘토 질문하기
- 메모 영역에 입력된 내용은 멘토 화면에 즉시 공유
- 멘토가 피드백 작성 시 참고

### 13.6 UI 구조

```
[플래너 메인 페이지]
┌─────────────────────────────────────┐
│  📅 2024년 1월 15일 (월)    [일|주|월] │
├─────────────────────────────────────┤
│  [할일 목록] [타임테이블]  ← 탭 전환   │
├─────────────────────────────────────┤
│                                     │
│  ▼ 📘 국어                          │
│  ┌─────────────────────────────┐   │
│  │ [V] 독서 30분        🔒     │   │
│  │ [△] 문법 복습              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▼ 📗 영어                          │
│  ┌─────────────────────────────┐   │
│  │ [○] 단어 암기 50개          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▼ 📙 수학                          │
│  ┌─────────────────────────────┐   │
│  │ [X] 기출문제 풀이     🔒    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ 할 일 추가]                      │
│                                     │
├─────────────────────────────────────┤
│  💬 오늘의 메모/질문                 │
│  ┌─────────────────────────────┐   │
│  │ 수학 3번 문제 잘 모르겠어요...│   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

```
[타임테이블 탭]
┌─────────────────────────────────────┐
│  📊 총 학습시간: 4시간 30분          │
├─────────────────────────────────────┤
│  06 ┃                               │
│  07 ┃██████████  국어               │
│  08 ┃          ████████████  수학   │
│  09 ┃████████████████████████       │
│  10 ┃                               │
│  11 ┃████████████████  영어         │
│  12 ┃████████                       │
│  ...                                │
├─────────────────────────────────────┤
│  [+ 학습 시간 추가]                  │
│                                     │
│  과목: [국어 ▼]                     │
│  시작: [14:00]  종료: [15:30]       │
│  [저장]                             │
└─────────────────────────────────────┘
```

### 13.7 API 변경/추가

```
# ========== 멘티 API ==========

# 멘티 자가점검 (V, △, X, ○) - 달성률 영향 없음
PATCH /api/mentee/tasks/:id/self-check
Body: { selfCheck: "DONE" | "IN_PROGRESS" | "NOT_DONE" | "PENDING" }
Response: { task, message: "자가점검이 저장되었습니다." }

# ========== 멘토 API ==========

# 멘토 승인 (달성률 반영)
PATCH /api/mentor/tasks/:id/approve
Body: { approved: true }
Response: { task, message: "과제가 승인되었습니다." }

# 멘토 승인 취소
PATCH /api/mentor/tasks/:id/approve
Body: { approved: false }
Response: { task, message: "승인이 취소되었습니다." }

# 멘티별 과제 목록 (자가점검 + 승인 상태 포함)
GET /api/mentor/mentees/:id/tasks?date=2024-01-15
Response: {
  tasks: [
    {
      id, title, subject, isFixed,
      selfCheck: "DONE",      // 멘티 자가점검
      isApproved: false,      // 멘토 승인 여부
      selfCheckedAt, approvedAt
    }
  ],
  stats: {
    total: 5,
    approved: 2,             // 승인된 과제
    selfCheckDone: 4,        // 멘티가 V 체크한 과제
    completionRate: 40       // 승인 기준 달성률
  }
}

# ========== 타임테이블 API ==========

# 타임테이블 학습 기록
POST /api/mentee/timetable
Body: {
  date: "2024-01-15",
  subject: "KOREAN",
  startTime: "07:00",
  endTime: "08:30",
  taskId?: "task-id"  // 연결할 과제 (선택)
}

GET /api/mentee/timetable?date=2024-01-15
Response: {
  logs: [...],
  totalMinutes: 270,
  bySubject: { KOREAN: 90, MATH: 120, ENGLISH: 60 }
}

DELETE /api/mentee/timetable/:id
```

### 13.8 마이그레이션 계획

#### Phase 1: 스키마 변경 (2단계 상태 시스템)
1. `SelfCheckStatus` enum 추가
2. `Task.selfCheck` 필드 추가 (기본값: PENDING)
3. `Task.selfCheckedAt` 필드 추가
4. `Task.isApproved` 필드 추가 (기본값: false)
5. `Task.approvedAt`, `Task.approvedBy` 필드 추가
6. 기존 데이터 마이그레이션:
   - `isCompleted=true` → `isApproved=true`, `selfCheck=DONE`
   - `isCompleted=false` → `isApproved=false`, `selfCheck=PENDING`
7. `isCompleted` 필드 deprecated (하위 호환 유지 후 제거)

#### Phase 2: StudyTimeLog 확장
1. `startTime`, `endTime` 필드 추가 (nullable)
2. 기존 duration 기반 기록은 그대로 유지
3. 새 타임테이블 기록은 startTime/endTime 사용

#### Phase 3: API 변경
1. `PATCH /api/mentee/tasks/:id/self-check` 추가 (멘티 자가점검)
2. `PATCH /api/mentor/tasks/:id/approve` 추가 (멘토 승인)
3. 기존 `PATCH /api/mentee/tasks/:id/complete` deprecated

#### Phase 4: UI 구현
1. 할일 목록 과목별 그룹화
2. 멘티: 자가점검 UI (V, △, X, ○)
3. 멘토: 승인 버튼 (✅)
4. 달성률 계산 로직 변경 (승인 기준)
5. 타임테이블 탭 추가
6. 시간 블록 시각화

### 13.9 구현 우선순위

| 단계 | 기능 | 설명 |
|------|------|------|
| **Phase 1** | 2단계 상태 시스템 | 자가점검 + 멘토 승인 분리 |
| **Phase 2** | 달성률 로직 변경 | 멘토 승인 기준으로 변경 |
| **Phase 3** | 과목별 그룹화 | UI 개선 |
| **Phase 4** | 타임테이블 | 시간대별 학습 기록 |
| **Phase 5** | 시각화 | 타임라인 차트 |

---

## 14. 피드백 시스템 및 시간 기록 개선 (2026-02-03 추가)

### 14.1 요구사항 요약

1. **피드백 시스템 개선**
   - 전날 과제 피드백 마감 시간 표시 (다음날 11시)
   - 학생 코멘트에 대한 멘토 답변 (피드백 수정)
   - 월 단위 리포트

2. **일일 전체 피드백**
   - 하루 전체 학습에 대한 종합 피드백
   - 과제별 피드백과 별개

3. **공부 시간 기록 개선**
   - 시작/종료 시간 직접 입력
   - 일일 타임라인 차트 (GANTT 스타일)

### 14.2 Phase 1: 피드백 시스템 개선

#### 1.1 피드백 마감 시간 표시
- [ ] **변경 파일**: `/frontend/src/app/mentor/mentees/[id]/page.tsx`
  - 각 과제 카드에 마감 시간 표시 추가
  - 계산 로직: Task의 date + 1일 + 11시
  - UI: 정상 "마감: 내일 11:00" / 지연 "⚠️ 마감 지남" (빨간색)

- [ ] **변경 파일**: `/frontend/src/app/mentor/feedbacks/new/page.tsx`
  - 피드백 작성 폼 상단에 마감 시간 표시
  - 지연된 경우 경고 메시지

#### 1.2 피드백 수정 기능 (학생 코멘트 답변)
- [ ] **새 파일**: `/frontend/src/app/mentor/feedbacks/[id]/edit/page.tsx`
  - 기존 피드백 내용 불러오기
  - 학생의 과제 제출 코멘트 표시 (TaskSubmission.comment)
  - 피드백 내용 수정 (답변 추가)
  - PUT `/api/mentor/feedbacks/:id`로 업데이트

**필요한 컴포넌트**:
- 학생 코멘트 표시 섹션
- 피드백 수정 폼
- 저장 버튼

**UI 플로우**:
1. 멘티 과제 상세 또는 피드백 목록에서 "수정" 버튼
2. 수정 페이지 이동
3. 학생 코멘트 확인 → 피드백에 답변 추가
4. 저장

#### 1.3 월 단위 리포트
- [ ] **백엔드**: `/backend/src/routes/mentee.ts`
  - GET `/api/mentee/reports/monthly?year=2026&month=2`
  - 해당 월의 과제 통계 (total, completed, completionRate)
  - 과목별 통계 (studyTime, feedbackCount)
  - 일별 달성률
  - 전체 요약 반환

- [ ] **프론트엔드**: `/frontend/src/app/mentee/reports/monthly/page.tsx`
  - 년/월 선택기
  - 전체 요약 카드 (완료율, 공부시간, 피드백 수)
  - 과목별 통계 차트
  - 일별 달성률 그래프
  - (선택) PDF 다운로드 버튼

### 14.3 Phase 2: 일일 전체 피드백

#### 2.1 DailyFeedback 모델 추가
- [ ] **Prisma Schema 변경**:
```prisma
model DailyFeedback {
  id           String   @id @default(cuid())
  menteeId     String
  mentorId     String
  date         DateTime @db.Date
  content      String   // 일일 전체 피드백
  summary      String?  // 한 줄 요약
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  mentee User @relation("DailyFeedbacksMentee", fields: [menteeId], references: [id])
  mentor User @relation("DailyFeedbacksMentor", fields: [mentorId], references: [id])

  @@unique([menteeId, date]) // 멘티당 날짜별로 하나만
  @@index([menteeId, date])
}
```

- [ ] **User 모델에 relation 추가**:
```prisma
model User {
  // 기존 필드...
  dailyFeedbacksGiven    DailyFeedback[] @relation("DailyFeedbacksMentor")
  dailyFeedbacksReceived DailyFeedback[] @relation("DailyFeedbacksMentee")
}
```

- [ ] **마이그레이션**: `npx prisma migrate dev --name add_daily_feedback`

#### 2.2 API 엔드포인트
- [ ] **멘토 - 일일 피드백 작성/수정**
  - POST `/api/mentor/daily-feedbacks`
  - PUT `/api/mentor/daily-feedbacks/:id`
  - Body: `{ menteeId, date, content, summary? }`

- [ ] **멘티 - 일일 피드백 조회**
  - GET `/api/mentee/daily-feedbacks?date=2026-02-03`
  - GET `/api/mentee/daily-feedbacks/monthly?year=2026&month=2`

#### 2.3 UI 구현
- [ ] **멘토 페이지**: `/frontend/src/app/mentor/mentees/[id]/page.tsx`
  - 일일 플래너 하단에 "일일 전체 피드백 작성" 버튼 추가
  - 모달 또는 별도 페이지로 작성

- [ ] **멘티 페이지**: `/frontend/src/app/mentee/page.tsx`
  - 상단에 일일 피드백 카드 표시 (있을 경우)
  - 노란색 배경, 멘토 이름, 요약/내용

### 14.4 Phase 3: 공부 시간 기록 개선

#### 3.1 시작/종료 시간 입력 UI
- [ ] **기존 코드 수정**: `/frontend/src/app/mentee/page.tsx`
  - 기존: `prompt()`로 duration만 입력
  - 변경: 모달로 startTime, endTime 입력
  - 상태 추가: `showTimeModal`, `timeRecord { taskId, startTime, endTime }`
  - duration 자동 계산 로직 추가

**모달 UI**:
- 시작 시간 입력 (`<input type="time">`)
- 종료 시간 입력 (`<input type="time">`)
- 자동 계산된 duration 표시 ("1시간 30분")
- 저장 버튼

#### 3.2 백엔드 API 수정
- [ ] **기존 API 확장**: POST `/api/mentee/tasks/:id/time`
  - Body에 `startTime`, `endTime` 추가
  - StudyTimeLog 생성 시 startTime, endTime 저장
  - 기존 duration 필드는 유지 (하위 호환)

**Note**: StudyTimeLog 모델에 이미 startTime, endTime 필드 존재 (현재 미사용)

#### 3.3 일일 타임라인 차트
- [ ] **새 컴포넌트**: `/frontend/src/components/TimelineChart.tsx`
  - GANTT 스타일 차트
  - 가로축: 00:00 ~ 24:00 (24시간)
  - 세로축: 각 공부 기록
  - 막대: 시작/종료 시간에 따라 길이 표시
  - 색상: 과목별로 다른 색
  - 호버: 과제 제목, 공부 시간 표시

**라이브러리 옵션**:
1. Recharts (추천)
2. Chart.js
3. 순수 CSS (Tailwind + Flexbox)

**통합 위치**:
- `/frontend/src/app/mentee/page.tsx` (일일 플래너 하단)
- `/frontend/src/app/mentee/tasks/[id]/page.tsx` (과제 상세)

### 14.5 Phase 4: 추가 개선사항

- [ ] **피드백 목록 UI 개선**: `/frontend/src/app/mentee/feedbacks/page.tsx`
  - 일일 전체 피드백과 과제별 피드백 구분 표시
  - 필터에 "전체 피드백" 탭 추가

- [ ] **(선택) 월 리포트 PDF 다운로드**
  - 라이브러리: `jsPDF` 또는 `react-pdf`
  - 월간 리포트를 PDF로 변환
  - "다운로드" 버튼 추가

### 14.6 구현 순서

1. [ ] **Phase 1.1**: 피드백 마감 시간 표시 (프론트엔드만)
2. [ ] **Phase 3.1-3.2**: 시작/종료 시간 입력 (백엔드 + 프론트엔드)
3. [ ] **Phase 3.3**: 타임라인 차트 (프론트엔드)
4. [ ] **Phase 2**: 일일 전체 피드백 (DB 마이그레이션 + API + UI)
5. [ ] **Phase 1.2**: 피드백 수정 기능 (프론트엔드)
6. [ ] **Phase 1.3**: 월 리포트 (API + UI)

### 14.7 테스트 계획

**기능 테스트**:
1. 피드백 마감 시간 표시 확인
2. 시작/종료 시간 입력 → duration 자동 계산 확인
3. 타임라인 차트 렌더링 확인
4. 일일 전체 피드백 작성/조회 확인
5. 피드백 수정 기능 확인
6. 월 리포트 조회 및 통계 정확성 확인

**엣지 케이스**:
- 시작 시간 > 종료 시간 (에러 처리)
- 24시간 넘는 공부 기록 (자정 넘어가는 경우)
- 같은 시간대 여러 과제 (타임라인 겹침)
- 피드백 없는 날의 리포트
- 월 초/월 말 경계 테스트

---

## 15. 참고 자료

- 설스터디 노션 페이지: https://malachite-fontina-5e0.notion.site/2cfa56db406080f68bd2f8624b344a63
- 상담 신청 폼: https://forms.gle/FchKdDcm23JdGHpK9
