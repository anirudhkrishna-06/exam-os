'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ShareSessionDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null); setError(null)
    try {
      const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not share this session')
      setMessage(`Invitation sent to ${data.recipient?.email ?? email}`); setEmail('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not share this session') } finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setError(null); setMessage(null) } }}>
    <DialogTrigger asChild><Button size="sm" variant="outline"><Share2 className="mr-1.5 h-4 w-4" />Share</Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Share session space</DialogTitle><DialogDescription>Invite a registered ExamOS user to read this session’s learning content. They cannot edit your workspace.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><label htmlFor="share-email" className="text-sm font-medium">Recipient email</label><Input id="share-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required autoFocus /></div>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}<DialogFooter><Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</Button></DialogFooter></form>
    </DialogContent>
  </Dialog>
}
