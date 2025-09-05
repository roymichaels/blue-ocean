import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { User } from '@/types';

let listUsers: (() => Promise<User[]>) | undefined;
if (chain === 'near') {
  ({ listUsers } = require('@/features/auth/services/nearUsers'));
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => (listUsers ? listUsers() : Promise.resolve([])),
    select: (data) => data ?? [],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
