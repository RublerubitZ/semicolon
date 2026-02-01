# 학습 코칭 플랫폼 (Semicolon) - 해커톤 MVP 계획

## 1. 프로젝트 개요

### 문제 정의
- **배경**: 학습 콘텐츠는 넘치지만, 학생들이 자신에게 맞는 자료 선택 및 활용 방법을 모름
- **타겟**: 초중고 수험생
- **솔루션**: AI와 인간 코칭을 결합한 하이브리드 학습 코칭 플랫폼

### 핵심 가치 제안
1. **개인화된 학습 자료 추천** - AI 기반 맞춤형 콘텐츠 큐레이션
2. **데이터 기반 학습 플랜** - 학습 스타일과 목표에 따른 자동 플랜 생성
3. **실시간 진도 추적** - 학습 시간, 성과 시각화 대시보드
4. **멘토-멘티 매칭** - 1:1 맞춤 피드백 및 인간적 코칭

---

## 2. 시스템 아키텍처

### 2.1 전체 구조 (3계층 아키텍처)

```
┌─────────────────────────────────────────────────────┐
│              프론트엔드 (클라이언트 계층)              │
│        Next.js 14 + TypeScript + TailwindCSS        │
└─────────────────────────────────────────────────────┘
                         ↓ ↑
                    REST API / WebSocket
                         ↓ ↑
┌─────────────────────────────────────────────────────┐
│              백엔드 (애플리케이션 계층)                │
│         Node.js + Express + TypeScript               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  인증 모듈   │  │  AI/ML 모듈  │  │  채팅 모듈 │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓ ↑
┌─────────────────────────────────────────────────────┐
│                데이터 계층 (저장소)                   │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │  PostgreSQL  │  │     Redis     │  │  S3/GCS  │ │
│  │ (메인 DB)    │  │ (캐시/세션)    │  │ (파일)   │ │
│  └──────────────┘  └───────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓ ↑
┌─────────────────────────────────────────────────────┐
│                  외부 서비스                          │
│    OpenAI API    │    Google OAuth    │    Email    │
└─────────────────────────────────────────────────────┘
```

### 2.2 주요 모듈 설계

#### A. 사용자 관리 모듈
- **역할**: Student (멘티), Mentor (멘토), Admin
- **기능**: 회원가입, 로그인, 프로필 관리
- **인증**: JWT (Access Token + Refresh Token)
- **소셜 로그인**: Google OAuth 2.0

#### B. 학습 진단 모듈
- **초기 설문**: 학습 스타일, 목표, 현재 수준 진단
- **결과**: 학습자 프로파일 생성 (Learning Profile)
- **저장**: JSON 형태로 DB 저장 + 캐싱

#### C. AI 추천 엔진
- **학습 자료 추천**:
  - Input: 학습 프로파일 + 과목 + 목표
  - Process: OpenAI GPT-4 API를 활용한 맞춤 추천
  - Output: 교재, 인강, 문제집 리스트
- **학습 플랜 생성**:
  - Input: 목표 성적, 현재 성적, 가용 시간, D-Day
  - Process: Rule-based + AI 하이브리드 플래닝
  - Output: 주간/일간 학습 스케줄 (캘린더 형태)

#### D. 진도 관리 모듈
- **학습 기록**:
  - 일일 학습 시간 입력 (수동 or 타이머 기능)
  - 완료한 챕터/문제 체크리스트
  - 모의고사 점수 입력
- **대시보드**:
  - 주간/월간 학습 시간 그래프
  - 과목별 성취도 차트
  - 목표 대비 진행률 표시

#### E. 멘토링 모듈
- **매칭 시스템**:
  - 학생이 원하는 과목/수준에 맞는 멘토 추천
  - 멘토 프로필 보기 (학력, 전문 과목, 리뷰)
- **1:1 채팅**:
  - 실시간 채팅 (WebSocket)
  - 파일 공유 (이미지, PDF)
  - 채팅 히스토리 저장
- **피드백 시스템**:
  - 멘토가 학생의 학습 플랜/진도 검토
  - 조언 및 수정 제안 작성

---

## 3. 기술 스택 추천

