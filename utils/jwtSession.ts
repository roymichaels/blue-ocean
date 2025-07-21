import JWT from 'expo-jwt';

const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET || 'secret_key';

export function isTokenValid(token: string): boolean {
  try {
    JWT.decode(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function refreshToken(token: string, expiresIn: string | number = '7d'): string | null {
  try {
    const payload = JWT.decode(token, JWT_SECRET) as any;
    const { iat, exp, ...rest } = payload as any;
    const seconds = typeof expiresIn === 'number' ? expiresIn : parseExpires(expiresIn);
    const newExp = Math.floor(Date.now() / 1000) + seconds;
    return JWT.encode({ ...rest, exp: newExp }, JWT_SECRET);
  } catch {
    return null;
  }
}

function parseExpires(input: string): number {
  const match = /^\s*(\d+)\s*([smhd])?\s*$/.exec(input);
  if (!match) return parseInt(input, 10) || 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'd':
      return value * 86400;
    case 'h':
      return value * 3600;
    case 'm':
      return value * 60;
    case 's':
    default:
      return value;
  }
}
