// middleware.ts — Lightweight, Edge-safe. No getToken, no jose, no Node.js APIs.
// Place this file at: src/middleware.ts  — REPLACES your existing src/middleware.ts

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
