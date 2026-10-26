// Runs before every request: anyone without a valid login cookie is sent to /login.
// This is only the first, quick check; server actions and the media route check the login again themselves.
import { NextResponse, type NextRequest } from 'next/server';
import { isValidToken, SESSION_COOKIE } from '@/lib/auth';

export function proxy(request: NextRequest) {
  // Signed post images for Instagram and Facebook to download; the route checks the signature itself.
  if (request.nextUrl.pathname.startsWith('/public-media/')) return NextResponse.next();

  const loggedIn = isValidToken(request.cookies.get(SESSION_COOKIE)?.value);
  const onLoginPage = request.nextUrl.pathname === '/login';

  if (!loggedIn && !onLoginPage) return NextResponse.redirect(new URL('/login', request.url));
  if (loggedIn && onLoginPage) return NextResponse.redirect(new URL('/products', request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own files (scripts, styles, fonts, optimised images) and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
