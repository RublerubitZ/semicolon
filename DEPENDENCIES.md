# 설스터디 MVP - 패키지 의존성 명세

> 팀 협업을 위한 프로젝트 패키지 버전 관리 문서
> 마지막 업데이트: 2026-02-02

---

## Node.js 버전 요구사항

```
Node.js >= 20.x (권장: 24.x)
npm >= 10.x
```

---

## 백엔드 의존성 (backend/)

### 프로덕션 패키지
```
@prisma/client@^6.3.0       # Prisma ORM 클라이언트
bcryptjs@^2.4.3             # 비밀번호 해싱
cloudinary@^2.5.1           # 이미지 업로드/관리
cors@^2.8.5                 # CORS 미들웨어
dotenv@^16.4.7              # 환경변수 관리
express@^4.21.2             # 웹 프레임워크
jsonwebtoken@^9.0.2         # JWT 인증
multer@^1.4.5-lts.1         # 파일 업로드 미들웨어
```

### 개발 의존성
```
@types/bcryptjs@^2.4.6      # bcryptjs 타입 정의
@types/cors@^2.8.17         # cors 타입 정의
@types/express@^5.0.0       # express 타입 정의
@types/jsonwebtoken@^9.0.7  # jsonwebtoken 타입 정의
@types/multer@^1.4.12       # multer 타입 정의
@types/node@^22.12.0        # Node.js 타입 정의
prisma@^6.3.0               # Prisma CLI 및 마이그레이션 도구
ts-node@^10.9.2             # TypeScript 실행 환경
ts-node-dev@^2.0.0          # TypeScript 개발 서버
typescript@^5.7.3           # TypeScript 컴파일러
```

---

## 프론트엔드 의존성 (frontend/)

### 프로덕션 패키지
```
@hookform/resolvers@^5.2.2  # React Hook Form 검증 리졸버
date-fns@^4.1.0             # 날짜 유틸리티
next@16.1.6                 # Next.js 프레임워크
react@19.2.3                # React 라이브러리
react-dom@19.2.3            # React DOM 렌더러
react-hook-form@^7.71.1     # React 폼 관리
zod@^4.3.6                  # 스키마 검증
zustand@^5.0.11             # 상태 관리
```

### 개발 의존성
```
@tailwindcss/postcss@^4     # Tailwind CSS PostCSS 플러그인
@types/node@^20             # Node.js 타입 정의
@types/react@^19            # React 타입 정의
@types/react-dom@^19        # React DOM 타입 정의
eslint@^9                   # JavaScript/TypeScript 린터
eslint-config-next@16.1.6   # Next.js ESLint 설정
tailwindcss@^4              # Tailwind CSS 프레임워크
typescript@^5               # TypeScript 컴파일러
```

---

## 루트 레벨 의존성

```
next-cloudinary@^6.17.5     # Cloudinary Next.js 통합
```

---

## 설치 명령어

### 전체 프로젝트 설치
```bash
# 루트 레벨
npm install

# 백엔드
cd backend && npm install

# 프론트엔드
cd frontend && npm install
```

### 특정 패키지 추가 시
```bash
# 백엔드 프로덕션 패키지 추가
cd backend
npm install <package-name>

# 백엔드 개발 패키지 추가
cd backend
npm install -D <package-name>

# 프론트엔드 프로덕션 패키지 추가
cd frontend
npm install <package-name>

# 프론트엔드 개발 패키지 추가
cd frontend
npm install -D <package-name>
```

---

## 버전 동기화 규칙

### 패키지 업데이트 전 체크리스트
- [ ] `package.json`의 버전 범위 확인 (^, ~, 정확한 버전)
- [ ] 주요 버전(major) 업데이트는 팀원과 협의 후 진행
- [ ] 업데이트 후 `npm install` 실행하여 `package-lock.json` 갱신
- [ ] 백엔드/프론트엔드 각각 테스트 실행
- [ ] 변경사항을 이 파일에 반영

### package-lock.json 관리
```bash
# package-lock.json은 반드시 커밋
git add package-lock.json
git commit -m "Update dependencies"

# 충돌 발생 시 안전한 해결
npm install  # 자동으로 충돌 해결
git add package-lock.json
```

### 버전 범위 의미
- `^x.y.z`: 마이너/패치 업데이트 허용 (권장)
- `~x.y.z`: 패치 업데이트만 허용
- `x.y.z`: 정확한 버전 고정

---

## 호환성 매트릭스

| 컴포넌트 | Node.js | PostgreSQL | TypeScript |
|---------|---------|------------|------------|
| Backend | ≥20.x   | ≥15.x      | ^5.7.3     |
| Frontend| ≥20.x   | -          | ^5         |

---

## 문제 해결

### 패키지 설치 실패
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 버전 충돌
```bash
# 의존성 트리 확인
npm list <package-name>

# 특정 버전으로 강제 설치 (최후의 수단)
npm install <package-name>@<version> --force
```

### Prisma 클라이언트 동기화
```bash
cd backend
npx prisma generate
```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2026-02-02 | 초기 의존성 명세 작성 | - |

---

## 참고 문서

- [REQUIREMENTS.md](./REQUIREMENTS.md) - 개발 환경 설정 가이드
- [README.md](./README.md) - 프로젝트 개요
- [package.json](./package.json) - 실제 패키지 정의
