# 토큰 자동 갱신 개선 가이드

## 문제점

기존 시스템에서는 다음과 같은 문제가 있었습니다:

1. **Access Token 만료 (30분)** 후 API 요청 시 자동으로 토큰을 갱신하지 않음
2. 브라우저 탭이 백그라운드에 있으면 타이머가 정확히 작동하지 않아 토큰 갱신 실패
3. 사용자가 일정 시간 작업하지 않다가 다시 사용하려고 하면 로그인이 풀림

## 해결 방법

### 1. 자동 토큰 갱신 시스템 구축

`fetchWithAuth` 함수를 추가하여 API 요청 시 401 에러가 발생하면 자동으로:
- Refresh Token을 사용해 새 Access Token 발급
- 원래 요청을 새 토큰으로 재시도
- Refresh Token도 만료되었으면 로그인 페이지로 리다이렉트

### 2. 편의 함수 제공

개발자가 쉽게 사용할 수 있도록 헬퍼 함수 제공:
- `apiGet(endpoint)` - GET 요청
- `apiPost(endpoint, data)` - POST 요청
- `apiPut(endpoint, data)` - PUT 요청
- `apiPatch(endpoint, data)` - PATCH 요청
- `apiDelete(endpoint)` - DELETE 요청

## 사용 방법

### 기존 코드 (변경 전)

```typescript
// ❌ 기존 방식 - 401 에러 시 자동 갱신 안 됨
const token = localStorage.getItem("token");
const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${item.id}/time`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ date, startTime, endTime, duration }),
});

if (!res.ok) {
  // 401 에러가 발생하면 사용자가 로그아웃됨
  throw new Error("요청 실패");
}
```

### 새로운 코드 (변경 후)

```typescript
// ✅ 새로운 방식 - 401 에러 시 자동으로 토큰 갱신하고 재시도
import { apiPost } from "@/lib/api";

const res = await apiPost(`/api/mentee/tasks/${item.id}/time`, {
  date,
  startTime,
  endTime,
  duration,
});

if (!res.ok) {
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || "요청 실패");
}
```

### 다른 HTTP 메서드 사용 예시

```typescript
import { apiGet, apiPut, apiDelete } from "@/lib/api";

// GET 요청
const tasksRes = await apiGet("/api/mentee/tasks");
const tasks = await tasksRes.json();

// PUT 요청
const updateRes = await apiPut(`/api/tasks/${id}`, {
  title: "새 제목",
  status: "DONE",
});

// DELETE 요청
const deleteRes = await apiDelete(`/api/tasks/${id}`);
```

### fetchWithAuth 직접 사용 (커스텀 헤더가 필요한 경우)

```typescript
import { fetchWithAuth, getApiUrl } from "@/lib/api";

const res = await fetchWithAuth(`${getApiUrl()}/api/upload`, {
  method: "POST",
  headers: {
    // Content-Type을 설정하지 않으면 multipart/form-data가 자동으로 설정됨
  },
  body: formData,
});
```

## 작동 원리

### 1. 첫 번째 요청
```
Client → API: GET /api/tasks (with expired token)
API → Client: 401 Unauthorized
```

### 2. 자동 토큰 갱신
```
Client → API: POST /api/auth/refresh (with refresh token)
API → Client: { token: "new_access_token" }
```

### 3. 요청 재시도
```
Client → API: GET /api/tasks (with new token)
API → Client: 200 OK + data
```

### 4. Refresh Token도 만료된 경우
```
Client → API: POST /api/auth/refresh (with expired refresh token)
API → Client: 401 Unauthorized
Client: Redirect to /login?reason=expired
```

## 토큰 만료 시간

- **Access Token**: 30분 (백엔드에서 설정)
- **Refresh Token**: 7일 (백엔드에서 설정)
- **자동 갱신 주기**: 25분마다 (타이머 기반, 백그라운드에서 실패할 수 있음)
- **API 요청 시 자동 갱신**: 401 에러 발생 시 즉시 (새로 추가된 기능)

## 주의사항

1. **로그인/회원가입 API는 토큰이 필요 없으므로 일반 fetch 사용**
   ```typescript
   // 로그인은 토큰이 없으므로 일반 fetch 사용
   const res = await fetch(`${getApiUrl()}/api/auth/login`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ email, password }),
   });
   ```

2. **파일 업로드는 Content-Type 헤더를 자동으로 설정하므로 fetchWithAuth 사용 시 헤더 제거**
   ```typescript
   // FormData를 사용할 때는 Content-Type을 설정하지 않음
   const formData = new FormData();
   formData.append("file", file);

   const res = await fetchWithAuth(`${getApiUrl()}/api/upload`, {
     method: "POST",
     body: formData,
     // headers에 Content-Type을 설정하지 않음!
   });
   ```

3. **여러 요청이 동시에 401 에러를 받아도 토큰은 한 번만 갱신됨**
   - 첫 번째 요청이 토큰을 갱신하는 동안 다른 요청들은 대기
   - 갱신이 완료되면 모든 요청이 새 토큰으로 재시도

## 마이그레이션 체크리스트

기존 코드를 새로운 방식으로 마이그레이션하려면:

- [ ] `localStorage.getItem("token")` 직접 사용하는 부분 찾기
- [ ] `fetch()` 호출을 `apiGet/apiPost/apiPut/apiDelete`로 변경
- [ ] `Authorization` 헤더를 수동으로 설정하는 부분 제거
- [ ] 401 에러 처리를 위한 중복 코드 제거
- [ ] 테스트: 토큰 만료 후 API 요청이 자동으로 재시도되는지 확인

## 테스트 방법

### 1. 로컬 테스트

```javascript
// 브라우저 콘솔에서 실행
// 1. Access Token을 만료시킴
localStorage.setItem('token', 'expired_token');

// 2. API 요청 (자동으로 갱신되어야 함)
fetch('/api/tasks', {
  headers: { 'Authorization': 'Bearer expired_token' }
}).then(res => console.log('Status:', res.status));
```

### 2. 실제 시나리오 테스트

1. 로그인 후 30분 이상 대기
2. 페이지에서 API 요청을 발생시키는 액션 수행 (예: 과제 체크)
3. 자동으로 토큰이 갱신되고 요청이 성공하는지 확인

## 문제 해결

### 무한 리다이렉트 루프

- **원인**: Refresh Token도 만료되었는데 계속 갱신 시도
- **해결**: 코드에서 이미 처리됨 - 갱신 실패 시 localStorage 정리 후 로그인 페이지로 이동

### 타이머 기반 갱신이 작동하지 않음

- **원인**: 브라우저 탭이 백그라운드에 있으면 타이머가 느려짐
- **해결**: API 요청 시 자동 갱신 기능으로 보완됨

### 동시 요청 시 토큰 갱신이 여러 번 발생

- **원인**: 여러 API 요청이 동시에 401 에러를 받음
- **해결**: `isRefreshing` 플래그로 한 번만 갱신하도록 처리됨

## 관련 파일

- `frontend/src/lib/api.ts` - fetchWithAuth 및 헬퍼 함수
- `frontend/src/lib/auth.ts` - 토큰 관리 유틸리티
- `frontend/src/hooks/useAutoLogout.ts` - 자동 로그아웃 훅 (타이머 기반)
- `backend/src/routes/auth.ts` - 토큰 발급 및 갱신 API
