import '@testing-library/jest-dom';

// Mock de Auth0
jest.mock('@auth0/nextjs-auth0', () => ({
  useUser: jest.fn(),
  getSession: jest.fn(),
  getAccessToken: jest.fn(),
}));

