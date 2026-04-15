# Yaps.at Design Document

## Overview

Yaps.at is an audio-first microblogging platform built on the AT Protocol. Users record short voice posts and share them on the decentralized atproto network. All content is voice — there are no text posts. Replies must also be voice recordings.

The platform uses Bluesky's identity system (DIDs, handles) and OAuth flow for authentication, but defines its own lexicon namespace for audio content that is independent of Bluesky's `app.bsky.*` lexicons.

## Domain

- **Domain**: `yaps.at`
- **NSID prefix**: `at.yaps.*`

## Core Concepts

### Voice Post
The atomic unit of content. A short audio recording (max 5 minutes) stored as a blob in the user's PDS. Posts can optionally be replies to other posts — replies are structurally identical to posts but include a reference to a parent and root post, forming threads.

There is no text body. The schema enforces audio-only by design: the record contains an audio blob, duration, and optional waveform data, with no text content field. A transcription/alt-text field is planned as a future accessibility feature.

### Like
A simple interaction record referencing a voice post via a strong reference (AT-URI + CID). Stored in the liker's repo.

## Architecture

Yaps.at follows the standard atproto application architecture:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client   │────▶│   PDS    │────▶│  Relay   │────▶│ Appview  │
│ (browser) │◀────│          │     │(firehose)│     │(indexer + │
│           │     │          │     │          │     │  queries) │
│           │◀────────────────────────────────────────          │
└──────────┘                                        └──────────┘
```

- **Client**: TanStack Start SPA. Records audio via MediaRecorder API, uploads blobs and creates records via the authenticated atproto Agent.
- **PDS**: User's Personal Data Server. Stores records and blobs. Serves blobs via `com.atproto.sync.getBlob`.
- **Relay**: Bluesky network relay (`wss://relay1.us-west.bsky.network`). Streams all repo events across the network.
- **Appview**: Subscribes to the relay firehose, filters for `at.yaps.*` collections, indexes into a database, and serves the query XRPC endpoints (`getFeed`, `getPostThread`, `getAuthorFeed`).

### Current State

The client and PDS integration are complete. The appview is not yet built — the client currently reads posts directly from the authenticated user's own repo via `com.atproto.repo.listRecords`. This means users can only see their own posts. Cross-user discovery requires the appview.

## Lexicons

All lexicons live in `lexicons/at/yaps/audio/`.

### Records

#### `at.yaps.audio.post`
The voice post record. Key type: `tid`.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `audio` | blob | yes | accept: `audio/webm`, `audio/ogg`. maxSize: 5,242,880 bytes (5MB) |
| `duration` | integer | yes | 1–300,000 ms (5 minutes) |
| `waveform` | array of integers | no | 128 values, each 0–255. Pre-computed amplitude samples for visualization |
| `reply` | ref to `#replyRef` | no | Present when this post is a reply |
| `createdAt` | string (datetime) | yes | ISO 8601 / RFC 3339 |

The `replyRef` object contains:
- `root`: strongRef to the thread's root post
- `parent`: strongRef to the immediate parent post

#### `at.yaps.audio.like`
A like on a voice post. Key type: `tid`.

| Field | Type | Required |
|-------|------|----------|
| `subject` | strongRef (uri + cid) | yes |
| `createdAt` | string (datetime) | yes |

### Shared Definitions (`at.yaps.audio.defs`)

- `postView` — Hydrated post with author info, like/reply counts, viewer state
- `actorBasic` — Minimal profile: did, handle, displayName, avatar
- `viewerState` — Whether the current user has liked the post
- `threadViewPost` — Recursive thread structure (post + parent + replies)
- `notFoundPost` — Placeholder for deleted/missing posts

### Queries

#### `at.yaps.audio.getFeed`
Paginated global feed of voice posts.
- Params: `limit` (1–100, default 50), `cursor`
- Returns: `{ posts: postView[], cursor? }`

#### `at.yaps.audio.getPostThread`
A post with its threaded voice replies.
- Params: `uri` (required, at-uri), `depth` (0–10, default 3)
- Returns: `{ thread: threadViewPost | notFoundPost }`

#### `at.yaps.audio.getAuthorFeed`
Posts by a specific user.
- Params: `actor` (required, handle or DID), `limit`, `cursor`
- Returns: `{ posts: postView[], cursor? }`

## OAuth & Permissions

### Scopes

The OAuth flow requests these scopes, declared in the loopback client ID and passed to `signInRedirect`:

```
atproto repo:at.yaps.audio.post repo:at.yaps.audio.like blob:audio/*
```

- `atproto` — Required base scope for all atproto OAuth
- `repo:at.yaps.audio.post` — Read/write access to voice post records
- `repo:at.yaps.audio.like` — Read/write access to like records
- `blob:audio/*` — Upload permission for audio blobs (all audio MIME types)

Scopes are embedded in the loopback client ID URL as query parameters. For production, they would be declared in the client metadata document served at the client ID URL.

Note: `blob:` scopes cannot be bundled into permission sets — they must be requested directly. Partial NSID wildcards (e.g., `repo:at.yaps.*`) are not supported; each collection must be listed explicitly.

## Client Implementation

