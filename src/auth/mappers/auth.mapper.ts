import { User } from '../entities/user.entity';

/**
 * Shared token contract (HS256). Tokens are issued either by this API
 * (email + password login) or by the serverless CPF authentication function.
 * Both sign with the same JWT_SECRET, so claims must stay compatible.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  clientId: string | null;
  /** Present when the token was issued through the CPF authentication flow. */
  cpf?: string | null;
  /** Token issuer: 'auto-repair-api' or 'auto-repair-auth-lambda'. */
  iss?: string;
}

export const API_TOKEN_ISSUER = 'auto-repair-api';
export const LAMBDA_TOKEN_ISSUER = 'auto-repair-auth-lambda';

export class AuthMapper {
  static toJwtPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId ?? null,
      iss: API_TOKEN_ISSUER,
    };
  }
}
