import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  console.log(`Middleware: ${request.nextUrl.pathname}, cookie=${!!sessionCookie?.value}`);

  if (!sessionCookie?.value) {
    console.log('Middleware: no session cookie, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const session = await validateSession(sessionCookie.value);
  console.log(`Middleware: session valid=${!!session}, role=${session?.role}`);

  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // /review requires supervisor; /admin requires pm (page-level check handles /admin auth)
  if (request.nextUrl.pathname.startsWith('/review') && session.role !== 'supervisor') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/review/:path*'],
};
