import { View, Text } from 'react-native';

export default function LandingRedirect() {
  const { replace } = useAppRouter();

  useEffect(() => {
    replace('/');
  }, [replace]);

  return null;
}