### 3.1 프론트엔드 (Frontend)

| 항목 | 기술 | 선택 이유 |
|------|------|-----------|
| **프레임워크** | Next.js 14 (App Router) | - SSR/SSG로 SEO 최적화<br>- React 기반으로 빠른 개발<br>- API Routes로 간단한 백엔드 로직 처리 가능<br>- 이미지 최적화, 폰트 최적화 내장 |
| **언어** | TypeScript | - 타입 안정성으로 버그 감소<br>- 팀 협업 시 코드 가독성 향상 |
| **스타일링** | TailwindCSS + shadcn/ui | - 빠른 UI 개발<br>- 디자인 일관성 유지<br>- 컴포넌트 재사용성 극대화 |
| **상태 관리** | Zustand | - Redux보다 간단한 설정<br>- 작은 번들 사이즈<br>- TypeScript 완벽 지원 |
| **폼 관리** | React Hook Form + Zod | - 성능 최적화된 폼 처리<br>- Zod로 런타임 validation |
| **차트** | Recharts | - React 친화적<br>- 학습 진도 시각화에 적합 |
| **실시간 통신** | Socket.IO Client | - WebSocket 기반 채팅 구현 |

### 3.2 백엔드 (Backend)

| 항목 | 기술 | 선택 이유 |
|------|------|-----------|
| **런타임** | Node.js 20 LTS | - JavaScript/TypeScript 기반 풀스택 개발<br>- 풍부한 npm 생태계<br>- 비동기 I/O로 실시간 기능에 유리 |
| **프레임워크** | Express.js + TypeScript | - 가볍고 유연한 구조<br>- 미들웨어 생태계 풍부<br>- 빠른 개발 속도 |
| **ORM** | Prisma | - TypeScript 네이티브 지원<br>- 자동 마이그레이션<br>- 타입 안전한 쿼리 |
| **데이터베이스** | PostgreSQL 15 | - 관계형 데이터에 최적<br>- JSON 필드 지원 (학습 프로파일 저장)<br>- 트랜잭션 안정성 |
| **캐시/세션** | Redis | - 세션 저장<br>- AI 추천 결과 캐싱 (API 비용 절감)<br>- Rate limiting |
| **인증** | JWT + Passport.js | - Stateless 인증<br>- 확장성 good<br>- Google OAuth 쉽게 통합 |
| **실시간 통신** | Socket.IO | - 멘토-멘티 채팅<br>- 실시간 알림 |
| **파일 저장** | AWS S3 or Google Cloud Storage | - 프로필 사진, 첨부 파일 저장<br>- 해커톤에서는 Cloudinary 무료 플랜 추천 |
| **AI/LLM** | OpenAI GPT-4 API | - 학습 자료 추천<br>- 학습 플랜 생성<br>- 간단한 Q&A 챗봇 |

### 3.3 데브옵스 및 인프라 (해커톤용 간소화)

| 항목 | 기술 | 선택 이유 |
|------|------|-----------|
| **호스팅 (프론트엔드)** | Vercel | - Next.js 최적화<br>- 무료 플랜<br>- 자동 배포 (GitHub 연동) |
| **호스팅 (백엔드)** | Railway 또는 Render | - 무료/저렴한 플랜<br>- PostgreSQL + Redis 제공<br>- 쉬운 배포 |
| **데이터베이스** | Neon (Serverless Postgres) | - 무료 플랜<br>- 자동 스케일링 |
| **모니터링** | Sentry (무료 플랜) | - 에러 트래킹 |
| **버전 관리** | GitHub | - 코드 협업<br>- CI/CD 연동 |

---

## 4. MVP 기능 범위 (3-7일 해커톤)

### 1단계: 핵심 기능 (우선순위 높음) ⭐⭐⭐

#### 1일차-2일차: 기본 인프라 및 사용자 관리
- [ ] 프로젝트 초기 설정 (Next.js + Express 보일러플레이트)
- [ ] 데이터베이스 스키마 설계 (Prisma)
- [ ] 회원가입/로그인 (이메일 + 비밀번호)
- [ ] Google OAuth 소셜 로그인
- [ ] 사용자 프로필 페이지

