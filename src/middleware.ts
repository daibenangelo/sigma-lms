import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root path to programs page
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/programs', request.url))
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Auth routes that should redirect if already logged in
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  const isAuthRoute = authRoutes.includes(pathname)

  // Check for Supabase session cookies (multiple possible names)
  const supabaseAuthToken = request.cookies.get('sb-yvmjznglkccnrnnptjhq-auth-token')
  const supabaseRefreshToken = request.cookies.get('sb-yvmjznglkccnrnnptjhq-auth-token.0')
  const supabaseAccessToken = request.cookies.get('sb-yvmjznglkccnrnnptjhq-auth-token.1')
  const supabaseSession = request.cookies.get('supabase-auth-token')
  
  const hasSession = !!(supabaseAuthToken || supabaseRefreshToken || supabaseAccessToken || supabaseSession)

  console.log('Middleware:', { 
    pathname, 
    hasSession,
    isPublicRoute,
    isAuthRoute,
    cookies: {
      authToken: !!supabaseAuthToken,
      refreshToken: !!supabaseRefreshToken,
      accessToken: !!supabaseAccessToken,
      session: !!supabaseSession
    }
  })

  // Temporarily disable protection to test login
  // if (!isPublicRoute && !hasSession) {
  //   console.log('Redirecting to login - no session')
  //   return NextResponse.redirect(new URL('/auth/login', request.url))
  // }

  // If accessing auth routes while logged in, redirect to programs
  if (isAuthRoute && hasSession) {
    console.log('Redirecting to programs - user is logged in')
    return NextResponse.redirect(new URL('/programs', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}