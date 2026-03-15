import { sign, verify } from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return sign(payload, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return verify(token, secret) as JwtPayload;
};
