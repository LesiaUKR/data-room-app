import { tsr } from '@/lib/api-client';

const useSignOut = () => {
  const queryClient = tsr.useQueryClient();

  return tsr.auth.signOut.useMutation({
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export { useSignOut };
