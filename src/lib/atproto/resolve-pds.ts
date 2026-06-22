// Cache DID → PDS URL lookups for the session.
const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

interface DidDocService {
  id: string
  type: string
  serviceEndpoint: string
}

interface DidDocument {
  service?: DidDocService[]
}

async function fetchDidDocument(did: string): Promise<DidDocument> {
  if (did.startsWith('did:plc:')) {
    const res = await fetch(`https://plc.directory/${did}`)
    if (!res.ok) throw new Error(`DID directory returned ${res.status}`)
    return res.json()
  }

  if (did.startsWith('did:web:')) {
    const host = did.slice('did:web:'.length).replace(/:/g, '/')
    const res = await fetch(`https://${host}/.well-known/did.json`)
    if (!res.ok) throw new Error(`did:web host returned ${res.status}`)
    return res.json()
  }

  throw new Error(`Unsupported DID method: ${did}`)
}

export async function resolvePdsUrl(did: string): Promise<string> {
  const cached = cache.get(did)
  if (cached) return cached

  const existing = inflight.get(did)
  if (existing) return existing

  const promise = (async () => {
    const doc = await fetchDidDocument(did)
    const pds = doc.service?.find(
      (s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer',
    )?.serviceEndpoint
    if (!pds) throw new Error('No PDS endpoint in DID document')
    cache.set(did, pds)
    return pds
  })()

  inflight.set(did, promise)
  try {
    return await promise
  } finally {
    inflight.delete(did)
  }
}
