import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard-auth0/page';

// Mock de useUser
jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: jest.fn(() => ({
    user: {
      sub: 'auth0|123',
      email: 'test@example.com',
      name: 'Test User',
    },
    error: null,
    isLoading: false,
  })),
}));

// Mock de useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('DashboardPage', () => {
  it('debe renderizar la información del usuario', () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('debe mostrar el botón de cálculo', () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('Calcular CO₂e Demo')).toBeInTheDocument();
  });
});

