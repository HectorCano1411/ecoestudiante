import { getServerSession, isAuthenticated } from '@/lib/auth';
import { getSession } from '@auth0/nextjs-auth0';

jest.mock('@auth0/nextjs-auth0', () => ({
  getSession: jest.fn(),
}));

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServerSession', () => {
    it('debe retornar null si no hay sesión', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('debe retornar el usuario si hay sesión', async () => {
      const mockUser = { sub: 'auth0|123', email: 'test@example.com' };
      (getSession as jest.Mock).mockResolvedValue({ user: mockUser });

      const session = await getServerSession();
      expect(session).toEqual(mockUser);
    });
  });

  describe('isAuthenticated', () => {
    it('debe retornar false si no hay sesión', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const authenticated = await isAuthenticated();
      expect(authenticated).toBe(false);
    });

    it('debe retornar true si hay sesión', async () => {
      (getSession as jest.Mock).mockResolvedValue({ user: { sub: 'auth0|123' } });

      const authenticated = await isAuthenticated();
      expect(authenticated).toBe(true);
    });
  });
});

