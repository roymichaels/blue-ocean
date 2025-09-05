import { useQuery } from '@tanstack/react-query';
import chain from '@/services/chain';
import { User } from '@/types';

let listUsers: (() => Promise<User[]>) | undefined;
if (chain === 'near') {
  ({ listUsers } = require('../services/nearUsers'));
}

export function useUserDirectory() {
  const { data = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['user-directory'],
    queryFn: () => (listUsers ? listUsers() : Promise.resolve([])),
  });

  return { data, isLoading, error } as const;
}
