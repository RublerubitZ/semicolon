# 설스터디 프론트엔드

설스터디 학습 코칭 플랫폼의 Next.js 프론트엔드입니다.

## 기술 스택

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **TailwindCSS v4**
- **TanStack Query v5** - 서버 상태 관리
- **Zustand v5** - 클라이언트 상태 관리
- **Tiptap** - 리치 텍스트 에디터
- **Framer Motion** - 애니메이션
- **React Hook Form + Zod** - 폼 유효성 검사

## 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 환경 변수

`.env.local` 파일을 생성하고 다음을 설정하세요:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 페이지 구조

```
src/app/
├── login/               # 로그인
├── mentee/              # 멘티 (모바일 최적화)
│   ├── page.tsx         # 일일 플래너 (홈)
│   ├── planner/
│   │   ├── weekly/      # 주간 플래너
│   │   └── monthly/     # 월간 플래너
│   ├── calendar/        # 캘린더
│   ├── feedbacks/       # 피드백 목록
│   ├── history/[id]/    # 과제 히스토리
│   ├── reports/         # 보고서
│   └── tasks/[id]/      # 과제 상세
└── mentor/              # 멘토 (PC 최적화)
    ├── page.tsx         # 멘티 목록 (홈)
    ├── mentees/         # 멘티 상세 및 플래너
    ├── tasks/           # 과제 관리
    ├── feedbacks/       # 피드백 관리
    ├── worksheets/      # 학습지 관리
    ├── reports/         # 보고서
    └── calendar/        # 캘린더
```

## 빌드

```bash
npm run build
npm run start
```
