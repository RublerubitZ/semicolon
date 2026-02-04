# 알림 기능 테스트 가이드

## 개요
알림 기능(리마인더, 과제 제출, 피드백 등)을 테스트하는 방법을 설명합니다.

## 자동 스케줄러
백엔드 서버가 실행되면 다음 스케줄러가 자동으로 시작됩니다:

- **오전 9시 (09:00 KST)**: 오늘의 과제 리마인더
- **저녁 9시 (21:00 KST)**: 미완료 과제 알림

## 수동 테스트 방법

### 1. 프론트엔드 브라우저 콘솔에서 실행

#### Chrome/Edge에서 개발자 도구 열기
- Windows/Linux: `F12` 또는 `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

#### Console 탭으로 이동 후 아래 코드 실행

```javascript
// 1. 오늘의 과제 리마인더 테스트
async function testDailyReminder() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:4000/api/notifications/test/daily-reminder', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  console.log('Daily Reminder:', data);
  return data;
}

// 2. 미완료 과제 알림 테스트
async function testIncompleteReminder() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:4000/api/notifications/test/incomplete-tasks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  console.log('Incomplete Tasks:', data);
  return data;
}

// 모두 실행
async function runAll() {
  console.log('===== 리마인더 테스트 시작 =====');
  await testDailyReminder();
  await testIncompleteReminder();
  console.log('===== 테스트 완료 =====');
  console.log('알림 벨 아이콘을 확인하세요!');
}

// 실행
runAll();
```

### 2. curl로 테스트 (터미널)

```bash
# 토큰을 먼저 설정
TOKEN="여기에_실제_토큰_입력"

# 오늘의 과제 리마인더
curl -X POST http://localhost:4000/api/notifications/test/daily-reminder \
  -H "Authorization: Bearer $TOKEN"

# 미완료 과제 알림
curl -X POST http://localhost:4000/api/notifications/test/incomplete-tasks \
  -H "Authorization: Bearer $TOKEN"
```

## 테스트 결과 확인

### 프론트엔드
1. 알림 벨 아이콘에 빨간 배지(숫자) 표시
2. 알림 벨 클릭 시 새로운 알림 목록 확인

### 백엔드 콘솔
```
[Scheduler] Running daily task reminder at 9 AM (KST)...
[Scheduler] Found 2 tasks for today
[Scheduler] Sent reminder to mentee xxx for 2 tasks
[Scheduler] Daily task reminder completed
```

## API 엔드포인트

### 일반 알림 API
- `GET /api/notifications` - 알림 목록 조회
- `GET /api/notifications/unread-count` - 읽지 않은 알림 개수
- `PATCH /api/notifications/:id/read` - 알림 읽음 처리
- `PATCH /api/notifications/read-all` - 모든 알림 읽음 처리

### 테스트 전용 API
- `POST /api/notifications/test/daily-reminder` - 오늘의 과제 리마인더 수동 실행
- `POST /api/notifications/test/incomplete-tasks` - 미완료 과제 알림 수동 실행

## 알림 타입

| 타입 | 설명 | 발송 조건 |
|------|------|----------|
| `NEW_TASK` | 새로운 과제 등록 | 멘토가 과제 등록 시 |
| `TASK_SUBMITTED` | 과제 제출 | 멘티가 과제 제출 시 |
| `NEW_FEEDBACK` | 새로운 피드백 | 멘토가 피드백 작성 시 |
| `TASK_APPROVED` | 과제 승인 | 멘토가 과제 승인 시 |
| `REMINDER` | 오늘의 과제 리마인더 | 매일 오전 9시 |
| `TASK_INCOMPLETE` | 미완료 과제 알림 | 매일 저녁 9시 |

## 주의사항

- 테스트 API는 인증이 필요합니다 (JWT 토큰 필수)
- 오늘 날짜에 과제가 없으면 알림이 전송되지 않습니다
- 미완료 과제 알림은 제출하지 않은 과제가 있을 때만 전송됩니다
