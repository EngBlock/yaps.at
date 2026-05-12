const HIGH_PASS_FREQ = 80

const COMPRESSOR_CONFIG: Readonly<DynamicsCompressorOptions> = {
  threshold: -24,
  knee: 30,
  ratio: 3,
  attack: 0.003,
  release: 0.25,
}

export function createAudioPipeline(inputStream: MediaStream): {
  outputStream: MediaStream
  cleanup: () => void
} {
  const audioContext = new AudioContext({ sampleRate: 48000 })

  const source = audioContext.createMediaStreamSource(inputStream)

  const highpass = audioContext.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = HIGH_PASS_FREQ

  const compressor = audioContext.createDynamicsCompressor()
  Object.assign(compressor, COMPRESSOR_CONFIG)

  const destination = audioContext.createMediaStreamDestination()

  source.connect(highpass)
  highpass.connect(compressor)
  compressor.connect(destination)

  return {
    outputStream: destination.stream,
    cleanup: () => {
      source.disconnect()
      highpass.disconnect()
      compressor.disconnect()
      audioContext.close().catch(() => {})
    },
  }
}
