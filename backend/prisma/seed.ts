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

  // 날짜 설정
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // === 멘티1 할 일 생성 ===

  // 오늘 할 일 (미완료)
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
      isCompleted: false,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '영어 독해 2지문',
      description: '모르는 단어 정리하기',
      subject: 'ENGLISH',
      date: today,
      worksheetId: worksheet2.id,
      isFixed: true,
      isCompleted: false,
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
      isCompleted: false,
    },
  });

  // 어제 할 일 (완료됨)
  const task4 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '국어 문법 정리',
      description: '품사 복습',
      subject: 'KOREAN',
      date: yesterday,
      isFixed: true,
      isCompleted: true,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '영어 듣기 연습',
      description: '모의고사 20문제',
      subject: 'ENGLISH',
      date: yesterday,
      worksheetId: worksheet2.id,
      isFixed: true,
      isCompleted: true,
    },
  });

  const task6 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '수학 기출문제',
      description: '확률과 통계 15문제',
      subject: 'MATH',
      date: yesterday,
      isFixed: true,
      isCompleted: true,
    },
  });

  // 이틀 전 할 일 (완료됨)
  const task7 = await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '문학 작품 감상',
      description: '현대소설 읽기',
      subject: 'KOREAN',
      date: twoDaysAgo,
      worksheetId: worksheet1.id,
      isFixed: true,
      isCompleted: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee1.id,
      mentorId: mentor.id,
      title: '영어 작문 연습',
      description: '에세이 1편 작성',
      subject: 'ENGLISH',
      date: twoDaysAgo,
      isFixed: true,
      isCompleted: true,
    },
  });

  // === 멘티2 할 일 생성 ===

  // 오늘 할 일
  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '문학 작품 분석',
      description: '현대시 2편 분석하기',
      subject: 'KOREAN',
      date: today,
      isFixed: true,
      isCompleted: false,
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
      isCompleted: false,
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
      worksheetId: worksheet3.id,
      isFixed: true,
      isCompleted: false,
    },
  });

  // 어제 할 일 (일부 완료)
  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '독해 연습',
      description: '비문학 지문 풀이',
      subject: 'KOREAN',
      date: yesterday,
      isFixed: true,
      isCompleted: true,
    },
  });

  await prisma.task.create({
    data: {
      menteeId: mentee2.id,
      mentorId: mentor.id,
      title: '수학 복습',
      description: '미분 문제',
      subject: 'MATH',
      date: yesterday,
      isFixed: true,
      isCompleted: false,
    },
  });

  console.log('샘플 할 일 생성 완료');

  // === 공부 시간 기록 ===
  await prisma.studyTimeLog.create({
    data: {
      menteeId: mentee1.id,
      taskId: task4.id,
      subject: 'KOREAN',
      date: yesterday,
      duration: 45,
    },
  });

  await prisma.studyTimeLog.create({
    data: {
      menteeId: mentee1.id,
      taskId: task5.id,
      subject: 'ENGLISH',
      date: yesterday,
      duration: 60,
    },
  });

  await prisma.studyTimeLog.create({
    data: {
      menteeId: mentee1.id,
      taskId: task6.id,
      subject: 'MATH',
      date: yesterday,
      duration: 90,
    },
  });

  await prisma.studyTimeLog.create({
    data: {
      menteeId: mentee1.id,
      taskId: task7.id,
      subject: 'KOREAN',
      date: twoDaysAgo,
      duration: 30,
    },
  });

  console.log('공부 시간 기록 생성 완료');

  // === 과제 제출 내역 ===
  await prisma.taskSubmission.create({
    data: {
      taskId: task5.id,
      menteeId: mentee1.id,
      imageUrls: [
        'https://via.placeholder.com/600x800?text=Submission+1',
        'https://via.placeholder.com/600x800?text=Submission+2',
      ],
      comment: '듣기 문제 풀이 완료했습니다. 20번 문제가 어려웠어요.',
    },
  });

  await prisma.taskSubmission.create({
    data: {
      taskId: task7.id,
      menteeId: mentee1.id,
      imageUrls: [
        'https://via.placeholder.com/600x800?text=Essay+Page+1',
      ],
      comment: '소설 감상문 제출합니다.',
    },
  });

  console.log('과제 제출 내역 생성 완료');

  // === 피드백 ===
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

  await prisma.feedback.create({
    data: {
      taskId: task5.id,
      mentorId: mentor.id,
      content: '듣기 실력이 많이 늘었어요! 특히 주제 파악 문제를 잘 풀었습니다. 다음에는 세부 정보 듣기를 집중적으로 연습해보세요.',
      summary: '세부 정보 듣기 집중 연습',
      subject: 'ENGLISH',
      feedbackDate: yesterday,
    },
  });

  await prisma.feedback.create({
    data: {
      taskId: task6.id,
      mentorId: mentor.id,
      content: '확률과 통계 문제 풀이가 정확합니다. 공식을 잘 이해하고 있네요. 다음 주부터는 심화 문제로 넘어가겠습니다.',
      summary: '기본 개념 완성, 심화 단계로',
      subject: 'MATH',
      feedbackDate: yesterday,
    },
  });

  console.log('샘플 피드백 생성 완료');

  // === 플래너 코멘트 ===
  await prisma.plannerComment.create({
    data: {
      menteeId: mentee1.id,
      date: yesterday,
      content: '오늘은 집중이 잘 됐어요! 내일도 열심히 하겠습니다.',
    },
  });

  await prisma.plannerComment.create({
    data: {
      menteeId: mentee1.id,
      date: today,
      content: '수학이 조금 어렵지만 천천히 풀어보고 있어요.',
    },
  });

  console.log('플래너 코멘트 생성 완료');

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
