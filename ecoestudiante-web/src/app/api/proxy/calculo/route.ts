import { getAccessToken, getSession } from '@auth0/nextjs-auth0';
import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:18080';

/**
 * Proxy route para reenviar requests al gateway con el token de Auth0
 * 
 * En Next.js 15, getAccessToken() debería manejar las cookies internamente.
 * Si hay errores, puede ser necesario actualizar @auth0/nextjs-auth0.
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el access token de Auth0
    // En versiones recientes de @auth0/nextjs-auth0 (3.8+), esto debería funcionar
    // sin necesidad de manejar cookies manualmente
    let accessToken: string | undefined;
    try {
      const tokenResult = await getAccessToken();
      accessToken = tokenResult?.accessToken;
    } catch (tokenError: any) {
      // Si falla, intentar obtener la sesión primero
      const session = await getSession();
      if (session) {
        // Si hay sesión pero no token, puede ser un problema de configuración
        console.error('Error obteniendo access token:', tokenError);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || 'calculo';
    
    const gatewayResponse = await fetch(`${GATEWAY_URL}/api/v1/${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (gatewayResponse.status === 401 || gatewayResponse.status === 403) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: gatewayResponse.status }
      );
    }

    const data = await gatewayResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en proxy:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener el access token de Auth0
    let accessToken: string | undefined;
    try {
      const tokenResult = await getAccessToken();
      accessToken = tokenResult?.accessToken;
    } catch (tokenError: any) {
      // Si falla, intentar obtener la sesión primero
      const session = await getSession();
      if (session) {
        console.error('Error obteniendo access token:', tokenError);
      }
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || 'calculo';
    
    const gatewayResponse = await fetch(`${GATEWAY_URL}/api/v1/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (gatewayResponse.status === 401 || gatewayResponse.status === 403) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: gatewayResponse.status }
      );
    }

    const data = await gatewayResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en proxy:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

