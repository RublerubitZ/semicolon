import { NotificationType } from '@prisma/client';
import { prisma } from './prisma';

/**
 * 알림 생성 헬퍼 함수
 */
export const createNotification = async (params: {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedId?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        relatedId: params.relatedId,
      },
    });
    return notification;
  } catch (error) {
    console.error('[Notification Error]', {
      timestamp: new Date().toISOString(),
      error,
      params,
    });
    throw error;
  }
};

/**
 * 과제 제출 시 멘토에게 알림 전송
 */
export const notifyTaskSubmitted = async (params: {
  mentorId: string;
  menteeName: string;
  taskTitle: string;
  taskId: string;
}) => {
  return createNotification({
    userId: params.mentorId,
    type: 'TASK_SUBMITTED',
    title: `${params.menteeName}님이 과제를 제출했습니다`,
    content: `과제: ${params.taskTitle}`,
    relatedId: params.taskId,
  });
};

/**
 * 피드백 작성 시 멘티에게 알림 전송
 */
export const notifyNewFeedback = async (params: {
  menteeId: string;
  mentorName: string;
  taskTitle: string;
  taskId: string;
}) => {
  return createNotification({
    userId: params.menteeId,
    type: 'NEW_FEEDBACK',
    title: `${params.mentorName}님이 피드백을 작성했습니다`,
    content: `과제: ${params.taskTitle}`,
    relatedId: params.taskId,
  });
};

/**
 * 과제 등록 시 멘티에게 알림 전송
 */
export const notifyNewTask = async (params: {
  menteeId: string;
  mentorName: string;
  taskTitle: string;
  taskId: string;
}) => {
  return createNotification({
    userId: params.menteeId,
    type: 'NEW_TASK',
    title: `${params.mentorName}님이 새로운 과제를 등록했습니다`,
    content: `과제: ${params.taskTitle}`,
    relatedId: params.taskId,
  });
};

/**
 * 과제 승인 시 멘티에게 알림 전송
 */
export const notifyTaskApproved = async (params: {
  menteeId: string;
  mentorName: string;
  taskTitle: string;
  taskId: string;
}) => {
  return createNotification({
    userId: params.menteeId,
    type: 'TASK_APPROVED',
    title: `${params.mentorName}님이 과제를 승인했습니다`,
    content: `과제: ${params.taskTitle}`,
    relatedId: params.taskId,
  });
};
