# 설스터디 MVP - 개발 환경 요구사항

## 필수 설치

### 1. Node.js
- **버전**: 20.x 이상 (24.x 호환 확인됨)
- **다운로드**: https://nodejs.org/

```bash
# 버전 확인
node -v  # v20.x.x 이상
npm -v   # 10.x.x 이상
```

### 2. PostgreSQL
- **버전**: 15 이상
- **옵션 A**: 로컬 설치 (https://www.postgresql.org/download/)
- **옵션 B**: Neon 클라우드 (권장) - https://neon.tech/

### 3. Git
```bash
git --version  # 2.x.x
```

---

## 프로젝트 설정

### 1. 저장소 클론
```bash
git clone git@github.com:RublerubitZ/semicolon.git
cd semicolon
```

### 2. 백엔드 설정
```bash
cd backend
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 DATABASE_URL 등 설정
```

### 3. 프론트엔드 설정
```bash
cd frontend
npm install
```

---

## 환경 변수 (.env)

### Backend (`backend/.env`)
```env
# 데이터베이스 (필수)
DATABASE_URL="postgresql://user:password@host:5432/seolstudy"

# JWT 시크릿 (필수)
JWT_SECRET="your-secret-key-here"

# 서버 설정
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Cloudinary (이미지 업로드용 - 선택)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 데이터베이스 설정

### Prisma 마이그레이션
```bash
cd backend

# 스키마를 DB에 적용
npx prisma db push

# 또는 마이그레이션 생성
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

# 테스트 계정 시드
npm run db:seed
```

---

## 실행

### 백엔드 (포트 4000)
```bash
cd backend
npm run dev
```

### 프론트엔드 (포트 3000)
```bash
cd frontend
npm run dev
```

---

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 멘토 | mentor@seolstudy.com | mentor123! |
| 멘티1 | mentee1@seolstudy.com | mentee123! |
| 멘티2 | mentee2@seolstudy.com | mentee123! |

---

## 유용한 명령어

```bash
# Prisma Studio (DB 시각화)
cd backend && npx prisma studio

# 타입 체크
cd frontend && npm run build

# ESLint
cd frontend && npm run lint
```

---

## 문제 해결

### `prisma generate` 오류
```bash
rm -rf node_modules
npm install
npx prisma generate
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :4000
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```
