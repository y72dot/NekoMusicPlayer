export type PlaybackErrorCode =
  | 'LOAD_SUPERSEDED'
  | 'SOURCE_MISSING'
  | 'SOURCE_UNAVAILABLE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTH_REQUIRED'
  | 'ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'FORMAT_UNSUPPORTED'
  | 'AUTOPLAY_BLOCKED'
  | 'MEDIA_ERROR'
  | 'UNKNOWN'

export type PlaybackErrorStage = 'resolve' | 'load' | 'play'

export class PlaybackError extends Error {
  cause?: unknown

  constructor(
    public readonly code: PlaybackErrorCode,
    public readonly stage: PlaybackErrorStage,
    message: string,
    public readonly retryable = false,
    options?: { cause?: unknown },
  ) {
    super(message)
    this.name = 'PlaybackError'
    if (options && 'cause' in options) this.cause = options.cause
  }
}

export function normalizePlaybackError(error: unknown, stage: PlaybackErrorStage): PlaybackError {
  if (error instanceof PlaybackError) return error
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return new PlaybackError('AUTOPLAY_BLOCKED', stage, '浏览器阻止了自动播放，请手动点击播放。', false, { cause: error })
  }
  if ((error instanceof DOMException && error.name === 'AbortError') || lower.includes('timed out') || lower.includes('timeout')) {
    return new PlaybackError('TIMEOUT', stage, '音频请求超时，请检查网络后重试。', true, { cause: error })
  }
  if (lower.includes('cookie') || lower.includes('auth')) {
    return new PlaybackError('AUTH_REQUIRED', stage, '数据源认证已失效，请更新 Cookie。', false, { cause: error })
  }
  if (lower.includes('rate') || lower.includes('限流')) {
    return new PlaybackError('RATE_LIMITED', stage, '数据源请求过于频繁，请稍后重试。', true, { cause: error })
  }
  if (lower.includes('copyright') || lower.includes('access denied') || lower.includes('forbidden')) {
    return new PlaybackError('ACCESS_DENIED', stage, '当前资源因权限或版权限制不可播放。', false, { cause: error })
  }
  if (lower.includes('not found') || lower.includes('missing') || lower.includes('no playable')) {
    return new PlaybackError('SOURCE_UNAVAILABLE', stage, '没有找到可播放的音频资源。', false, { cause: error })
  }
  if (error instanceof TypeError || lower.includes('network') || lower.includes('fetch')) {
    return new PlaybackError('NETWORK', stage, '网络连接失败，请检查网络后重试。', true, { cause: error })
  }
  return new PlaybackError('UNKNOWN', stage, '音频处理失败，请重试或选择其他曲目。', false, { cause: error })
}

export function mediaElementError(mediaError: MediaError | null): PlaybackError {
  if (mediaError?.code === 4) {
    return new PlaybackError('FORMAT_UNSUPPORTED', 'load', '浏览器不支持此音频格式或资源地址。')
  }
  if (mediaError?.code === 2) {
    return new PlaybackError('NETWORK', 'load', '播放时网络连接中断。', true)
  }
  return new PlaybackError('MEDIA_ERROR', 'load', '浏览器无法播放此音频资源。')
}
