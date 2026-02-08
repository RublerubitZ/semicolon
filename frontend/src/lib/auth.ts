/**
 * 인증 관련 유틸리티 함수
 */

import { useRouter } from 'next/navigation';

/**
 * 사용자 타입 정의
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'MENTEE' | 'MENTOR' | 'ADMIN';
  grade?: string;
  profileImage?: string | null;
  gender?: string;
  birthDate?: string;
  goal?: string;
  phone?: string;
}

/**
 * localStorage에서 토큰을 안전하게 가져옴
 * @returns 토큰 문자열 또는 null
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * 토큰이 있는지 확인
 * @returns 토큰이 있으면 true
 */
export function hasToken(): boolean {
  return getToken() !== null;
}

/**
 * 토큰을 localStorage에 저장
 * @param token - 저장할 토큰
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

/**
 * Refresh Token을 localStorage에서 가져옴
 * @returns Refresh Token 문자열 또는 null
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Refresh Token을 localStorage에 저장
 * @param refreshToken - 저장할 Refresh Token
 */
export function setRefreshToken(refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('refreshToken', refreshToken);
}

/**
 * 토큰을 localStorage에서 제거
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

/**
 * 토큰을 체크하고 없으면 로그인 페이지로 리다이렉트
 * @param router - Next.js router 인스턴스
 * @returns 토큰 (있는 경우)
 * @throws 토큰이 없으면 로그인 페이지로 리다이렉트
 */
export function requireToken(router: ReturnType<typeof useRouter>): string {
  const token = getToken();
  if (!token) {
    router.push('/login');
    throw new Error('No token found');
  }
  return token;
}

/**
 * localStorage에서 사용자 정보를 안전하게 가져옴
 * @returns 사용자 객체 또는 null
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Failed to parse user data from localStorage:', error);
    // 손상된 데이터 제거
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * 사용자 정보를 localStorage에 저장
 * @param user - 저장할 사용자 객체
 */
export function setUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * 사용자 정보를 localStorage에서 제거
 */
export function removeUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
}

/**
 * 로그아웃 처리 (토큰과 사용자 정보 제거)
 */
export function logout(): void {
  removeToken();
  removeUser();
}

/**
 * Authorization 헤더 생성
 * @param token - 토큰 (없으면 localStorage에서 가져옴)
 * @returns Authorization 헤더 값 또는 undefined
 */
export function getAuthHeader(token?: string | null): string | undefined {
  const authToken = token ?? getToken();
  return authToken ? `Bearer ${authToken}` : undefined;
}

/**
 * 인증이 필요한 API 호출을 위한 헤더 생성
 * @param token - 토큰 (선택사항)
 * @returns fetch에 사용할 headers 객체
 */
export function getAuthHeaders(token?: string | null): HeadersInit {
  const authHeader = getAuthHeader(token);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  return headers;
}
