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
- [ ] DB 스키마 작성 및 마이그레이션
- [ ] 테스트 계정 시드 데이터
- [ ] 로그인 API + 페이지
- [ ] 역할별 라우팅 미들웨어

### Day 2: 멘티 플래너 (일일/주간/월간)
- [ ] 멘티 레이아웃 (모바일 최적화)
- [ ] 일일 플래너 UI
- [ ] 할 일 목록 API 연동
- [ ] 할 일 완료/시간 기록
- [ ] 코멘트/질문 입력
- [ ] 주간 플래너 뷰
- [ ] 월간 플래너 뷰
- [ ] 플래너 통계 API 연동

### Day 3: 과제 상세 + 멘토 화면
- [ ] 과제 상세 페이지
- [ ] 학습지 뷰어 (칼럼/PDF)
- [ ] 이미지 업로드 (Cloudinary)
- [ ] 멘토 레이아웃 (PC)
- [ ] 멘티 목록
- [ ] 할 일 등록 폼

### Day 4: 피드백 + 기능 완성
- [ ] 멘토 피드백 작성
- [ ] 멘티 피드백 확인
- [ ] 과목별 필터링
- [ ] 피드백 요약 표시

### Day 5: 추가 기능 + 배포
- [ ] **마이페이지** (프로필, 과목별 달성률, 상담 버튼)
- [ ] 월간 캘린더
- [ ] 버그 수정 + QA
- [ ] Vercel + Railway 배포
- [ ] (선택) 알림 시스템

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

## 12. 참고 자료

- 설스터디 노션 페이지: https://malachite-fontina-5e0.notion.site/2cfa56db406080f68bd2f8624b344a63
- 상담 신청 폼: https://forms.gle/FchKdDcm23JdGHpK9
