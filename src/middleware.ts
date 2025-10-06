import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('🛡️ MIDDLEWARE RUNNING:', pathname)

  // Redirect root to programs
  if (pathname === '/') {
    console.log('🔄 MIDDLEWARE: Redirecting root to /programs')
    return NextResponse.redirect(new URL('/programs', request.url))
  }

  // Public routes - no auth required
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    console.log('✅ MIDDLEWARE: Public route, allowing:', pathname)
    return NextResponse.next()
  }

  // Allow access to login page even if not in public routes
  if (pathname === '/auth/login') {
    console.log('✅ MIDDLEWARE: Login page access allowed')
    return NextResponse.next()
  }

  console.log('🔒 MIDDLEWARE: Protected route, checking auth:', pathname)

  // Create response object
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          console.log('🍪 MIDDLEWARE: Cookie', name, cookie?.value ? 'EXISTS' : 'MISSING')
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          console.log('🍪 MIDDLEWARE: Setting cookie:', name)
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          console.log('🍪 MIDDLEWARE: Removing cookie:', name)
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check session
  console.log('🔍 MIDDLEWARE: Getting session...')
  const { data: { session }, error } = await supabase.auth.getSession()
  
  console.log('📊 MIDDLEWARE: Session result:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    hasAccessToken: !!session?.access_token,
    error: error?.message
  })

  if (error) {
    console.log('❌ MIDDLEWARE: Session error:', error.message)
    console.log('🚫 MIDDLEWARE: ERROR - REDIRECTING TO LOGIN')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!session || !session.user) {
    console.log('🚫 MIDDLEWARE: NO SESSION OR USER - REDIRECTING TO LOGIN')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  console.log('✅ MIDDLEWARE: SESSION FOUND - ALLOWING ACCESS')
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}