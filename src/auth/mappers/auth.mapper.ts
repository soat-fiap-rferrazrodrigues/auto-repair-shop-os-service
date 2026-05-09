import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  clientId: string | null;
}

export class AuthMapper {
  static toJwtPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId ?? null,
    };
  }
}
