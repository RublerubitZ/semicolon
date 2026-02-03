// API URL을 동적으로 생성하는 함수
// 개발 환경에서 모바일 접속 시에도 작동하도록 현재 hostname 사용
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 localhost 사용
    return 'http://localhost:4000';
  }

  const port = process.env.NEXT_PUBLIC_API_PORT || '4000';

  // 클라이언트 사이드에서는 현재 hostname 사용
  // localhost로 접속하면 localhost:4000
  // 192.168.x.x로 접속하면 192.168.x.x:4000
  const hostname = window.location.hostname;
  return `http://${hostname}:${port}`;
}