#### 2일차-3일차: 학습 진단 및 AI 추천
- [ ] 학습 스타일 진단 설문 UI/UX
- [ ] 설문 결과 기반 학습 프로파일 생성
- [ ] OpenAI API 연동 (학습 자료 추천 프롬프트 작성)
- [ ] 추천 결과 페이지 (교재, 인강, 문제집 리스트)

#### 3일차-4일차: 학습 플랜 및 진도 관리
- [ ] AI 기반 학습 플랜 생성 (주간/일간 스케줄)
- [ ] 캘린더 UI로 플랜 시각화
- [ ] 일일 학습 시간 입력 기능
- [ ] 학습 진도 대시보드 (차트 라이브러리 활용)

#### 4일차-5일차: 멘토링 기본 기능
- [ ] 멘토/멘티 역할 구분
- [ ] 멘토 리스트 페이지
- [ ] 1:1 채팅 기능 (Socket.IO)
- [ ] 채팅 히스토리 저장

### 2단계: 추가 기능 (시간 여유 시) ⭐⭐

- [ ] 멘토-멘티 매칭 알고리즘 (과목, 목표 성적 기반)
- [ ] 알림 시스템 (새 메시지, 학습 플랜 리마인더)
- [ ] 모의고사 점수 입력 및 성적 추이 그래프
- [ ] 학습 통계 (주간 리포트)

### 3단계: 선택 기능 (있으면 좋은 기능) ⭐

- [ ] AI 챗봇 (학습 질의응답)
- [ ] 커뮤니티 게시판 (수험생 간 정보 공유)
- [ ] 멘토 리뷰 및 평점 시스템
- [ ] 모바일 최적화 (반응형 디자인 완성도 높이기)

---

## 5. 데이터베이스 스키마 (Prisma 예시)

```prisma
// schema.prisma

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String?  // Google 로그인 시 null
  name          String
  role          Role     @default(STUDENT)
  profileImage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  studentProfile StudentProfile?
  mentorProfile  MentorProfile?
  studyPlans     StudyPlan[]
  studyRecords   StudyRecord[]
  chatMessages   ChatMessage[]
  mentorships    Mentorship[]   @relation("MentorRelation")
  mentoredBy     Mentorship[]   @relation("StudentRelation")
}

enum Role {
  STUDENT
  MENTOR
  ADMIN
}

model StudentProfile {
  id                String   @id @default(uuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 학습 진단 데이터
  grade             String   // "초6", "중3", "고1" 등
  targetExam        String?  // "수능", "내신", "특목고입시" 등
  subjects          String[] // ["수학", "영어", "과학"]
  learningStyle     Json     // 설문 결과 JSON
  weeklyStudyHours  Int?     // 주당 가용 학습 시간

  currentScores     Json?    // { "수학": 70, "영어": 85 }
  targetScores      Json?    // { "수학": 90, "영어": 95 }

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model MentorProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  bio         String?
  subjects    String[] // 전문 과목
  school      String?  // 출신 학교
  rating      Float    @default(0)
  reviewCount Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model StudyPlan {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String
  description String?
  subject     String
  startDate   DateTime
  endDate     DateTime
  schedule    Json     // 주간/일간 스케줄 JSON

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model StudyRecord {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  date        DateTime @default(now())
  subject     String
  duration    Int      // 분 단위
  content     String?  // "수학 3단원 복습"
  score       Int?     // 모의고사 점수

  createdAt   DateTime @default(now())
}

model Mentorship {
  id         String   @id @default(uuid())
  mentorId   String
  studentId  String
  mentor     User     @relation("MentorRelation", fields: [mentorId], references: [id])
  student    User     @relation("StudentRelation", fields: [studentId], references: [id])

  subject    String
  status     MentorshipStatus @default(ACTIVE)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  messages   ChatMessage[]
}

enum MentorshipStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

model ChatMessage {
  id            String      @id @default(uuid())
  mentorshipId  String
  mentorship    Mentorship  @relation(fields: [mentorshipId], references: [id])
  senderId      String
  sender        User        @relation(fields: [senderId], references: [id])

  content       String
  attachments   String[]    // 파일 URL 배열

  createdAt     DateTime    @default(now())
}

model Recommendation {
  id          String   @id @default(uuid())
  userId      String
  type        RecommendationType
  subject     String
  content     Json     // AI 추천 결과 (교재 리스트 등)

  createdAt   DateTime @default(now())
}

enum RecommendationType {
  MATERIAL    // 학습 자료
  STUDY_PLAN  // 학습 플랜
}
```

