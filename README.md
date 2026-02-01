# Semicolon - 학습 코칭 플랫폼

> AI와 인간 멘토가 함께하는 개인 맞춤형 학습 코칭 플랫폼

## 📋 프로젝트 소개

### 문제 정의
현대 학생들은 **학습 콘텐츠 과잉** 시대를 살고 있습니다. 대형 학원, 인강, 교재, 문제집 등 자료는 넘치지만, **자신에게 맞는 자료를 선택하고 효과적으로 활용하는 방법**을 모릅니다.

### 솔루션
**Semicolon**은 AI 기술과 인간 멘토의 장점을 결합한 하이브리드 학습 코칭 플랫폼입니다.

### 핵심 기능
- 🎯 **개인화된 학습 자료 추천** - AI 기반 맞춤형 콘텐츠 큐레이션
- 📅 **데이터 기반 학습 플랜** - 학습 스타일과 목표에 따른 자동 플랜 생성
- 📊 **실시간 진도 추적** - 학습 시간, 성과 시각화 대시보드
- 👥 **멘토-멘티 매칭** - 1:1 맞춤 피드백 및 인간적 코칭

---

## 🛠 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: TailwindCSS + shadcn/ui
- **상태 관리**: Zustand
- **폼 관리**: React Hook Form + Zod
- **차트**: Recharts
- **실시간 통신**: Socket.IO Client

### 백엔드
- **런타임**: Node.js 20 LTS
- **프레임워크**: Express.js + TypeScript
- **ORM**: Prisma
- **데이터베이스**: PostgreSQL 15
- **캐시**: Redis
- **인증**: JWT + Passport.js
- **실시간 통신**: Socket.IO
- **AI**: OpenAI GPT-4 API

### 인프라
- **프론트엔드 호스팅**: Vercel
- **백엔드 호스팅**: Railway / Render
- **데이터베이스**: Neon (Serverless PostgreSQL)
- **파일 저장소**: Cloudinary
- **버전 관리**: GitHub

---

## 📁 프로젝트 구조

```
semicolon/
├── apps/
│   ├── web/                    # Next.js 프론트엔드
│   │   ├── app/
│   │   │   ├── (auth)/        # 인증 관련 페이지
│   │   │   ├── dashboard/     # 대시보드
│   │   │   ├── diagnosis/     # 학습 진단
│   │   │   ├── study/         # 학습 관리
│   │   │   └── mentoring/     # 멘토링
│   │   ├── components/
│   │   │   ├── ui/            # 공통 UI 컴포넌트
│   │   │   ├── features/      # 기능별 컴포넌트
│   │   │   └── layouts/       # 레이아웃
│   │   ├── lib/               # 유틸리티, API 클라이언트
│   │   ├── hooks/             # 커스텀 훅
│   │   └── store/             # 전역 상태 관리
│   │
│   └── api/                    # Express 백엔드
│       ├── src/
│       │   ├── routes/        # API 라우트
│       │   ├── controllers/   # 컨트롤러
│       │   ├── services/      # 비즈니스 로직
│       │   ├── middleware/    # 미들웨어
│       │   ├── prisma/        # 데이터베이스 스키마
│       │   └── sockets/       # WebSocket 핸들러
│       └── ...
│
├── packages/                   # 공유 코드 (선택)
│   ├── types/                 # 공유 타입 정의
│   └── utils/                 # 공통 유틸리티
│
├── .env.example
├── docker-compose.yml
├── PLAN.md                    # 상세 개발 계획서
└── README.md
```

---

## 🚀 시작하기

### 필수 요구사항
- Node.js 20.x 이상
- pnpm (권장) 또는 npm
- PostgreSQL 15
- Redis

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/semicolon.git
cd semicolon
```

### 2. 의존성 설치
```bash
# pnpm 사용 시
pnpm install

# npm 사용 시
npm install
```

### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력합니다.

```bash
cp .env.example .env
```

필수 환경 변수:
```env
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/semicolon"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT 시크릿
JWT_SECRET="your-super-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI API
OPENAI_API_KEY="sk-..."

