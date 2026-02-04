import crypto from 'crypto';

const secret = process.env.SESSION_SECRET ?? 'dev-secret';

export function signToken(value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function verifyToken(value: string, token: string) {
  const expected = signToken(value);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
