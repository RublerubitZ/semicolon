# 설스터디 - 수능 국영수 학습 코칭 플랫폼

> 멘토와 함께하는 체계적인 수능 학습 관리 플랫폼

## 프로젝트 소개

**설스터디**는 수능 국어, 영어, 수학 학습을 위한 1:1 멘토링 기반 학습 코칭 플랫폼입니다.

### 핵심 가치
- **체계적인 학습 방법** - 멘토가 직접 설계하는 맞춤형 학습 플랜
- **실행력 향상** - 일일 플래너와 공부 시간 추적
- **표준화된 관리 품질** - 과목별 피드백 시스템

### 주요 기능

**멘티 (학생)**
- 일일 플래너 - 오늘의 할 일 확인 및 완료 체크
- 공부 시간 기록 - 과목별 학습 시간 추적
- 과제 제출 - 학습 결과물 이미지 업로드
- 피드백 확인 - 멘토의 과목별 피드백 열람
- 마이페이지 - 과목별 달성률 확인

**멘토 (선생님)**
- 멘티 관리 - 담당 학생 목록 및 현황 파악
- 할 일 등록 - 학생별 맞춤 과제 생성
- 학습지 관리 - 칼럼/PDF 형태의 학습 자료 업로드
- 피드백 작성 - 과목별 상세 피드백 제공

---

## 기술 스택

### Frontend
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Zustand

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL

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
│   └── src/app/
│       ├── (mentee)/        # 멘티 페이지 (모바일 최적화)
│       ├── (mentor)/        # 멘토 페이지 (PC 최적화)
│       └── login/           # 로그인
│
├── backend/                  # Express 백엔드
│   ├── src/
│   │   ├── routes/          # API 라우트
│   │   └── middleware/      # 인증 미들웨어
│   └── prisma/
│       ├── schema.prisma    # DB 스키마
│       └── seed.ts          # 테스트 데이터
│
└── etc/                      # 문서
    ├── MVP_PLAN.md          # MVP 요구사항
    └── PLAN.md              # 기존 계획 (참고용)
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
# .env 파일에 DATABASE_URL 등 설정

# 프론트엔드 설정
cd ../frontend
npm install
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

### 인증
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자

### 멘티
- `GET /api/mentee/planner?date=` - 일일 플래너
- `POST /api/mentee/tasks` - 할 일 추가
- `PATCH /api/mentee/tasks/:id/complete` - 완료 처리
- `POST /api/mentee/tasks/:id/submit` - 과제 제출
- `GET /api/mentee/feedbacks` - 피드백 목록

### 멘토
- `GET /api/mentor/mentees` - 멘티 목록
- `POST /api/mentor/tasks` - 할 일 생성
- `POST /api/mentor/feedbacks` - 피드백 작성
- `POST /api/mentor/worksheets` - 학습지 생성

### 파일
- `POST /api/upload/image` - 이미지 업로드
- `POST /api/upload/pdf` - PDF 업로드

---

## 팀

- **프론트엔드**: [팀원 이름]
- **백엔드**: [팀원 이름]

---

## 참고 자료

- [설스터디 노션](https://malachite-fontina-5e0.notion.site/2cfa56db406080f68bd2f8624b344a63)
- [상담 신청](https://forms.gle/FchKdDcm23JdGHpK9)
