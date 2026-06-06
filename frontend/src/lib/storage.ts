const APP_STORAGE_PREFIX = 'avanceos'
const LEGACY_STORAGE_PREFIX = ['fleet', 'care'].join('')

export function appStorageKey(scope: string) {
  return `${APP_STORAGE_PREFIX}.${scope}`
}

function legacyStorageKey(scope: string) {
  return `${LEGACY_STORAGE_PREFIX}.${scope}`
}

export function readLocalPreference(scope: string) {
  const currentKey = appStorageKey(scope)
  const current = localStorage.getItem(currentKey)
  if (current !== null) return current

  const legacyKey = legacyStorageKey(scope)
  const legacy = localStorage.getItem(legacyKey)
  if (legacy !== null) {
    localStorage.setItem(currentKey, legacy)
    localStorage.removeItem(legacyKey)
  }
  return legacy
}

export function writeLocalPreference(scope: string, value: string) {
  const currentKey = appStorageKey(scope)
  localStorage.setItem(currentKey, value)
  localStorage.removeItem(legacyStorageKey(scope))
}
