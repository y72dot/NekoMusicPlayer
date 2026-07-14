// Generates a minimal valid MP3 file (one silent frame)
// MPEG 1 Layer 3, 128kbps, 44100 Hz, stereo
import { writeFileSync } from 'fs'

// MP3 frame header bits: sync word(11) + version(2) + layer(2) + protection(1) +
// bitrate(4) + sampleRate(2) + padding(1) + private(1) + channel(2) +
// modeExt(2) + copyright(1) + original(1) + emphasis(2)
// 0xFFE0 = sync + MPEG1 + Layer3; | 0x10 = CRC16 protection off
// bitrate index 1 = 128kbps -> 0b1001 << (ignore)
// Actually: 0xFF = sync(8), 0xFB = 1111_1011 = sync+ver+layer+prot
// 0x90 = 1001_0000 = bitrate(128k: 1001) + samplerate(44100: 00)
// 0x00 = padding(0) + private(0) + stereo(00) + modeExt(00) + copy(0) + orig(0) + emph(00)

const sampleRate = 44100
const bitrate = 128000
const frameSize = Math.floor(144 * bitrate / sampleRate) // 417

const frame = Buffer.alloc(frameSize)
// MPEG1, Layer 3, 128kbps, 44100Hz, stereo, no CRC
frame[0] = 0xFF
frame[1] = 0xFB
frame[2] = 0x90 // bitrate=128kbps(1001) + samplerate=44100(0000)
frame[3] = 0x00 // padding=0, private=0, mode=stereo(00), etc.
// Remaining bytes are zero (silent audio)

writeFileSync(new URL('silence.mp3', import.meta.url), frame)
console.log(`Generated silence.mp3 (${frameSize} bytes)`)
