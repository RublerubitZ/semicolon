# 설스터디 API 문서

## 서버 정보

### 배포 서버
- **Base URL**: `https://semicolon-production.up.railway.app`
- **환경**: Production (Railway)

### 로컬 개발 서버
- **Base URL**: `http://localhost:4000`
- **환경**: Development

## 인증 (Authentication)

모든 인증이 필요한 API는 헤더에 JWT 토큰을 포함해야 합니다.

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📌 API 엔드포인트

### 🔐 인증 (Auth) - `/api/auth`

#### 1. 로그인
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "길동이",
    "role": "MENTEE",
    "profileImage": "https://..."
  }
}
```

#### 2. 현재 사용자 정보 조회
```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "길동이",
    "role": "MENTEE",
    "profileImage": "https://..."
  }
}
```

#### 3. 프로필 업데이트
```http
PATCH /api/auth/update-profile
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "nickname": "새로운닉네임",
  "profileImage": "https://cloudinary.com/..."
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "홍길동",
    "nickname": "새로운닉네임",
    "role": "MENTEE",
    "profileImage": "https://..."
  }
}
```

#### 4. 비밀번호 변경
```http
PATCH /api/auth/change-password
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "비밀번호가 변경되었습니다."
}
```

---

### 📤 파일 업로드 (Upload) - `/api/upload`

모든 업로드 API는 인증이 필요합니다.

#### 1. 이미지 업로드
```http
POST /api/upload/image
```

**Headers:** `Authorization: Bearer {token}`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `image`: File (최대 10MB, 형식: JPG, PNG, GIF, WEBP)

**Response (200):**
```json
{
  "url": "https://res.cloudinary.com/.../image.jpg",
  "publicId": "seolstudy/submissions/abc123"
}
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('https://semicolon-production.up.railway.app/api/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data.url); // 이미지 URL
```

#### 2. PDF 업로드
```http
POST /api/upload/pdf
```

**Headers:** `Authorization: Bearer {token}`

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `pdf`: File (최대 10MB)

**Response (200):**
```json
{
  "url": "https://res.cloudinary.com/.../worksheet.pdf",
  "publicId": "seolstudy/worksheets/worksheet_1234567890.pdf"
}
```

---

### 👨‍🎓 멘티 (Mentee) - `/api/mentee`

모든 멘티 API는 인증이 필요합니다.

#### 1. 대시보드
```http
GET /api/mentee/dashboard
```

**Response (200):**
```json
{
  "todayStats": {
    "total": 5,
    "completed": 3,
    "progressRate": 60
  },
  "yesterdayFeedbacks": [
    {
      "id": "feedback-id",
      "summary": "전반적으로 우수함",
      "subject": "MATH",
      "feedbackDate": "2024-02-02T00:00:00.000Z"
    }
  ]
}
```

#### 2. 주간 플래너 조회
```http
GET /api/mentee/planner/weekly?year=2024&week=5
```

**Query Parameters:**
- `year`: 연도 (기본값: 현재 연도)
- `week`: 주차 (기본값: 현재 주차)

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "task-id",
      "title": "수학 문제집 10페이지",
      "description": "기본 문제 풀이",
      "subject": "MATH",
      "date": "2024-02-05T00:00:00.000Z",
      "isFixed": false,
      "worksheet": null,
      "submissions": [],
      "studyLogs": []
    }
  ],
  "stats": {
    "totalTasks": 10,
    "completedTasks": 5,
    "totalStudyTime": 3600,
    "subjectStats": {
      "MATH": { "total": 5, "completed": 3, "studyTime": 1800 },
      "KOREAN": { "total": 3, "completed": 1, "studyTime": 1200 },
      "ENGLISH": { "total": 2, "completed": 1, "studyTime": 600 }
    }
  },
  "year": 2024,
  "week": 5
}
```

#### 3. 월간 플래너 조회
```http
GET /api/mentee/planner/monthly?year=2024&month=2
```

**Query Parameters:**
- `year`: 연도 (기본값: 현재 연도)
- `month`: 월 (기본값: 현재 월)

**Response (200):**
```json
{
  "tasksByDate": {
    "2024-02-01": [
      {
        "id": "task-id",
        "title": "영어 단어 암기",
        "subject": "ENGLISH",
        "date": "2024-02-01T00:00:00.000Z"
      }
    ]
  },
  "stats": {
    "totalTasks": 30,
    "completedTasks": 20,
    "totalStudyTime": 18000,
    "subjectStats": { ... }
  },
  "year": 2024,
  "month": 2
}
```

#### 4. 할 일 목록 조회
```http
GET /api/mentee/assignments
```

**Response (200):**
```json
{
  "upcoming": [
    {
      "id": "task-id",
      "title": "내일까지 과제",
      "date": "2024-02-06T00:00:00.000Z",
      "status": "upcoming"
    }
  ],
  "inProgress": [
    {
      "id": "task-id",
      "title": "오늘 과제",
      "date": "2024-02-05T00:00:00.000Z",
      "status": "inProgress"
    }
  ],
  "completed": [
    {
      "id": "task-id",
      "title": "완료된 과제",
      "date": "2024-02-04T00:00:00.000Z",
      "status": "completed"
    }
  ]
}
```

#### 5. 특정 과제 상세 조회
```http
GET /api/mentee/tasks/:taskId
```

**Response (200):**
```json
{
  "id": "task-id",
  "title": "수학 문제집",
  "description": "10페이지 풀이",
  "subject": "MATH",
  "date": "2024-02-05T00:00:00.000Z",
  "isFixed": true,
  "isCompleted": false,
  "isApproved": false,
  "selfCheck": "GOOD",
  "worksheet": {
    "id": "worksheet-id",
    "title": "2월 1주차 수학",
    "content": "문제 설명"
  },
  "submissions": [
    {
      "id": "submission-id",
      "imageUrls": ["https://..."],
      "comment": "완료했습니다",
      "createdAt": "2024-02-05T10:00:00.000Z"
    }
  ],
  "feedbacks": [],
  "studyLogs": [
    {
      "id": "log-id",
      "duration": 3600,
      "startTime": "2024-02-05T09:00:00.000Z"
    }
  ]
}
```

#### 6. 과제 제출
```http
POST /api/mentee/tasks/:taskId/submit
```

**Request Body:**
```json
{
  "imageUrls": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "comment": "완료했습니다"
}
```

**Response (201):**
```json
{
  "id": "submission-id",
  "taskId": "task-id",
  "imageUrls": ["https://..."],
  "comment": "완료했습니다",
  "createdAt": "2024-02-05T10:00:00.000Z"
}
```

#### 7. 자가점검 업데이트
```http
PATCH /api/mentee/tasks/:taskId/self-check
```

**Request Body:**
```json
{
  "selfCheck": "GOOD"
}
```

**Values:** `"GOOD"`, `"NORMAL"`, `"BAD"`

**Response (200):**
```json
{
  "id": "task-id",
  "selfCheck": "GOOD"
}
```

#### 8. 공부 시간 기록 시작
```http
POST /api/mentee/tasks/:taskId/study/start
```

**Response (201):**
```json
{
  "id": "log-id",
  "taskId": "task-id",
  "startTime": "2024-02-05T09:00:00.000Z",
  "endTime": null,
  "duration": 0
}
```

#### 9. 공부 시간 기록 종료
```http
POST /api/mentee/tasks/:taskId/study/end
```

**Response (200):**
```json
{
  "id": "log-id",
  "taskId": "task-id",
  "startTime": "2024-02-05T09:00:00.000Z",
  "endTime": "2024-02-05T10:00:00.000Z",
  "duration": 3600
}
```

#### 10. 피드백 목록 조회
```http
GET /api/mentee/feedbacks?subject=MATH
```

**Query Parameters:**
- `subject`: 과목 필터 (선택, 값: KOREAN, ENGLISH, MATH)

**Response (200):**
```json
[
  {
    "id": "feedback-id",
    "summary": "전반적으로 우수함",
    "content": "잘 풀었습니다. 다음에는...",
    "subject": "MATH",
    "feedbackDate": "2024-02-05T00:00:00.000Z",
    "task": {
      "id": "task-id",
      "title": "수학 문제집"
    },
    "mentor": {
      "id": "mentor-id",
      "name": "김선생",
      "nickname": "김쌤"
    }
  }
]
```

#### 11. 특정 피드백 상세 조회
```http
GET /api/mentee/feedbacks/:feedbackId
```

**Response (200):**
```json
{
  "id": "feedback-id",
  "summary": "전반적으로 우수함",
  "content": "잘 풀었습니다. 다음에는...",
  "subject": "MATH",
  "feedbackDate": "2024-02-05T00:00:00.000Z",
  "task": {
    "id": "task-id",
    "title": "수학 문제집",
    "date": "2024-02-05T00:00:00.000Z"
  },
  "mentor": {
    "id": "mentor-id",
    "name": "김선생",
    "nickname": "김쌤",
    "profileImage": "https://..."
  }
}
```

#### 12. 과목별 통계 조회
```http
GET /api/mentee/stats
```

**Response (200):**
```json
{
  "MATH": {
    "total": 10,
    "completed": 7
  },
  "KOREAN": {
    "total": 8,
    "completed": 5
  },
  "ENGLISH": {
    "total": 5,
    "completed": 3
  }
}
```

#### 13. 제출물에 코멘트 추가
```http
POST /api/mentee/submissions/:submissionId/comment
```

**Request Body:**
```json
{
  "comment": "추가 설명입니다"
}
```

**Response (201):**
```json
{
  "id": "submission-id",
  "comment": "추가 설명입니다"
}
```

---

### 👨‍🏫 멘토 (Mentor) - `/api/mentor`

모든 멘토 API는 인증이 필요합니다.

#### 1. 멘티 목록 조회
```http
GET /api/mentor/mentees
```

**Response (200):**
```json
[
  {
    "id": "mentee-id",
    "name": "홍길동",
    "nickname": "길동이",
    "email": "student@example.com",
    "profileImage": "https://...",
    "totalTasks": 20,
    "completedTasks": 15
  }
]
```

#### 2. 특정 멘티 주간 플래너 조회
```http
GET /api/mentor/mentees/:menteeId/planner/weekly?year=2024&week=5
```

**Query Parameters:**
- `year`: 연도 (기본값: 현재 연도)
- `week`: 주차 (기본값: 현재 주차)

**Response (200):**
```json
{
  "tasks": [...],
  "stats": {
    "totalTasks": 10,
    "completedTasks": 7,
    "totalStudyTime": 7200,
    "subjectStats": { ... }
  },
  "year": 2024,
  "week": 5
}
```

#### 3. 특정 멘티 월간 플래너 조회
```http
GET /api/mentor/mentees/:menteeId/planner/monthly?year=2024&month=2
```

**Query Parameters:**
- `year`: 연도 (기본값: 현재 연도)
- `month`: 월 (기본값: 현재 월)

**Response (200):**
```json
{
  "tasksByDate": { ... },
  "stats": { ... },
  "year": 2024,
  "month": 2
}
```

#### 4. 과제 생성
```http
POST /api/mentor/tasks
```

**Request Body:**
```json
{
  "menteeId": "mentee-id",
  "title": "수학 문제집 10페이지",
  "description": "기본 문제 풀이",
  "subject": "MATH",
  "date": "2024-02-05T00:00:00.000Z",
  "isFixed": true,
  "worksheetId": "worksheet-id"
}
```

**Response (201):**
```json
{
  "id": "task-id",
  "menteeId": "mentee-id",
  "title": "수학 문제집 10페이지",
  "description": "기본 문제 풀이",
  "subject": "MATH",
  "date": "2024-02-05T00:00:00.000Z",
  "isFixed": true,
  "worksheetId": "worksheet-id"
}
```

#### 5. 과제 수정
```http
PUT /api/mentor/tasks/:taskId
```

**Request Body:**
```json
{
  "title": "수정된 제목",
  "description": "수정된 설명",
  "subject": "MATH",
  "date": "2024-02-06T00:00:00.000Z"
}
```

**Response (200):**
```json
{
  "id": "task-id",
  "title": "수정된 제목",
  ...
}
```

#### 6. 과제 삭제
```http
DELETE /api/mentor/tasks/:taskId
```

**Response (200):**
```json
{
  "message": "할 일이 삭제되었습니다."
}
```

#### 7. 피드백 작성 (자동 승인 포함)
```http
POST /api/mentor/feedbacks
```

**Request Body:**
```json
{
  "taskId": "task-id",
  "content": "잘 풀었습니다. 다음에는 더 자세히 풀이 과정을 적어주세요.",
  "summary": "전반적으로 우수함",
  "subject": "MATH",
  "feedbackDate": "2024-02-05T00:00:00.000Z"
}
```

**Response (201):**
```json
{
  "id": "feedback-id",
  "taskId": "task-id",
  "mentorId": "mentor-id",
  "content": "잘 풀었습니다...",
  "summary": "전반적으로 우수함",
  "subject": "MATH",
  "feedbackDate": "2024-02-05T00:00:00.000Z"
}
```

**참고:** 피드백 작성 시 해당 과제가 자동으로 승인됩니다.

#### 8. 피드백 수정
```http
PUT /api/mentor/feedbacks/:feedbackId
```

**Request Body:**
```json
{
  "content": "수정된 내용",
  "summary": "수정된 요약"
}
```

**Response (200):**
```json
{
  "id": "feedback-id",
  "content": "수정된 내용",
  "summary": "수정된 요약"
}
```

#### 9. 피드백 삭제
```http
DELETE /api/mentor/feedbacks/:feedbackId
```

**Response (200):**
```json
{
  "message": "피드백이 삭제되었습니다."
}
```

#### 10. 학습지 목록 조회
```http
GET /api/mentor/worksheets
```

**Response (200):**
```json
[
  {
    "id": "worksheet-id",
    "title": "2월 1주차 수학",
    "content": "문제 설명 및 지침",
    "subject": "MATH",
    "pdfUrl": "https://cloudinary.com/worksheet.pdf",
    "createdAt": "2024-02-01T00:00:00.000Z"
  }
]
```

#### 11. 학습지 생성
```http
POST /api/mentor/worksheets
```

**Request Body:**
```json
{
  "title": "2월 2주차 영어",
  "content": "문제 설명 및 지침",
  "subject": "ENGLISH",
  "pdfUrl": "https://cloudinary.com/worksheet.pdf"
}
```

**Response (201):**
```json
{
  "id": "worksheet-id",
  "title": "2월 2주차 영어",
  "content": "문제 설명 및 지침",
  "subject": "ENGLISH",
  "pdfUrl": "https://cloudinary.com/worksheet.pdf"
}
```

#### 12. 학습지 수정
```http
PUT /api/mentor/worksheets/:worksheetId
```

**Request Body:**
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용"
}
```

**Response (200):**
```json
{
  "id": "worksheet-id",
  "title": "수정된 제목",
  "content": "수정된 내용"
}
```

#### 13. 학습지 삭제
```http
DELETE /api/mentor/worksheets/:worksheetId
```

**Response (200):**
```json
{
  "message": "학습지가 삭제되었습니다."
}
```

---

## 📋 데이터 타입 (Types)

### Subject (과목)
```typescript
type Subject = "KOREAN" | "ENGLISH" | "MATH";
```

### SelfCheck (자가점검)
```typescript
type SelfCheck = "GOOD" | "NORMAL" | "BAD" | null;
```

### Role (사용자 역할)
```typescript
type Role = "MENTEE" | "MENTOR";
```

---

## ⚠️ 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "error": "오류 메시지"
}
```

