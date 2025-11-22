/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession, getAccessToken, UserProfile } from '@auth0/nextjs-auth0';

/**
 * Obtiene la sesión del usuario actual
 */
export async function getServerSession(): Promise<UserProfile | null> {
  try {
    const session = await getSession();
    return session?.user || null;
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return null;
  }
}

/**
 * Obtiene el access token para llamadas al API
 */
export async function getServerAccessToken(): Promise<string | null> {
  try {
    const { accessToken } = await getAccessToken();
    return accessToken || null;
  } catch (error) {
    console.error('Error obteniendo access token:', error);
    return null;
  }
}

/**
 * Verifica si el usuario está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return session !== null;
}

/**
 * Obtiene los claims del usuario (sub, email, etc.)
 */
export async function getUserClaims(): Promise<{
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
} | null> {
  const session = await getServerSession();
  return session || null;
}
