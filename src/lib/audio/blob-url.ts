export function getAudioBlobUrl(pdsUrl: string, did: string, cid: string): string {
  const base = pdsUrl.replace(/\/$/, '')
  return `${base}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}
