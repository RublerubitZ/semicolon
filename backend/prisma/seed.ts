import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('시드 데이터 생성 시작...');

  // 기존 데이터 삭제
  await prisma.notification.deleteMany();
  await prisma.plannerComment.deleteMany();
  await prisma.studyTimeLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.worksheet.deleteMany();
  await prisma.mentorMentee.deleteMany();
  await prisma.user.deleteMany();

  // 비밀번호 해시
  const mentorPassword = await bcrypt.hash('mentor123!', 10);
  const menteePassword = await bcrypt.hash('mentee123!', 10);

  // 멘토 생성
  const mentor = await prisma.user.create({
    data: {
      email: 'mentor@seolstudy.com',
      password: mentorPassword,
      name: '김멘토',
      role: 'MENTOR',
    },
  });
  console.log('멘토 생성:', mentor.email);

  // 멘티 생성
  const mentee1 = await prisma.user.create({
    data: {
      email: 'mentee1@seolstudy.com',
      password: menteePassword,
      name: '이학생',
      role: 'MENTEE',
    },
  });
  console.log('멘티1 생성:', mentee1.email);

  const mentee2 = await prisma.user.create({
    data: {
      email: 'mentee2@seolstudy.com',
      password: menteePassword,
      name: '박학생',
      role: 'MENTEE',
    },
  });
  console.log('멘티2 생성:', mentee2.email);

  // 멘토-멘티 관계 생성
  await prisma.mentorMentee.create({
    data: {
      mentorId: mentor.id,
      menteeId: mentee1.id,
    },
  });

  await prisma.mentorMentee.create({
    data: {
      mentorId: mentor.id,
      menteeId: mentee2.id,
    },
  });
  console.log('멘토-멘티 관계 생성 완료');

  // 샘플 학습지 생성
  const worksheet1 = await prisma.worksheet.create({
    data: {
      createdById: mentor.id,
      title: '국어 비문학 독해 전략',
      subject: 'KOREAN',
      type: 'COLUMN',
      content: {
        sections: [
          { title: '1. 글의 구조 파악하기', content: '문단별 핵심 내용을 파악합니다.' },
          { title: '2. 주제문 찾기', content: '글의 중심 생각을 담은 문장을 찾습니다.' },
        ],
      },
    },
  });

  const worksheet2 = await prisma.worksheet.create({
    data: {
      createdById: mentor.id,
      title: '영어 독해 필수 어휘',
      subject: 'ENGLISH',
      type: 'COLUMN',
      content: {
        vocabulary: [
          { word: 'comprehension', meaning: '이해력' },
          { word: 'context', meaning: '문맥' },
        ],
      },
    },
  });

  const worksheet3 = await prisma.worksheet.create({
    data: {
      createdById: mentor.id,
      title: '수학 미적분 기초',
      subject: 'MATH',
      type: 'COLUMN',
      content: {
        topics: [
          { title: '극한의 개념', description: '함수의 극한값 이해하기' },
          { title: '미분 계수', description: '순간변화율의 의미' },
        ],
      },
    },
  });
  console.log('샘플 학습지 생성 완료');

  // 오늘 날짜
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 멘티1에게 샘플 할 일 생성
  const task1 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '비문학 지문 3개 풀기',
      description: '시간 재고 풀어보기 (지문당 8분)',
      subject: 'KOREAN',
      date: today,
      worksheetId: worksheet1.id,
      isFixed: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '영어 독해 2지문',
      description: '모르는 단어 정리하기',
      subject: 'ENGLISH',
      date: today,
      worksheetId: worksheet2.id,
      isFixed: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '미적분 문제 10개',
      description: '기본 개념 문제 풀이',
      subject: 'MATH',
      date: today,
      worksheetId: worksheet3.id,
      isFixed: true,
    },
  });

  // 멘티2에게 샘플 할 일 생성
  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '문학 작품 분석',
      description: '현대시 2편 분석하기',
      subject: 'KOREAN',
      date: today,
      isFixed: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '영문법 정리',
      description: '관계대명사 복습',
      subject: 'ENGLISH',
      date: today,
      isFixed: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '확률과 통계 복습',
      description: '순열 조합 문제 5개',
      subject: 'MATH',
      date: today,
      isFixed: true,
    },
  });
  console.log('샘플 할 일 생성 완료');

  // 샘플 피드백 생성
  await prisma.feedback.create({
    data: {
      taskId: task1.id,
      mentorId: mentor.id,
      content: '전체적으로 잘 풀었습니다. 다만 3번 지문에서 논리적 흐름 파악이 부족했어요. 접속사에 주목하면서 다시 읽어보세요.',
      summary: '논리적 흐름 파악 연습 필요',
      subject: 'KOREAN',
      feedbackDate: today,
    },
  });
  console.log('샘플 피드백 생성 완료');

  console.log('\n✅ 시드 데이터 생성 완료!');
  console.log('\n테스트 계정:');
  console.log('멘토: mentor@seolstudy.com / mentor123!');
  console.log('멘티1: mentee1@seolstudy.com / mentee123!');
  console.log('멘티2: mentee2@seolstudy.com / mentee123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
