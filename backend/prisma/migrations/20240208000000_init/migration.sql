-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MENTEE', 'MENTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SelfCheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'NOT_DONE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'COLUMN');

-- CreateEnum
CREATE TYPE "WorksheetType" AS ENUM ('COLUMN', 'PDF');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_INCOMPLETE', 'NEW_FEEDBACK', 'REMINDER', 'NEW_TASK', 'TASK_SUBMITTED', 'TASK_APPROVED', 'STREAK_BROKEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MENTEE',
    "grade" TEXT,
    "profileImage" TEXT,
    "gender" TEXT,
    "birthDate" TEXT,
    "goal" TEXT,
    "phone" TEXT,
    "notifyTaskIncomplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewFeedback" BOOLEAN NOT NULL DEFAULT true,
    "notifyReminder" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewTask" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskApproved" BOOLEAN NOT NULL DEFAULT true,
    "notifyStreakBroken" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMentee" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMentee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "worksheetId" TEXT,
    "pdfUrl" TEXT,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "selfCheck" "SelfCheckStatus" NOT NULL DEFAULT 'PENDING',
    "selfCheckedAt" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_materials" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "pdfFileName" TEXT,
    "columnTitle" TEXT,
    "columnContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoalItem" (
    "id" TEXT NOT NULL,
    "learningGoalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningGoalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSubmission" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "subject" TEXT NOT NULL,
    "feedbackDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "pdfUrl" TEXT,
    "pdfFileName" TEXT,
    "type" "WorksheetType" NOT NULL DEFAULT 'COLUMN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worksheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTimeLog" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "taskId" TEXT,
    "subject" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "duration" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerComment" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFeedback" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyFeedback" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "overallComment" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "improvements" TEXT NOT NULL,
    "nextMonthGoals" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyFeedback" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "overallComment" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "improvements" TEXT NOT NULL,
    "nextWeekGoals" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyStreak" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MentorMentee_mentorId_menteeId_key" ON "MentorMentee"("mentorId", "menteeId");

-- CreateIndex
CREATE INDEX "Task_menteeId_date_idx" ON "Task"("menteeId", "date");

-- CreateIndex
CREATE INDEX "Task_mentorId_date_idx" ON "Task"("mentorId", "date");

-- CreateIndex
CREATE INDEX "Task_isFixed_idx" ON "Task"("isFixed");

-- CreateIndex
CREATE INDEX "Task_menteeId_isFixed_idx" ON "Task"("menteeId", "isFixed");

-- CreateIndex
CREATE INDEX "Task_subject_idx" ON "Task"("subject");

-- CreateIndex
CREATE INDEX "task_materials_taskId_order_idx" ON "task_materials"("taskId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearningGoal_taskId_key" ON "LearningGoal"("taskId");

-- CreateIndex
CREATE INDEX "LearningGoalItem_learningGoalId_idx" ON "LearningGoalItem"("learningGoalId");

-- CreateIndex
CREATE INDEX "feedback_comments_taskId_idx" ON "feedback_comments"("taskId");

-- CreateIndex
CREATE INDEX "feedback_comments_userId_idx" ON "feedback_comments"("userId");

-- CreateIndex
CREATE INDEX "StudyTimeLog_menteeId_date_idx" ON "StudyTimeLog"("menteeId", "date");

-- CreateIndex
CREATE INDEX "StudyTimeLog_menteeId_subject_date_idx" ON "StudyTimeLog"("menteeId", "subject", "date");

-- CreateIndex
CREATE INDEX "PlannerComment_menteeId_date_idx" ON "PlannerComment"("menteeId", "date");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyFeedback_menteeId_date_idx" ON "DailyFeedback"("menteeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFeedback_menteeId_date_key" ON "DailyFeedback"("menteeId", "date");

-- CreateIndex
CREATE INDEX "MonthlyFeedback_menteeId_year_month_idx" ON "MonthlyFeedback"("menteeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFeedback_menteeId_year_month_key" ON "MonthlyFeedback"("menteeId", "year", "month");

-- CreateIndex
CREATE INDEX "WeeklyFeedback_menteeId_year_month_idx" ON "WeeklyFeedback"("menteeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFeedback_menteeId_year_month_weekNumber_key" ON "WeeklyFeedback"("menteeId", "year", "month", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudyStreak_menteeId_key" ON "StudyStreak"("menteeId");

-- CreateIndex
CREATE INDEX "StudyStreak_menteeId_idx" ON "StudyStreak"("menteeId");

-- CreateIndex
CREATE INDEX "StudyStreak_lastStudyDate_idx" ON "StudyStreak"("lastStudyDate");

-- AddForeignKey
ALTER TABLE "MentorMentee" ADD CONSTRAINT "MentorMentee_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMentee" ADD CONSTRAINT "MentorMentee_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_materials" ADD CONSTRAINT "task_materials_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoalItem" ADD CONSTRAINT "LearningGoalItem_learningGoalId_fkey" FOREIGN KEY ("learningGoalId") REFERENCES "LearningGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTimeLog" ADD CONSTRAINT "StudyTimeLog_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTimeLog" ADD CONSTRAINT "StudyTimeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerComment" ADD CONSTRAINT "PlannerComment_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeedback" ADD CONSTRAINT "DailyFeedback_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeedback" ADD CONSTRAINT "DailyFeedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFeedback" ADD CONSTRAINT "MonthlyFeedback_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFeedback" ADD CONSTRAINT "MonthlyFeedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFeedback" ADD CONSTRAINT "WeeklyFeedback_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyFeedback" ADD CONSTRAINT "WeeklyFeedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyStreak" ADD CONSTRAINT "StudyStreak_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

