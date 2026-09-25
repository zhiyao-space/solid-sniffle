import { useSyncExternalStore } from 'react'

const KEY = 'kongshiji-v1'

export const DEFAULT_STATE = {
  settings: {
    phoneName: '空蚀纪',
    signature: '',
    fontScale: 1,
    chatAPI: null,
  },
  characters: [],
  chats: {},
  wallet: { balance: 0, transactions: [] },
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch !== undefined ? patch : base
  if (typeof base === 'object' && base !== null && typeof patch === 'object' && patch !== null) {
    const out = { ...base }
    for (const k of Object.keys(patch)) out[k] = deepMerge(base[k], patch[k])
    return out
  }
  return patch !== undefined ? patch : base
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    return deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(raw))
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

let state = load()
const listeners = new Set()

export function getState() {
  return state
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater
  state = { ...state, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('persist failed', e)
  }
  listeners.forEach((l) => l())
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function resetState() {
  state = structuredClone(DEFAULT_STATE)
  try {
    localStorage.removeItem(KEY)
  } catch {}
  listeners.forEach((l) => l())
}
