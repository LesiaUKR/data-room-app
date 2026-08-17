import { tsr } from '@/lib/api-client';

import { SESSION_QUERY_KEY } from './use-session';

const useSignIn = () => {
  const queryClient = tsr.useQueryClient();

  return tsr.auth.signIn.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });
};

export { useSignIn };
