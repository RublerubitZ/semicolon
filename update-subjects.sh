#!/bin/bash

# 업데이트할 파일 목록
files=(
  "frontend/src/app/mentee/calendar/page.tsx"
  "frontend/src/app/mentee/history/page.tsx"
  "frontend/src/app/mentee/reports/page.tsx"
  "frontend/src/app/mentee/feedbacks/page.tsx"
  "frontend/src/app/mentee/history/[id]/page.tsx"
  "frontend/src/app/mentee/tasks/[id]/page.tsx"
  "frontend/src/app/mentee/planner/monthly/page.tsx"
  "frontend/src/app/mentee/planner/weekly/page.tsx"
  "frontend/src/app/mentor/tasks/new/page.tsx"
  "frontend/src/app/mentor/tasks/[id]/page.tsx"
  "frontend/src/app/mentor/mentees/[id]/page.tsx"
  "frontend/src/app/mentor/worksheets/page.tsx"
  "frontend/src/app/mentor/feedbacks/new/page.tsx"
  "frontend/src/app/mentor/feedbacks/[id]/edit/page.tsx"
  "frontend/src/app/mentor/reports/WeeklyFeedbackForm.tsx"
  "frontend/src/app/mentor/reports/MonthlyFeedbackForm.tsx"
  "frontend/src/app/mentor/reports/MentorDashboard.tsx"
)

echo "업데이트할 파일 수: ${#files[@]}"
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (없음)"
  fi
done
