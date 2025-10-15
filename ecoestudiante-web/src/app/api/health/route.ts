import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';

export async function GET() {
  const json = await backendFetch('/actuator/health');
  return NextResponse.json(json);
}
// src/app/api/health/route.ts