### HTTP 상태 코드
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스를 찾을 수 없음
- `413`: 파일 크기 초과
- `500`: 서버 오류

---

## 🔧 프론트엔드 사용 예제

### API 호출 유틸리티 함수

```typescript
// src/lib/api.ts
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 로컬 개발 환경
  return 'http://localhost:4000';
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  return fetch(`${getApiUrl()}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
```

### 로그인 예제

```typescript
const handleLogin = async (email: string, password: string) => {
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data.user;
};
```

### 과제 목록 조회 예제

```typescript
const fetchAssignments = async () => {
  const response = await fetchWithAuth('/api/mentee/assignments');

  if (!response.ok) {
    throw new Error('과제 목록을 불러오는데 실패했습니다.');
  }

  return await response.json();
};
```

### 이미지 업로드 예제

```typescript
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('token');
  const response = await fetch(`${getApiUrl()}/api/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('이미지 업로드에 실패했습니다.');
  }

  const data = await response.json();
  return data.url;
};
```

---

## 📝 참고사항

1. **날짜 형식**: 모든 날짜는 ISO 8601 형식 (`YYYY-MM-DDTHH:mm:ss.sssZ`)으로 전송/수신됩니다.

2. **파일 업로드 제한**:
   - 최대 파일 크기: 10MB
   - 지원 이미지 형식: JPG, PNG, GIF, WEBP

3. **토큰 만료**: JWT 토큰은 7일 후 만료됩니다.

4. **과제 제출 기준 완료**: 과제는 제출(submission)이 있으면 완료로 간주됩니다. 멘토의 승인은 피드백 작성 시 자동으로 처리됩니다.

5. **CORS**: 개발 환경에서는 모든 origin이 허용되며, 프로덕션에서는 설정된 FRONTEND_URL만 허용됩니다.

---

**문서 업데이트**: 2024-02-03
**API 버전**: 1.0.0
