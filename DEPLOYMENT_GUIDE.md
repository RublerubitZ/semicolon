# 배포 가이드

## 데이터베이스 관리

### 로컬 개발 환경

#### 1. 환경 변수 설정
```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/seolstudy"
```

#### 2. 마이그레이션 적용
```bash
cd backend
npm run db:generate  # Prisma Client 생성
npx prisma migrate dev  # 개발 DB에 마이그레이션 적용
```

#### 3. Seed 데이터 삽입 (선택사항)
```bash
npm run db:seed
```

### 프로덕션 환경 (Railway)

#### 1. 데이터베이스 설정

**Neon PostgreSQL 사용 (권장)**:
- Railway에서 Neon PostgreSQL 플러그인 추가
- 또는 https://neon.tech 에서 직접 생성

**환경 변수 설정** (Railway 대시보드):
```bash
DATABASE_URL=postgresql://user:password@hostname:5432/dbname
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-frontend-url.vercel.app
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### 2. 빌드 및 배포 프로세스

Railway는 자동으로 다음 순서로 실행합니다 ([backend/railway.json](backend/railway.json)):

```json
{
  "buildCommand": "npm install && npx prisma migrate deploy && npx prisma generate && npm run build"
}
```

**실행 순서**:
1. `npm install` - 의존성 설치
2. `npx prisma migrate deploy` - **프로덕션 DB에 마이그레이션 적용** ⭐
3. `npx prisma generate` - Prisma Client 생성
4. `npm run build` - TypeScript 컴파일

#### 3. 마이그레이션 히스토리

모든 마이그레이션은 `backend/prisma/migrations/` 폴더에 저장됩니다:
```
backend/prisma/migrations/
└── 20240208000000_init/
    └── migration.sql
```

이 폴더는 **반드시 git에 커밋**되어야 합니다!

## 데이터베이스 스키마 변경 시

### 로컬에서 스키마 수정 후

1. **스키마 파일 수정**
```bash
# backend/prisma/schema.prisma 수정
```

2. **마이그레이션 생성**
```bash
cd backend
npx prisma migrate dev --name describe_your_changes
# 예: npx prisma migrate dev --name add_user_phone_field
```

3. **Git에 커밋**
```bash
git add backend/prisma/migrations/
git add backend/prisma/schema.prisma
git commit -m "Add user phone field to schema"
git push
```

4. **Railway 자동 배포**
- Railway가 자동으로 감지하여 재배포
- 빌드 시 `prisma migrate deploy`가 자동 실행되어 프로덕션 DB 업데이트

## 주의사항

### ⚠️ 절대 하지 말 것

1. **프로덕션에서 `prisma db push` 사용 금지**
   - 마이그레이션 히스토리가 없어 롤백 불가
   - 데이터 손실 위험

2. **프로덕션에서 `prisma migrate dev` 사용 금지**
   - 개발 전용 명령어
   - DB를 리셋할 수 있음

3. **마이그레이션 파일 수동 편집 금지**
   - 이미 적용된 마이그레이션은 절대 수정하지 않기
   - 새로운 마이그레이션으로 변경사항 적용

### ✅ 권장 사항

1. **로컬에서 마이그레이션 테스트**
   ```bash
   # 테스트 DB 생성
   createdb seolstudy_test
   DATABASE_URL="postgresql://localhost/seolstudy_test" npx prisma migrate deploy
   ```

2. **마이그레이션 순서 확인**
   ```bash
   npx prisma migrate status
   ```

3. **프로덕션 DB 백업**
   - Neon 대시보드에서 자동 백업 설정
   - 또는 pg_dump로 수동 백업

## 개발 vs 프로덕션 차이점

| 항목 | 로컬 개발 | 프로덕션 (Railway) |
|------|-----------|-------------------|
| 마이그레이션 명령어 | `prisma migrate dev` | `prisma migrate deploy` |
| DB 리셋 | 가능 (`prisma migrate reset`) | **절대 안 됨** |
| Seed 데이터 | 자동 실행 가능 | 수동 실행 필요 |
| 환경 변수 | `.env` 파일 | Railway 대시보드 |

## 트러블슈팅

### 문제: "Migration history is out of sync"

**원인**: 로컬 DB와 마이그레이션 히스토리 불일치

**해결**:
```bash
# 1. 현재 상태 확인
npx prisma migrate status

# 2. 로컬 DB 리셋 (개발 환경에서만!)
npx prisma migrate reset

# 3. 마이그레이션 재적용
npx prisma migrate deploy
```

### 문제: "Migrations folder not found"

**원인**: migrations 폴더가 git에 커밋되지 않음

**해결**:
```bash
git add backend/prisma/migrations/
git commit -m "Add migrations folder"
git push
```

### 문제: 프로덕션 배포 시 DB 스키마 적용 실패

**원인**: Railway 빌드 커맨드에 `prisma migrate deploy` 누락

**해결**: [backend/railway.json](backend/railway.json) 확인
```json
{
  "buildCommand": "npm install && npx prisma migrate deploy && npx prisma generate && npm run build"
}
```

## DB 초기화 (주의!)

### 개발 환경에서 DB 완전 초기화

```bash
cd backend

# 방법 1: Prisma 명령어 사용
npx prisma migrate reset  # DB 삭제 → 마이그레이션 재적용 → Seed 실행

# 방법 2: 수동
dropdb seolstudy
createdb seolstudy
npx prisma migrate deploy
npm run db:seed
```

### 프로덕션 환경에서 DB 초기화 (매우 주의!)

⚠️ **프로덕션 데이터가 모두 삭제됩니다!**

1. Neon 대시보드에서 데이터베이스 삭제
2. 새 데이터베이스 생성
3. Railway에서 재배포 (자동으로 마이그레이션 적용)

또는:

```bash
# Neon psql 접속 후
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
# Railway 재배포
```

## 참고 자료

- [Prisma Migrate 공식 문서](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Railway 배포 가이드](https://docs.railway.app/)
- [Neon PostgreSQL](https://neon.tech/docs)
