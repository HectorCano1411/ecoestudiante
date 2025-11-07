import { NextRequest } from 'next/server';
import { GET } from '@/app/api/proxy/calculo/route';
import { getAccessToken } from '@auth0/nextjs-auth0';

// Mock is configured in jest.setup.ts
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;

describe('Proxy Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('GET', () => {
    it('debe retornar 401 si no hay access token', async () => {
      mockGetAccessToken.mockResolvedValue({ accessToken: null });

      const request = new NextRequest('http://localhost:3000/api/proxy/calculo?path=calc/electricity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autenticado');
    });

    it('debe reenviar el request al gateway con el token', async () => {
      mockGetAccessToken.mockResolvedValue({ accessToken: 'mock-token' });

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ result: 'success' }),
      });

      const request = new NextRequest('http://localhost:3000/api/proxy/calculo?path=calc/electricity');
      const response = await GET(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/calc/electricity',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
      expect(data.result).toBe('success');
    });
  });
});

