import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET || 'secret_key';

export function isTokenValid(token: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload && typeof payload === 'object' && payload.exp) {
      return Date.now() < payload.exp * 1000;
    }
    return true;
  } catch {
    return false;
  }
}

export function refreshToken(token: string, expiresIn: string | number = '7d'): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { iat, exp, ...rest } = payload as any;
    return jwt.sign(rest, JWT_SECRET, { expiresIn });
  } catch {
    return null;
  }
}
