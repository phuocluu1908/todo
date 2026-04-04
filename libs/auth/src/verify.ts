import jwt from 'jsonwebtoken';

export interface VerifiedToken {
  sub: number | string;
  username?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export function verifyJwt(token: string, secret?: string): VerifiedToken | null {
  try {
    const s = secret || process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, s) as VerifiedToken;
    return payload;
  } catch (e) {
    return null;
  }
}
