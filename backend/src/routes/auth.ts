import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  throw new Error('JWT_SECRET environment variable is required and must not be empty');
}

// JWT_SECRET 타입 가드 - 런타임에 안전하게 사용
const getJwtSecret = (): string => {
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    throw new Error('JWT_SECRET not configured');
  }
  return JWT_SECRET;
};

// 로그인
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        
        role: true,
        grade: true,
        profileImage: true,
        gender: true,
        birthDate: true,
        goal: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // Access Token (30분)
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '30m' }
    );

    // Refresh Token (7일)
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        
        role: user.role,
        grade: user.grade,
        profileImage: user.profileImage,
        gender: user.gender,
        birthDate: user.birthDate,
        goal: user.goal,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        
        role: true,
        grade: true,
        profileImage: true,
        gender: true,
        birthDate: true,
        goal: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
});

// 프로필 조회 (기본정보 + 멘토이름 + 과목 목록)
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        
        role: true,
        grade: true,
        profileImage: true,
        gender: true,
        birthDate: true,
        goal: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 멘토 이름 조회 (멘티인 경우)
    let mentorName: string | null = null;
    if (user.role === 'MENTEE') {
      const relation = await prisma.mentorMentee.findFirst({
        where: { menteeId: userId },
        include: { mentor: { select: { name: true } } },
      });
      if (relation) {
        mentorName = relation.mentor.name;
      }
    }

    // 과목 목록 조회 (멘티의 과제에서 고유 subject 추출)
    const tasks = await prisma.task.findMany({
      where: { menteeId: userId },
      select: { subject: true },
      distinct: ['subject'],
    });
    const subjects = tasks.map((t) => t.subject);

    res.json({
      user: {
        ...user,
        mentorName,
        subjects,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '프로필 조회에 실패했습니다.' });
  }
});

// 프로필 업데이트
router.patch('/update-profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {  profileImage, grade, gender, birthDate, goal, phone } = req.body;

    type UpdateProfileData = Partial<{
      profileImage: string | null;
      grade: string;
      gender: string;
      birthDate: string;
      goal: string;
      phone: string;
    }>;

    const updateData: UpdateProfileData = {};

    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (grade !== undefined) updateData.grade = grade;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (goal !== undefined) updateData.goal = goal;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        
        role: true,
        grade: true,
        profileImage: true,
        gender: true,
        birthDate: true,
        goal: true,
        phone: true,
      },
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '프로필 업데이트에 실패했습니다.' });
  }
});

// 비밀번호 변경
router.patch('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' });
  }
});

// 토큰 갱신
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token이 필요합니다.' });
    }

    // Refresh Token 검증
    const decoded = jwt.verify(refreshToken, getJwtSecret()) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: '유효하지 않은 refresh token입니다.' });
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 새로운 Access Token 발급
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '30m' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: '토큰 갱신에 실패했습니다.' });
  }
});

export default router;
