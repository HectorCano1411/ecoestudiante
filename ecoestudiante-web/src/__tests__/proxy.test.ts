/* eslint-disable @typescript-eslint/no-require-imports */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/proxy/calculo/route';
// POST is not used in this test file

// Mock de getAccessToken
jest.mock('@auth0/nextjs-auth0', () => ({
  getAccessToken: jest.fn(),
}));

describe('Proxy Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('GET', () => {
    it('debe retornar 401 si no hay access token', async () => {
      const { getAccessToken } = require('@auth0/nextjs-auth0');
      getAccessToken.mockResolvedValue({ accessToken: null });

      const request = new NextRequest('http://localhost:3000/api/proxy/calculo?path=calc/electricity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autenticado');
    });

    it('debe reenviar el request al gateway con el token', async () => {
      const { getAccessToken } = require('@auth0/nextjs-auth0');
      getAccessToken.mockResolvedValue({ accessToken: 'mock-token' });

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ result: 'success' }),
      });

      const request = new NextRequest('http://localhost:3000/api/proxy/calculo?path=calc/electricity');
      const response = await GET(request);
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:18080/api/v1/calc/electricity',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          method: 'GET',
        })
      );
      expect(data.result).toBe('success');
    });
  });
});