---

## 6. API 엔드포인트 설계 (주요 경로)

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/refresh` - 액세스 토큰 재발급
- `GET /api/auth/me` - 현재 사용자 정보

### 사용자
- `GET /api/users/:id` - 사용자 프로필 조회
- `PATCH /api/users/:id` - 프로필 수정
- `POST /api/users/:id/profile-image` - 프로필 이미지 업로드

### 학습 진단
- `POST /api/diagnosis` - 학습 스타일 진단 설문 제출
- `GET /api/diagnosis/:userId` - 진단 결과 조회

### AI 추천
- `POST /api/recommendations/materials` - 학습 자료 추천 요청
- `POST /api/recommendations/study-plan` - 학습 플랜 생성
- `GET /api/recommendations/:userId` - 추천 히스토리

### 학습 플랜
- `GET /api/study-plans` - 내 학습 플랜 목록
- `POST /api/study-plans` - 새 플랜 생성
- `PATCH /api/study-plans/:id` - 플랜 수정
- `DELETE /api/study-plans/:id` - 플랜 삭제

### 학습 기록
- `GET /api/study-records` - 학습 기록 조회 (필터: 날짜, 과목)
- `POST /api/study-records` - 학습 시간/점수 기록
- `GET /api/study-records/stats` - 통계 (주간/월간)

### 멘토링
- `GET /api/mentors` - 멘토 리스트
- `POST /api/mentorships` - 멘토링 요청
- `GET /api/mentorships/:id` - 멘토링 상세
- `PATCH /api/mentorships/:id/status` - 상태 변경

### 채팅
- `GET /api/chat/:mentorshipId/messages` - 채팅 히스토리
- `POST /api/chat/:mentorshipId/messages` - 메시지 전송 (파일 첨부)
- WebSocket: `/socket.io` - 실시간 채팅

---

## 7. 프론트엔드 페이지 구조

```
/
├── (auth)
│   ├── /login              # 로그인 페이지
│   ├── /register           # 회원가입
│   └── /oauth/callback     # OAuth 콜백
│
├── /dashboard              # 메인 대시보드 (학습 현황 요약)
│
├── /diagnosis              # 학습 스타일 진단 설문
│
├── /recommendations        # AI 추천 결과
│   ├── /materials          # 학습 자료 추천
│   └── /study-plan         # 학습 플랜
│
├── /study
│   ├── /plans              # 내 학습 플랜 목록
│   ├── /plans/[id]         # 플랜 상세 (캘린더)
│   ├── /records            # 학습 기록 입력
│   └── /stats              # 학습 통계 & 그래프
│
├── /mentoring
│   ├── /mentors            # 멘토 찾기
│   ├── /my-mentorships     # 내 멘토링 목록
│   └── /chat/[id]          # 1:1 채팅
│
├── /profile                # 마이페이지
│   ├── /edit               # 프로필 수정
│   └── /settings           # 설정
│
└── /about                  # 서비스 소개
```

---

## 8. 추가 아이디어 & 차별화 포인트

### 8.1 MVP 이후 확장 아이디어

1. **AI 학습 코칭 챗봇**
   - GPT-4 기반 24/7 학습 질문 답변
   - 학습 전략 조언
   - 동기 부여 메시지

2. **게이미피케이션**
   - 학습 시간 목표 달성 시 배지/포인트
   - 친구와 학습 시간 경쟁
   - 리더보드

3. **스터디 그룹 매칭**
   - 같은 목표를 가진 학생들 그룹 스터디 자동 매칭
   - 그룹 채팅, 파일 공유

4. **학습 분석 리포트 (AI 기반)**
   - 주간/월간 학습 패턴 분석
   - 취약 과목 자동 감지
   - 개선 방향 제시

5. **모의고사 타이머 & 분석**
   - 과목별 시간 관리 연습
   - 오답 노트 자동 생성

6. **학부모 모니터링 대시보드**
   - 자녀 학습 현황 조회 (권한 설정)
   - 멘토 피드백 확인

### 8.2 해커톤 시연 포인트

1. **시연 시나리오**:
   - 신규 학생 가입 → 학습 진단 → AI 추천 → 플랜 생성 → 멘토 매칭 → 채팅
   - 대시보드에서 학습 기록 입력 → 실시간 그래프 업데이트

2. **데모 데이터 준비**:
   - 샘플 멘토 10명
   - 학습 자료 DB (인기 교재, 인강)
   - 더미 학습 기록 (그래프가 예쁘게 나오도록)

3. **비주얼 임팩트**:
   - 깔끔한 UI/UX (TailwindCSS + shadcn/ui)
   - 애니메이션 효과 (Framer Motion)
   - 반응형 디자인 (모바일 Demo 가능)

---

## 9. 프로젝트 구조 (모노레포)

```
semicolon/
├── apps/
│   ├── web/                    # Next.js 프론트엔드
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   ├── diagnosis/
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui 컴포넌트
│   │   │   ├── features/      # 기능별 컴포넌트
│   │   │   └── layouts/
│   │   ├── lib/
│   │   │   ├── api.ts         # API 클라이언트
│   │   │   ├── auth.ts
│   │   │   └── socket.ts
│   │   ├── hooks/
│   │   ├── store/             # Zustand 스토어
│   │   └── ...
│   │
│   └── api/                    # Express 백엔드
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── diagnosis.ts
│       │   │   ├── recommendations.ts
│       │   │   └── ...
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── ai.service.ts      # OpenAI 연동
│       │   │   ├── auth.service.ts
│       │   │   └── ...
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   └── error.middleware.ts
│       │   ├── prisma/
│       │   │   └── schema.prisma
│       │   ├── sockets/
│       │   │   └── chat.socket.ts
│       │   └── index.ts
│       └── ...
│
├── packages/                   # 공유 코드 (선택 사항)
│   ├── types/                 # 공유 TypeScript 타입
│   └── utils/
│
├── .env.example
├── docker-compose.yml          # PostgreSQL + Redis (로컬 개발용)
├── package.json
└── README.md
```

---

## 10. 개발 일정 (5일 기준)

### 1일차: 환경 설정 및 기본 구조
- [ ] 프로젝트 초기화 (Next.js + Express)
- [ ] 데이터베이스 설정 (PostgreSQL + Prisma)
- [ ] 인증 시스템 (JWT + Google OAuth)
- [ ] 기본 UI 레이아웃 (네비게이션, 푸터)

### 2일차: 학습 진단 및 AI 추천
- [ ] 학습 스타일 진단 설문 페이지
- [ ] OpenAI API 연동
- [ ] 학습 자료 추천 기능
- [ ] 추천 결과 UI

### 3일차: 학습 플랜 및 진도 관리
- [ ] AI 기반 학습 플랜 생성
- [ ] 캘린더 UI
- [ ] 학습 기록 입력 폼
- [ ] 대시보드 (차트)

### 4일차: 멘토링 시스템
- [ ] 멘토 프로필 페이지
- [ ] 멘토-멘티 매칭
- [ ] 실시간 채팅 (Socket.IO)
- [ ] 채팅 UI/UX

### 5일차: 통합 테스트 및 배포
- [ ] 전체 기능 테스트
- [ ] 버그 수정
- [ ] Vercel + Railway 배포
- [ ] 시연 준비 (데모 데이터, 발표 자료)

---

## 11. 환경 변수 (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/semicolon"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-key-change-this"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# OpenAI
OPENAI_API_KEY="sk-..."

# File Storage (Cloudinary 추천)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Frontend URL
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:4000"

# Backend
PORT=4000
NODE_ENV="development"
```

