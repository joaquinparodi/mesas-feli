import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // If no token at all, next-auth will redirect to signIn page automatically
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;

    // Dashboard routes: organizer or admin only
    if (pathname.startsWith('/dashboard')) {
      if (role !== 'organizer' && role !== 'admin') {
        return NextResponse.redirect(new URL('/login?error=Forbidden', req.url));
      }
    }

    // Promoter routes: promoter or admin only
    if (pathname.startsWith('/promoter')) {
      if (role !== 'promoter' && role !== 'admin') {
        return NextResponse.redirect(new URL('/login?error=Forbidden', req.url));
      }
    }

    // Staff routes: organizer or admin only
    if (pathname.startsWith('/staff')) {
      if (role !== 'organizer' && role !== 'admin') {
        return NextResponse.redirect(new URL('/login?error=Forbidden', req.url));
      }
    }

    // API: events mutation routes (POST, PUT, DELETE) — organizer or admin
    if (pathname.startsWith('/api/events')) {
      const method = req.method;
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (role !== 'organizer' && role !== 'admin') {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          );
        }
      }
    }

    // API: analytics — organizer or admin only
    if (pathname.startsWith('/api/analytics')) {
      if (role !== 'organizer' && role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Profile and API reservations POST: any authenticated user is fine
    // (already authenticated by withAuth)

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Return true if the user has a valid token (is authenticated)
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/promoter/:path*',
    '/profile/:path*',
    '/staff/:path*',
    '/api/events/:path*',
    '/api/reservations/:path*',
    '/api/analytics/:path*',
  ],
};
