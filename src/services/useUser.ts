import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { User } from '@/types';

let getUser: ((id: string) => Promise<User | null>) | undefined;
if (chain === 'near') {
  ({ getUser } = require('@/features/auth/services/nearUsers'));
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => (getUser ? getUser(id) : Promise.resolve(null)),
  });
}
