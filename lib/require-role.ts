import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export type Role = 'ADMIN' | 'AGENT' | 'CLIENT'

/**
 * The real authorization boundary for this app.
 *
 * `middleware.ts` only checks for the presence of a session cookie (a coarse,
 * cheap gate to bounce anonymous requests to /login before they hit React).
 * It intentionally does NOT decode/verify the session or check role, because
 * Better Auth's `role` field lives on the `user` row, not in the signed
 * session cookie payload itself — reading it in middleware would require an
 * extra DB round-trip (or a cookie-cache lookup) on every matched request.
 * Every server action and server component that needs role-based access
 * control MUST call `requireRole(...)` itself.
 *
 * Note: `session.user.role` is typed as `string` by Better Auth (the
 * `additionalFields` config declares it as `{ type: 'string' }`, since
 * Better Auth's additionalFields system doesn't support a literal string
 * union/enum type). We validate + cast it to our real `Role` union here.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')

  const role = session.user.role as unknown as string
  if (!roles.includes(role as Role)) {
    throw new Error('Forbidden: insufficient role')
  }

  return session
}
