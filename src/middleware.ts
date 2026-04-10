import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const session = await validateSession(sessionCookie.value);

  if (!session || session.role !== 'supervisor') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/review/:path*'],
};
