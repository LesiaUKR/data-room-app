import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, type ReactElement } from 'react';

import { tsr } from '@/libs/modules/api';

const queryClient = new QueryClient();

const AppProviders = ({ children }: PropsWithChildren): ReactElement => (
  <QueryClientProvider client={queryClient}>
    <tsr.ReactQueryProvider>{children}</tsr.ReactQueryProvider>
  </QueryClientProvider>
);

export { AppProviders };
