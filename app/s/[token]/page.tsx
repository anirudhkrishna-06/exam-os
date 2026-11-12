import type { Metadata } from 'next'
import { ExternalShareClient } from '@/components/sharing/external-share-client'
export const metadata: Metadata = { title: 'Shared note | Paramaa', robots: { index: false, follow: false } }
export const instant = false
export default async function ExternalSharePage({ params }: { params: Promise<{ token: string }> }) { return <ExternalShareClient token={(await params).token} /> }
