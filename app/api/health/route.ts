import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request?: Request) {
  return new NextResponse(
    JSON.stringify({
      ok: true,
      service: 'getwink',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function POST(_request?: Request) {
  return new NextResponse(
    JSON.stringify({
      error: 'Method Not Allowed',
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
