const SOUNDS_ENABLED_KEY = 'avanceos_sounds_enabled'

const sounds = {
  newOs: {
    src: '/sounds/new-os.mp3',
    volume: 0.35,
  },
}

function canUseBrowserAudio() {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

function playSound(src: string, volume: number) {
  if (!canUseBrowserAudio() || !getAppSoundsEnabled()) return

  try {
    const audio = new Audio(src)
    audio.loop = false
    audio.volume = volume

    void audio.play().catch(() => undefined)
  } catch {
    // Audio feedback is optional and must never block the UI.
  }
}

function primeSound(src: string, volume: number) {
  if (!canUseBrowserAudio()) return

  try {
    const audio = new Audio(src)
    audio.loop = false
    audio.volume = volume
    audio.muted = true

    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.currentTime = 0
      })
      .catch(() => undefined)
  } catch {
    // Browsers may block audio priming; the app should keep working normally.
  }
}

export function getAppSoundsEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SOUNDS_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setAppSoundsEnabled(enabled: boolean): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SOUNDS_ENABLED_KEY, String(enabled))
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

export function enableAppSounds(): void {
  setAppSoundsEnabled(true)
  primeSound(sounds.newOs.src, sounds.newOs.volume)
}

export function playNewOsSound(): void {
  playSound(sounds.newOs.src, sounds.newOs.volume)
}
