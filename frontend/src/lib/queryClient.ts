import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api';

const FIVE_MINUTES = 5 * 60_000;

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    // Every GitHub-backed response changes the remaining quota, so refresh the header badge after each.
    queryCache: new QueryCache({
      onSettled: (_data, _error, query) => {
        if (query.queryKey[0] !== 'rate-limit') {
          void client.invalidateQueries({ queryKey: ['rate-limit'] });
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: FIVE_MINUTES,
        refetchOnWindowFocus: false,
        // Retrying only helps with transient failures. A missing user or an empty quota won't change in a second.
        retry: (failures, error) => {
          const transient =
            error instanceof ApiError && ['network', 'upstream_timeout', 'upstream_unreachable'].includes(error.code);
          return transient && failures < 1;
        },
      },
    },
  });
  return client;
}
