'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Check, Loader2, Search, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

type UserResult = { id: string; name: string | null; email: string }

export function ShareSessionDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [results, setResults] = useState<UserResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const searchSequence = useRef(0)

  useEffect(() => {
    if (!open || selectedUser?.email === email || email.trim().length < 3) {
      controllerRef.current?.abort()
      return
    }
    const timer = window.setTimeout(async () => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const sequence = ++searchSequence.current
      setSearching(true); setSearchError(null)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(email.trim())}`, { signal: controller.signal, cache: 'no-store' })
        const data = await response.json() as { results?: UserResult[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'Could not search users')
        if (sequence !== searchSequence.current) return
        setResults((data.results ?? []).filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index))
        setHasSearched(true)
        setActiveIndex(-1)
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        if (sequence === searchSequence.current) { setResults([]); setHasSearched(true); setSearchError(reason instanceof Error ? reason.message : 'Could not search users') }
      } finally {
        if (sequence === searchSequence.current) setSearching(false)
      }
    }, 300)
    return () => { window.clearTimeout(timer); controllerRef.current?.abort(); searchSequence.current += 1 }
  }, [email, open, selectedUser])

  function chooseUser(user: UserResult) {
    controllerRef.current?.abort(); setSelectedUser(user); setEmail(user.email); setResults([]); setActiveIndex(-1); setHasSearched(false); setSearching(false); setSearchError(null)
  }

  function handleInput(value: string) {
    setEmail(value); setSelectedUser(null); setResults([]); setActiveIndex(-1); setHasSearched(false); setSearching(false); setSearchError(null); setMessage(null); setError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) { if (event.key === 'Escape') setResults([]); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((current) => (current + 1) % results.length) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((current) => (current - 1 + results.length) % results.length) }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); chooseUser(results[activeIndex]) }
    else if (event.key === 'Escape') { event.preventDefault(); setResults([]) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null); setError(null)
    try {
      const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, email, recipientUserId: selectedUser?.id }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not share this session')
      setMessage(`Invitation sent to ${data.recipient?.email ?? email}`); setEmail(''); setSelectedUser(null); setResults([])
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not share this session') } finally { setBusy(false) }
  }

  function closeDialog(value: boolean) {
    setOpen(value)
    if (!value) { controllerRef.current?.abort(); setResults([]); setSelectedUser(null); setHasSearched(false); setSearching(false); setSearchError(null); setError(null); setMessage(null) }
  }

  const listVisible = open && email.trim().length >= 3 && !selectedUser && (searching || hasSearched || searchError !== null || results.length > 0)

  return <Dialog open={open} onOpenChange={closeDialog}>
    <DialogTrigger asChild><Button size="sm" variant="outline"><Share2 className="mr-1.5 h-4 w-4" />Share</Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Share session space</DialogTitle><DialogDescription>Invite a registered paramaa... padi da user to read this session&apos;s learning content. They cannot edit your workspace.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="share-email" className="text-sm font-medium">Recipient email</label>
          <div className="relative">
            <Input id="share-email" type="text" value={email} onChange={(event) => handleInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search by name or email" required autoFocus role="combobox" aria-autocomplete="list" aria-expanded={listVisible} aria-controls="share-user-results" aria-activedescendant={activeIndex >= 0 ? `share-user-${results[activeIndex].id}` : undefined} />
            {listVisible && <div id="share-user-results" role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
              {searching && <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching registered users...</div>}
              {!searching && searchError && <div className="px-3 py-2 text-sm text-destructive">{searchError}</div>}
              {!searching && !searchError && results.length === 0 && <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"><Search className="h-4 w-4" />No matching users</div>}
              {!searching && results.map((user, index) => <button id={`share-user-${user.id}`} key={user.id} type="button" role="option" aria-selected={activeIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseUser(user)} className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors ${activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.name || 'Unnamed user'}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span>{activeIndex === index && <Check className="h-4 w-4 shrink-0 text-primary" />}</button>)}
            </div>}
          </div>
          <p className="text-xs text-muted-foreground">Type at least 3 characters to search. You can also enter an exact email.</p>
        </div>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
        <DialogFooter><Button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send invitation'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
