import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
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
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST(request?: Request) {
  return new NextResponse(
    JSON.stringify({
      error: 'Method Not Allowed',
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
        'Cache-Control': 'no-store',
      },
    }
  );
}
