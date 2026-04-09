import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json({ data: { success: true } }, { status: 200 });

  clearSessionCookie(response);
  return response;
}
