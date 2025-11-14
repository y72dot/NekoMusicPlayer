import create from 'zustand'
import { persist } from 'zustand/middleware'

export interface DropboxConfig {
  appKey: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  rootPath?: string
}

export interface OSSConfig {
  region?: string
  bucket?: string
  accessKeyId?: string
  accessKeySecret?: string
  stsToken?: string
  endpoint?: string
  prefix?: string
}

export interface COSConfig {
  region?: string
  bucket?: string
  appId?: string
  tmpSecretId?: string
  tmpSecretKey?: string
  sessionToken?: string
  prefix?: string
}

export interface Preferences {
  theme?: 'dark' | 'light'
  quality?: 'auto' | 'high' | 'medium' | 'low'
  notifications?: boolean
}

type State = {
  dropbox: DropboxConfig
  oss: OSSConfig
  cos: COSConfig
  preferences: Preferences
}

type Actions = {
  updateDropbox: (p: Partial<DropboxConfig>) => void
  updateOSS: (p: Partial<OSSConfig>) => void
  updateCOS: (p: Partial<COSConfig>) => void
  updatePreferences: (p: Partial<Preferences>) => void
}

export const useSettings = create<State & Actions>()(persist((set, get) => ({
  dropbox: { appKey: '' },
  oss: {},
  cos: {},
  preferences: { theme: 'dark', quality: 'auto', notifications: false },
  updateDropbox(p) { set({ dropbox: { ...get().dropbox, ...p } }) },
  updateOSS(p) { set({ oss: { ...get().oss, ...p } }) },
  updateCOS(p) { set({ cos: { ...get().cos, ...p } }) },
  updatePreferences(p) { set({ preferences: { ...get().preferences, ...p } }) }
}), { name: 'settings' }))