# 파일 저장소 (Cloudinary)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 4. 데이터베이스 마이그레이션
```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 5. 개발 서버 실행

**프론트엔드 (Next.js):**
```bash
cd apps/web
npm run dev
# 또는
pnpm dev
```
→ http://localhost:3000

**백엔드 (Express):**
```bash
cd apps/api
npm run dev
# 또는
pnpm dev
```
→ http://localhost:4000

---

## 📱 주요 페이지

### 인증
- `/login` - 로그인
- `/register` - 회원가입
- `/oauth/callback` - OAuth 콜백

### 학생 대시보드
- `/dashboard` - 메인 대시보드 (학습 현황 요약)
- `/diagnosis` - 학습 스타일 진단 설문
- `/recommendations` - AI 추천 결과
  - `/materials` - 학습 자료 추천
  - `/study-plan` - 학습 플랜

### 학습 관리
- `/study/plans` - 내 학습 플랜 목록
- `/study/plans/[id]` - 플랜 상세 (캘린더)
- `/study/records` - 학습 기록 입력
- `/study/stats` - 학습 통계 및 그래프

### 멘토링
- `/mentoring/mentors` - 멘토 찾기
- `/mentoring/my-mentorships` - 내 멘토링 목록
- `/mentoring/chat/[id]` - 1:1 채팅

### 프로필
- `/profile` - 마이페이지
- `/profile/edit` - 프로필 수정
- `/profile/settings` - 설정

---

## 🔌 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - 현재 사용자 정보

### 학습 진단
- `POST /api/diagnosis` - 학습 진단 설문 제출
- `GET /api/diagnosis/:userId` - 진단 결과 조회

### AI 추천
- `POST /api/recommendations/materials` - 학습 자료 추천
- `POST /api/recommendations/study-plan` - 학습 플랜 생성

### 학습 관리
- `GET /api/study-plans` - 학습 플랜 목록
- `POST /api/study-plans` - 새 플랜 생성
- `GET /api/study-records` - 학습 기록 조회
- `POST /api/study-records` - 학습 시간/점수 기록

### 멘토링
- `GET /api/mentors` - 멘토 리스트
- `POST /api/mentorships` - 멘토링 요청
- `GET /api/chat/:mentorshipId/messages` - 채팅 히스토리

### 실시간
- WebSocket: `/socket.io` - 실시간 채팅 및 알림

전체 API 문서는 [PLAN.md](./PLAN.md)를 참조하세요.

---

## 🗄 데이터베이스 스키마

주요 모델:
- **User** - 사용자 (학생, 멘토, 관리자)
- **StudentProfile** - 학생 프로필 (학습 진단 데이터)
- **MentorProfile** - 멘토 프로필
- **StudyPlan** - 학습 플랜
- **StudyRecord** - 학습 기록
- **Mentorship** - 멘토-멘티 관계
- **ChatMessage** - 채팅 메시지
- **Recommendation** - AI 추천 결과

상세 스키마는 `apps/api/prisma/schema.prisma` 참조

---

## 🎯 개발 로드맵

### 1단계: 핵심 기능 (MVP) ✅
- [x] 사용자 인증 (이메일, Google OAuth)
- [x] 학습 스타일 진단 설문
- [x] AI 기반 학습 자료 추천
- [x] 학습 플랜 생성
- [x] 학습 진도 대시보드
- [x] 멘토-멘티 매칭
- [x] 실시간 1:1 채팅

### 2단계: 추가 기능
- [ ] 멘토-멘티 자동 매칭 알고리즘
- [ ] 알림 시스템 (푸시, 이메일)
- [ ] 모의고사 점수 관리 및 성적 추이 그래프
- [ ] 주간 학습 리포트

### 3단계: 확장 기능
- [ ] AI 챗봇 (24/7 학습 Q&A)
- [ ] 게이미피케이션 (배지, 포인트, 리더보드)
- [ ] 스터디 그룹 매칭
- [ ] 학부모 모니터링 대시보드
- [ ] 모의고사 타이머 및 오답 노트

---

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:coverage
```

---

## 🚢 배포

### 프론트엔드 (Vercel)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
cd apps/web
vercel --prod
```

### 백엔드 (Railway)
1. Railway 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 활성화

---

## 📊 성능 최적화

- **Redis 캐싱**: AI 추천 결과 캐싱으로 API 비용 절감
- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **코드 스플리팅**: 동적 import로 번들 사이즈 최적화
- **CDN**: Vercel Edge Network 활용

---

## 🔒 보안

- **JWT 인증**: Access Token + Refresh Token
- **HTTPS**: 모든 통신 암호화
- **환경 변수**: 민감한 정보 환경 변수로 관리
- **CORS**: 허용된 도메인만 API 접근
- **SQL Injection 방지**: Prisma ORM 사용
- **XSS 방지**: React 자동 이스케이핑

---

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

MIT License

---

## 👥 팀

- **프론트엔드**: [팀원 이름]
- **백엔드**: [팀원 이름]
- **디자인**: [팀원 이름]
- **기획**: [팀원 이름]

---

## 📞 문의

프로젝트 관련 문의: [your-email@example.com]

GitHub Issues: [https://github.com/your-username/semicolon/issues](https://github.com/your-username/semicolon/issues)

---

## 🙏 감사의 말

이 프로젝트는 [해커톤 이름]을 위해 개발되었습니다.

---

Made with ❤️ by Semicolon Team
