/**
 * Consumer Contract Test para /api/proxy/calculo
 * 
 * Este test define el "contrato" entre el frontend (consumer) y el gateway (provider).
 * El frontend espera que cuando llame a /api/proxy/calculo, el gateway responda
 * con un formato específico.
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import path from 'path';

const { like, eachLike } = Matchers;

// Configurar Pact
const provider = new Pact({
  consumer: 'ecoestudiante-web',
  provider: 'ecoestudiante-gateway',
  port: 9000, // Puerto local para el mock server
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'info',
});

describe('Proxy Calculo Pact', () => {
  // Antes de todos los tests: iniciar el mock server
  beforeAll(() => provider.setup());

  // Después de cada test: verificar que las interacciones esperadas ocurrieron
  afterEach(() => provider.verify());

  // Después de todos los tests: finalizar y escribir el pact file
  afterAll(() => provider.finalize());

  describe('GET /api/v1/calc/electricity', () => {
    it('debe devolver un cálculo de electricidad válido', async () => {
      // 1. Definir la interacción esperada (el "contrato")
      await provider.addInteraction({
        state: 'usuario autenticado con scope read:carbon',
        uponReceiving: 'una petición para calcular electricidad',
        withRequest: {
          method: 'GET',
          path: '/api/v1/calc/electricity',
          headers: {
            Authorization: like('Bearer eyJhbGciOiJSUzI1NiIs...'),
          },
          query: {
            kwh: '100',
            country: 'CL',
            period: '2025-01',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            calcId: like('calc-123'),
            co2e: like(45.5),
            unit: 'kgCO2e',
            category: 'electricity',
            createdAt: like('2025-11-06T20:00:00Z'),
            input: {
              kwh: like(100),
              country: like('CL'),
              period: like('2025-01'),
            },
          },
        },
      });

      // 2. Hacer la petición al mock server (simula el gateway)
      const response = await fetch(
        `http://localhost:9000/api/v1/calc/electricity?kwh=100&country=CL&period=2025-01`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        }
      );

      // 3. Verificar la respuesta
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('calcId');
      expect(data).toHaveProperty('co2e');
      expect(data).toHaveProperty('unit', 'kgCO2e');
      expect(data).toHaveProperty('category', 'electricity');
      expect(data).toHaveProperty('createdAt');
      expect(data.input).toHaveProperty('kwh');
      expect(data.input).toHaveProperty('country');
      expect(data.input).toHaveProperty('period');
    });
  });

  describe('POST /api/v1/calc/electricity', () => {
    it('debe crear un nuevo cálculo de electricidad', async () => {
      await provider.addInteraction({
        state: 'usuario autenticado con scope write:carbon',
        uponReceiving: 'una petición para crear cálculo de electricidad',
        withRequest: {
          method: 'POST',
          path: '/api/v1/calc/electricity',
          headers: {
            Authorization: like('Bearer eyJhbGciOiJSUzI1NiIs...'),
            'Content-Type': 'application/json',
          },
          body: {
            kwh: 150,
            country: 'CL',
            period: '2025-01',
          },
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            calcId: like('calc-456'),
            co2e: like(68.25),
            unit: 'kgCO2e',
            category: 'electricity',
            createdAt: like('2025-11-06T20:00:00Z'),
            input: {
              kwh: like(150),
              country: like('CL'),
              period: like('2025-01'),
            },
          },
        },
      });

      const response = await fetch(`http://localhost:9000/api/v1/calc/electricity`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kwh: 150,
          country: 'CL',
          period: '2025-01',
        }),
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('calcId');
      expect(data).toHaveProperty('co2e');
      expect(data.co2e).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/calc/history', () => {
    it('debe devolver el historial de cálculos', async () => {
      await provider.addInteraction({
        state: 'usuario autenticado con historial de cálculos',
        uponReceiving: 'una petición para obtener historial',
        withRequest: {
          method: 'GET',
          path: '/api/v1/calc/history',
          headers: {
            Authorization: like('Bearer eyJhbGciOiJSUzI1NiIs...'),
          },
          query: {
            page: '0',
            pageSize: '20',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            items: eachLike({
              calcId: like('calc-789'),
              category: like('electricity'),
              co2e: like(45.5),
              createdAt: like('2025-11-06T20:00:00Z'),
            }),
            totalItems: like(5),
            page: like(0),
            pageSize: like(20),
            totalPages: like(1),
          },
        },
      });

      const response = await fetch(
        `http://localhost:9000/api/v1/calc/history?page=0&pageSize=20`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('totalItems');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
      expect(Array.isArray(data.items)).toBe(true);
    });
  });
});

