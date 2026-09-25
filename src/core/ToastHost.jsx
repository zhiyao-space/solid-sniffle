import { useSyncExternalStore } from 'react'
import * as bus from './toast'

export function ToastHost() {
  const items = useSyncExternalStore(bus.subscribe, bus.snapshot, bus.snapshot)
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
