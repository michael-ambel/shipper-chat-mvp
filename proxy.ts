import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const publicPaths = ['/login', '/signup']
const authPaths = ['/login', '/signup']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path))

  if (!token && !isPublicPath && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token) {
    const payload = verifyToken(token)

    if (!payload && !isPublicPath) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    if (payload && isAuthPath) {
      return NextResponse.redirect(new URL('/chat', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

