'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error: unknown) => {
              if (
                error &&
                typeof error === 'object' &&
                'status' in error &&
                typeof (error as { status: unknown }).status === 'number'
              ) {
                const status = (error as { status: number }).status;
                if (status >= 400 && status < 500) {
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
