import { NextResponse } from 'next/server';
import { getRuntimeMode } from '../../../lib/llm.ts';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'Gatherly',
    mode: getRuntimeMode(),
    externalBookingsEnabled: false,
  });
}
