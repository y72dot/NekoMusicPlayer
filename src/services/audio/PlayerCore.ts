import create from 'zustand'
import type { ID } from '../../providers/types'
import { devlog } from '@/utils/devlog'

type Events = {
  time: (pos: number) => void
  duration: (dur: number) => void
  ended: () => void
  playing: () => void
  paused: () => void
  progress: () => void
  error: (e: any) => void
}

type ListenerMap = Partial<Record<keyof Events, Set<any>>>

class Emitter {
  private listeners: ListenerMap = {}
  on<K extends keyof Events>(event: K, cb: Events[K]) {
    if (!this.listeners[event]) this.listeners[event] = new Set<any>() as Set<Events[K]>
    this.listeners[event]!.add(cb)
    return () => this.listeners[event]!.delete(cb)
  }
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    this.listeners[event]?.forEach(l => (l as any)(...args))
  }
}

export const audio = new Audio()
audio.preload = 'auto'

const emitter = new Emitter()

audio.addEventListener('timeupdate', () => emitter.emit('time', audio.currentTime))
audio.addEventListener('durationchange', () => emitter.emit('duration', audio.duration))
audio.addEventListener('ended', () => emitter.emit('ended'))
audio.addEventListener('playing', () => emitter.emit('playing'))
audio.addEventListener('pause', () => emitter.emit('paused'))
audio.addEventListener('progress', () => emitter.emit('progress'))
audio.addEventListener('error', e => emitter.emit('error', e))

export const useAudioState = create<{ duration: number; position: number; playing: boolean }>(() => ({ duration: 0, position: 0, playing: false }))

emitter.on('time', pos => useAudioState.setState({ position: pos }))
emitter.on('duration', dur => useAudioState.setState({ duration: isFinite(dur) ? dur : 0 }))
emitter.on('playing', () => useAudioState.setState({ playing: true }))
emitter.on('paused', () => useAudioState.setState({ playing: false }))
emitter.on('time', pos => devlog('audio', 'time', { pos }))
emitter.on('duration', dur => devlog('audio', 'duration', { dur }))
emitter.on('playing', () => devlog('audio', 'playing'))
emitter.on('paused', () => devlog('audio', 'paused'))
emitter.on('progress', () => devlog('audio', 'progress'))

export async function setSource(src: string | Blob) {
  if (src instanceof Blob) {
    const url = URL.createObjectURL(src)
    audio.src = url
  } else {
    audio.src = src
  }
}

export function play() { return audio.play() }
export function pause() { audio.pause() }
export function toggle() { audio.paused ? audio.play() : audio.pause() }
export function seek(seconds: number) { audio.currentTime = seconds }
export function setVolume(v: number) { audio.volume = v }
export function setMuted(m: boolean) { audio.muted = m }
export function getBufferedEnd() { const r = audio.buffered; return r.length ? r.end(r.length - 1) : 0 }
