const SAMPLE_COUNT = 128

export interface WaveformResult {
  samples: number[]
  durationMs: number
}

export async function computeWaveform(blob: Blob): Promise<WaveformResult> {
  const buffer = await blob.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, 44100)

  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
  } catch {
    return { samples: Array(SAMPLE_COUNT).fill(0), durationMs: 0 }
  }

  const durationMs = audioBuffer.duration * 1000

  const raw = audioBuffer.getChannelData(0)
  const bucketSize = Math.floor(raw.length / SAMPLE_COUNT)
  const waveform: number[] = []

  let peak = 0
  const averages: number[] = []

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const start = i * bucketSize
    const end = Math.min(start + bucketSize, raw.length)
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += Math.abs(raw[j])
    }
    const avg = sum / (end - start)
    averages.push(avg)
    if (avg > peak) peak = avg
  }

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    waveform.push(peak > 0 ? Math.round((averages[i] / peak) * 255) : 0)
  }

  return { samples: waveform, durationMs }
}