import { AuthMapper } from './auth.mapper';
import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';

describe('AuthMapper', () => {
  describe('toJwtPayload', () => {
    it('should map a user with clientId to a JWT payload', () => {
      const user = {
        id: 'user-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
        clientId: 'client-1',
      } as User;
      const result = AuthMapper.toJwtPayload(user);
      expect(result).toEqual({
        sub: 'user-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
        clientId: 'client-1',
      });
    });

    it('should map clientId as null when user has no clientId', () => {
      const user = {
        id: 'user-2',
        email: 'staff@test.com',
        role: Role.ADMIN,
        clientId: undefined,
      } as unknown as User;
      const result = AuthMapper.toJwtPayload(user);
      expect(result.clientId).toBeNull();
    });
  });
});
