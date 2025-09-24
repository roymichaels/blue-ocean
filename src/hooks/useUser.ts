import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chain from '@/services/chain';
import { User } from '@/types';

let getUser: ((id: string) => Promise<User | null>) | undefined;
let setUser: ((user: User) => Promise<void>) | undefined;
let removeUser: ((id: string) => Promise<void>) | undefined;
if (chain === 'near') {
  ({ getUser, setUser, removeUser } = require('@/features/auth/services/nearUsers'));
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => (getUser ? getUser(id) : Promise.resolve(null)),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (user: User) => (setUser ? setUser(user) : Promise.resolve()),
    onSuccess: (_data, user) => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => (removeUser ? removeUser(id) : Promise.resolve()),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });

  return {
    setUser: upsert.mutateAsync,
    removeUser: remove.mutateAsync,
    isPending: upsert.isPending || remove.isPending,
  };
}