---

## 12. 검증 계획

### 12.1 기능 테스트 체크리스트

**인증**
- [ ] 회원가입 → 로그인 → JWT 발급 확인
- [ ] Google OAuth 로그인 정상 작동
- [ ] 잘못된 자격 증명 시 에러 처리

**학습 진단**
- [ ] 설문 제출 → 학습 프로파일 생성 확인
- [ ] 프로파일 데이터 DB 저장 확인

**AI 추천**
- [ ] 학습 자료 추천 API 호출 → 결과 반환
- [ ] 학습 플랜 생성 → 캘린더에 표시
- [ ] OpenAI API 에러 시 fallback 처리

**학습 기록**
- [ ] 학습 시간 입력 → DB 저장
- [ ] 대시보드 그래프 실시간 업데이트
- [ ] 날짜별/과목별 필터링

**멘토링**
- [ ] 멘토 리스트 조회
- [ ] 멘토링 요청 → DB 생성
- [ ] 실시간 채팅 (WebSocket) 연결 확인
- [ ] 메시지 전송/수신 확인
- [ ] 파일 첨부 업로드

### 12.2 성능 테스트
- [ ] API 응답 시간 < 500ms (AI 제외)
- [ ] 동시 채팅 10명 이상 테스트
- [ ] 이미지 업로드 속도 확인

