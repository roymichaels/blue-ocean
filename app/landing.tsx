import { useEffect } from 'react';
import { useAppRouter } from '@/services';

export default function LandingRedirect() {
  const { replace } = useAppRouter();

  useEffect(() => {
    replace('/');
  }, [replace]);

  return null;
}
