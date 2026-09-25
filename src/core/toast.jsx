let seq = 0
const listeners = new Set()
const items = new Map()

export function toast(msg, type = 'info', duration = 2200) {
  const id = ++seq
  items.set(id, { id, msg, type })
  listeners.forEach((l) => l())
  setTimeout(() => {
    items.delete(id)
    listeners.forEach((l) => l())
  }, duration)
  return id
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function snapshot() {
  return Array.from(items.values())
}
