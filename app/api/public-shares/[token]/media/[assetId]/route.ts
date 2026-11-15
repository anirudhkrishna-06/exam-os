import { cookies } from 'next/headers'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { mediaAssets } from '@/db/schema/media'
import { getExternalSnapshot } from '@/services/sharing.service'
import { b2Storage } from '@/lib/media/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; assetId: string }> }) {
  const { token, assetId } = await params
  const snapshot = await getExternalSnapshot(token, (await cookies()).get(`paramaa_share_${token}`)?.value)
  if (!snapshot?.assetIds?.includes(assetId)) return Response.json({ error: 'Asset not available' }, { status: 404 })
  const asset = await db.query.mediaAssets.findFirst({ where: and(eq(mediaAssets.id, assetId), eq(mediaAssets.status, 'ready'), inArray(mediaAssets.id, snapshot.assetIds)) })
  if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404 })
  return Response.redirect(await b2Storage.getUrl(asset.objectKey), 302)
}
