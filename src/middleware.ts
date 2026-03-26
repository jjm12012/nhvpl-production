import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if route is protected (exclude login page to prevent redirect loop)
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminAPIRoute = pathname.startsWith('/api/admin');

  if (isAdminRoute || isAdminAPIRoute) {
    // Get the token from the request
    const token = await getToken({
      req: request,
      secret,
    });

    // If no token, redirect to login (for /admin routes) or return 401 (for /api/admin routes)
    if (!token) {
      if (isAdminRoute) {
        // Redirect to login page for UI routes
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      } else {
        // Return 401 for API routes
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
