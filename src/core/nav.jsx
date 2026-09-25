import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { toast } from './toast'

const Ctx = createContext(null)

export function useUI() {
  return useContext(Ctx)
}

export function useLongPress(onLongPress, ms = 500) {
  const timer = useRef(null)
  const fired = useRef(false)
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  return {
    onPointerDown: () => {
      fired.current = false
      clear()
      timer.current = setTimeout(() => {
        fired.current = true
        onLongPress?.()
      }, ms)
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture: (e) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
      }
    },
  }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function fmtTime(d, withSec = false) {
  const h = pad2(d.getHours())
  const m = pad2(d.getMinutes())
  return withSec ? `${h}:${m}:${pad2(d.getSeconds())}` : `${h}:${m}`
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function fmtDateCN(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK_CN[d.getDay()]}`
}

export function fmtDateEN(d) {
  return `${WEEK_EN[d.getDay()]} ${MONTH_EN[d.getMonth()]} ${d.getDate()}`
}

export function useUIProvider({ navigate, back, route, switchTab }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const openRename = useCallback(() => setRenameOpen(true), [])
  const closeRename = useCallback(() => setRenameOpen(false), [])

  const value = useMemo(
    () => ({
      navigate,
      back,
      route,
      switchTab,
      toast,
      openRename,
      closeRename,
      renameOpen,
    }),
    [navigate, back, route, switchTab, openRename, closeRename, renameOpen]
  )
  return value
}
