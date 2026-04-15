// Cache DID → PDS URL lookups for the session.
const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

interface DidDocService {
  id: string
  type: string
  serviceEndpoint: string
}

interface DidDocument {
  service?: DidDocService[]
}

async function fetchDidDocument(did: string): Promise<DidDocument | null> {
  if (did.startsWith('did:plc:')) {
    const res = await fetch(`https://plc.directory/${did}`)
    if (!res.ok) return null
    return res.json()
  }

  if (did.startsWith('did:web:')) {
    const host = did.slice('did:web:'.length).replace(/:/g, '/')
    const res = await fetch(`https://${host}/.well-known/did.json`)
    if (!res.ok) return null
    return res.json()
  }

  return null
}

export async function resolvePdsUrl(did: string): Promise<string | null> {
  if (cache.has(did)) return cache.get(did)!

  const existing = inflight.get(did)
  if (existing) return existing

  const promise = (async () => {
    const doc = await fetchDidDocument(did)
    const pds = doc?.service?.find(
      (s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer',
    )?.serviceEndpoint
    if (pds) cache.set(did, pds)
    return pds ?? null
  })()

  inflight.set(did, promise)
  try {
    return await promise
  } finally {
    inflight.delete(did)
  }
}
