import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error.message !== 'offline') {
          toast.error('데이터를 불러오는데 실패했습니다.');
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: () => {
        toast.error('요청 처리 중 오류가 발생했습니다.');
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let queryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // SSR: 항상 새 클라이언트 생성
    return createQueryClient();
  }
  // 브라우저: 싱글톤
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}
