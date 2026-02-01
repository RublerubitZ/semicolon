#!/bin/bash

# 설스터디 백엔드 API 테스트 스크립트
# 사용법: ./test-api.sh

BASE_URL="http://localhost:4000"

echo "========================================="
echo "설스터디 API 테스트"
echo "========================================="
echo ""

# 1. 로그인 테스트
echo "1. 로그인 테스트"
echo "-------------------"
echo "멘토 로그인..."
MENTOR_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentor@seolstudy.com",
    "password": "mentor123!"
  }')

MENTOR_TOKEN=$(echo $MENTOR_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "멘토 토큰: ${MENTOR_TOKEN:0:20}..."
echo ""

echo "멘티 로그인..."
MENTEE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mentee1@seolstudy.com",
    "password": "mentee123!"
  }')

MENTEE_TOKEN=$(echo $MENTEE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
MENTEE_ID=$(echo $MENTEE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "멘티 토큰: ${MENTEE_TOKEN:0:20}..."
echo "멘티 ID: $MENTEE_ID"
echo ""

# 2. 멘토 API 테스트
echo "2. 멘토 API 테스트"
echo "-------------------"

echo "2.1 담당 멘티 목록 조회"
curl -s -X GET "${BASE_URL}/api/mentor/mentees" \
  -H "Authorization: Bearer $MENTOR_TOKEN" | jq '.[] | {name: .name, totalTasks, completedTasks}'
echo ""

echo "2.2 멘티 상세 조회"
curl -s -X GET "${BASE_URL}/api/mentor/mentees/${MENTEE_ID}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" | jq '{name: .name, email: .email, tasksCount: .menteeTasks | length}'
echo ""

echo "2.3 멘티 일일 플래너 조회"
TODAY=$(date +%Y-%m-%d)
curl -s -X GET "${BASE_URL}/api/mentor/mentees/${MENTEE_ID}/planner/daily?date=${TODAY}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" | jq '{date: .date, tasksCount: .tasks | length}'
echo ""

echo "2.4 학습지 목록 조회"
curl -s -X GET "${BASE_URL}/api/mentor/worksheets" \
  -H "Authorization: Bearer $MENTOR_TOKEN" | jq '.[] | {title: .title, subject: .subject}'
echo ""

# 3. 멘티 API 테스트
echo "3. 멘티 API 테스트"
echo "-------------------"

echo "3.1 일일 플래너 조회"
curl -s -X GET "${BASE_URL}/api/mentee/planner?date=${TODAY}" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq '{date: .date, tasksCount: .tasks | length, hasComment: (.comment != null)}'
echo ""

echo "3.2 주간 플래너 조회"
curl -s -X GET "${BASE_URL}/api/mentee/planner/weekly?startDate=${TODAY}" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq '{stats: .stats | {totalTasks, completedTasks, totalStudyTime}}'
echo ""

echo "3.3 월간 플래너 조회"
YEAR=$(date +%Y)
MONTH=$(date +%m)
curl -s -X GET "${BASE_URL}/api/mentee/planner/monthly?year=${YEAR}&month=${MONTH}" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq '{year: .year, month: .month, stats: .stats | {totalTasks, completedTasks}}'
echo ""

echo "3.4 피드백 목록 조회"
curl -s -X GET "${BASE_URL}/api/mentee/feedbacks" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq 'length'
echo "개의 피드백이 있습니다."
echo ""

echo "3.5 통계 조회"
curl -s -X GET "${BASE_URL}/api/mentee/stats" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq '.'
echo ""

# 4. 할 일 생성 및 관리 테스트
echo "4. 할 일 생성 및 관리 테스트"
echo "----------------------------"

echo "4.1 멘토가 할 일 생성"
NEW_TASK=$(curl -s -X POST "${BASE_URL}/api/mentor/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MENTOR_TOKEN" \
  -d "{
    \"menteeId\": \"${MENTEE_ID}\",
    \"title\": \"API 테스트 과제\",
    \"description\": \"테스트를 위한 샘플 과제입니다\",
    \"subject\": \"KOREAN\",
    \"date\": \"${TODAY}\"
  }")

NEW_TASK_ID=$(echo $NEW_TASK | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "생성된 할 일 ID: $NEW_TASK_ID"
echo ""

echo "4.2 멘티가 할 일 완료 처리"
curl -s -X PATCH "${BASE_URL}/api/mentee/tasks/${NEW_TASK_ID}/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MENTEE_TOKEN" \
  -d '{"isCompleted": true}' | jq '{id: .id, isCompleted: .isCompleted}'
echo ""

echo "4.3 할 일 상세 조회"
curl -s -X GET "${BASE_URL}/api/mentee/tasks/${NEW_TASK_ID}" \
  -H "Authorization: Bearer $MENTEE_TOKEN" | jq '{id: .id, title: .title, isCompleted: .isCompleted}'
echo ""

echo "4.4 멘토가 할 일 삭제"
curl -s -X DELETE "${BASE_URL}/api/mentor/tasks/${NEW_TASK_ID}" \
  -H "Authorization: Bearer $MENTOR_TOKEN" | jq '.'
echo ""

echo "========================================="
echo "테스트 완료!"
echo "========================================="
