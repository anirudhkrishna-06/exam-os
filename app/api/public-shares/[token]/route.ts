import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { getExternalSnapshot, verifyExternalShare } from '@/services/sharing.service'

const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
function clientKey(request: Request, token: string) { return `${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'}:${token.slice(0, 12)}` }
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const content = await getExternalSnapshot(token, (await cookies()).get(`paramaa_share_${token}`)?.value)
  return content ? Response.json({ content }, { headers }) : Response.json({ verified: false }, { status: 401, headers })
}
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const limit = checkRateLimit(clientKey(request, token), 8, 15 * 60 * 1000)
  if (!limit.allowed) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { ...headers, 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } })
  const body = await request.json().catch(() => ({})); const result = await verifyExternalShare(token, String(body.passcode ?? ''))
  if (!result) return Response.json({ error: 'The passcode is incorrect or this link is no longer available.' }, { status: 401, headers })
  const response = Response.json({ verified: true }, { headers })
  response.headers.append('Set-Cookie', `paramaa_share_${token}=${result.sessionToken}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/s/${token}; Max-Age=28800`)
  return response
}
