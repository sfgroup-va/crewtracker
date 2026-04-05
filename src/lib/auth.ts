import crypto from 'crypto'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  const inputHash = hashPassword(password)
  return inputHash === hash
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
