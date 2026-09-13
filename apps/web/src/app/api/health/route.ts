import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'ok', service: 'academy-web', timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