### 12.3 배포 확인
- [ ] Vercel 배포 성공
- [ ] Railway 배포 성공
- [ ] 환경 변수 설정 확인
- [ ] HTTPS 인증서 확인
- [ ] CORS (교차 출처 리소스 공유) 설정 확인

---

## 13. 성공 지표 (해커톤 심사 기준 대응)

| 심사 항목 | 대응 전략 |
|----------|----------|
| **혁신성** | - AI + 인간 코칭 하이브리드 모델<br>- 개인화된 학습 설계 자동화 |
| **기술 완성도** | - 풀스택 TypeScript로 타입 안정성<br>- Prisma ORM으로 안전한 DB 관리<br>- Socket.IO로 실시간 기능 |
| **실용성** | - 실제 수험생 pain point 해결<br>- 즉시 사용 가능한 MVP |
| **UX/UI** | - TailwindCSS + shadcn/ui로 현대적 디자인<br>- 모바일 반응형<br>- 직관적인 네비게이션 |
| **확장 가능성** | - Monorepo 구조로 모듈화<br>- API 우선 설계<br>- 추가 기능 roadmap 제시 |

---

## 14. 리스크 & 대응 방안

| 리스크 | 대응 |
|-------|------|
| OpenAI API 비용 초과 | - 무료 티어 모니터링<br>- 응답 캐싱 (Redis)<br>- 대안: 규칙 기반 추천 시스템 |
| 실시간 채팅 복잡도 | - Socket.IO 공식 예제 활용<br>- 최소 기능만 구현 (파일 첨부는 선택) |
| 배포 시간 부족 | - 4일차부터 스테이징 환경 구축<br>- CI/CD 자동화 (GitHub Actions) |
| 팀원 기술 스택 차이 | - TypeScript 공통 사용<br>- 코드 리뷰 프로세스<br>- 페어 프로그래밍 |

---

## 요약

이 계획은 **3-7일 해커톤**에서 완성 가능한 **학습 코칭 플랫폼 MVP**를 위한 포괄적인 아키텍처와 구현 전략입니다.

**핵심 차별점**:
1. AI (GPT-4) + 인간 멘토 하이브리드 코칭
2. 데이터 기반 개인화 학습 플랜
3. 실시간 멘토링 및 피드백

**권장 기술 스택**:
- 프론트엔드: **Next.js 14 + TypeScript + TailwindCSS**
- 백엔드: **Node.js + Express + Prisma + PostgreSQL**
- 실시간 통신: **Socket.IO**
- AI: **OpenAI GPT-4**
- 배포: **Vercel (프론트엔드) + Railway (백엔드)**

**핵심 구현 순서**:
1. 인증 & 사용자 관리
2. 학습 진단 & AI 추천
3. 학습 플랜 & 진도 관리
4. 멘토링 & 채팅
5. 통합 & 배포

이 계획을 따르면 해커톤 기간 내에 작동하는 MVP를 완성하고, 실용성과 기술적 완성도를 모두 갖춘 프로젝트를 시연할 수 있습니다.
