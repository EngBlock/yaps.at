const BASE32_SORTKEY = '234567abcdefghijklmnopqrstuvwxyz'

let clockId = Math.floor(Math.random() * 1024)
let lastTimestamp = 0

export function generateTid(): string {
  let timestamp = Date.now() * 1000

  if (timestamp <= lastTimestamp) {
    timestamp = lastTimestamp + 1
  }
  lastTimestamp = timestamp

  const id = timestamp * 1024 + (clockId % 1024)

  let encoded = ''
  let remaining = id
  for (let i = 0; i < 13; i++) {
    encoded = BASE32_SORTKEY[remaining & 31] + encoded
    remaining = Math.floor(remaining / 32)
  }

  return encoded
}