### Tech Stack
- TanStack Start + React 19 + Vite 8
- TanStack Router (file-based routing)
- TanStack React Query (data fetching)
- Tailwind CSS v4 + DaisyUI v5
- `@atproto/api` + `@atproto/oauth-client-browser`
- lucide-react for icons

### Audio Recording

Uses the browser's MediaRecorder API. No server-side processing.

- **Format**: WebM container with Opus codec (`audio/webm;codecs=opus`), with fallback to plain `audio/webm` or `audio/ogg;codecs=opus` via `MediaRecorder.isTypeSupported()`
- **Duration limit**: 5 minutes (auto-stops)
- **Size limit**: ~4.8MB (auto-stops, keeps under the 5MB lexicon constraint)
- **Waveform**: Computed client-side after recording via Web Audio API's `OfflineAudioContext.decodeAudioData()`. 128 amplitude buckets normalized to 0–255.

### Posting Flow

1. User records audio → MediaRecorder produces a Blob
2. Client computes waveform from the Blob
3. Client uploads blob via `agent.com.atproto.repo.uploadBlob(data, { encoding })`
4. Client generates a TID (timestamp-based identifier)
5. Client creates record via `agent.com.atproto.repo.createRecord()` with the blob ref, duration, waveform, and createdAt
6. Feed query cache is invalidated

### Blob Serving

Audio blobs are served by the user's PDS via `com.atproto.sync.getBlob?did={did}&cid={cid}`. The PDS URL is resolved from the OAuth session's `serverMetadata.issuer` field, not hardcoded.

### Feed (Current — No Appview)

The client reads the authenticated user's own posts via:
```
agent.com.atproto.repo.listRecords({
  repo: did,
  collection: 'at.yaps.audio.post',
  limit: 50,
  reverse: true,
})
```

This will be replaced with the appview's `at.yaps.audio.getFeed` XRPC call once the appview exists.

### File Structure

```
src/
├── lib/audio/
│   ├── tid.ts              # TID generation (base32-sortkey encoded microsecond timestamp)
│   ├── types.ts            # TypeScript interfaces mirroring lexicons
│   ├── waveform.ts         # Web Audio API waveform computation
│   ├── format.ts           # Duration formatting (ms → m:ss)
│   ├── blob-url.ts         # PDS blob URL construction
│   ├── useRecorder.ts      # MediaRecorder hook
│   ├── useCreatePost.ts    # React Query mutation (upload + create record)
│   ├── useFeed.ts          # React Query hook for feed data
│   └── useLike.ts          # Like/unlike mutations
├── components/audio/
│   ├── Composer.tsx         # Record → preview → post orchestrator
│   ├── RecordButton.tsx     # Mic button with idle/recording/requesting states
│   ├── RecordingPreview.tsx # Post-recording playback and submit UI
│   ├── WaveformDisplay.tsx  # 128-bar waveform visualization
│   ├── AudioPlayer.tsx      # Playback with waveform progress
│   └── PostCard.tsx         # Feed post card
├── lib/auth/
│   ├── context.tsx          # AuthProvider with useAuth() hook
│   └── client.ts           # OAuth client setup with scopes
└── routes/
    └── index.tsx            # Feed page (authenticated) / welcome (unauthenticated)
```

## Appview Design (To Be Built)

Separate service, not part of the client app.

### Firehose Consumer

Uses `@atproto/sync`'s `Firehose` class:

```typescript
const firehose = new Firehose({
  service: 'wss://relay1.us-west.bsky.network',
  filterCollections: [
    'at.yaps.audio.post',
    'at.yaps.audio.like',
  ],
  handleEvent,
})
```

Handles three event types per collection:
- **create** — Insert record + resolve author DID to profile info
- **update** — Update existing record
- **delete** — Remove record and cascade (e.g., deleting a post removes its likes)

### Storage

Database with tables for:
- `posts` — uri, cid, author_did, audio_blob_cid, duration, waveform, reply_root, reply_parent, created_at, indexed_at
- `likes` — uri, cid, author_did, subject_uri, subject_cid, created_at
- `authors` — did, handle, display_name, avatar_url (cached, refreshed periodically)

### Query Endpoints

XRPC HTTP endpoints implementing the query lexicons:
- `GET /xrpc/at.yaps.audio.getFeed` — Paginated reverse-chronological feed
- `GET /xrpc/at.yaps.audio.getPostThread` — Thread with nested replies
- `GET /xrpc/at.yaps.audio.getAuthorFeed` — User's posts

### Client Integration

When the appview is running, the client switches from `listRecords` to the appview's XRPC endpoints. The `useFeed` hook is structured so this is a one-line change.

## Future Considerations

- **Transcription / alt-text**: Optional text field on `at.yaps.audio.post` for accessibility. Could be user-provided or generated via a transcription service. Not yet in the lexicon — will be added as an optional field (non-breaking change).
- **Safari compatibility**: MediaRecorder with WebM/Opus is supported in Safari 14.1+. Older Safari may need `audio/mp4` with AAC as a fallback format added to the lexicon's blob `accept` list.
- **Thread view route**: A dedicated route (`/post/:uri`) for viewing a single post and its reply thread.
- **User profiles**: A route for viewing another user's voice posts.
- **Notifications**: A subscription lexicon for real-time events (new replies, likes).
