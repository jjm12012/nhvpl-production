// auth.config.ts — Edge-safe config, no Node.js dependencies
// Place this file at: src/auth.config.ts

import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAdminAPIRoute = nextUrl.pathname.startsWith('/api/admin')
      const isAdminRoute =
        nextUrl.pathname.startsWith('/admin') &&
        nextUrl.pathname !== '/admin/login'

      // API routes: return 401 JSON if not logged in
      if (isAdminAPIRoute) {
        if (isLoggedIn) return true
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // UI admin routes: redirect to login if not logged in
      if (isAdminRoute) {
        return isLoggedIn
      }

      return true
    },
  },
  providers: [], // Providers are in auth.ts — not here
} satisfies NextAuthConfig
