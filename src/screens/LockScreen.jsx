import { useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { useUI, useLongPress, useNow, fmtTime, fmtDateCN, fmtDateEN } from '../core/nav'
import { useStore } from '../core/store'

/* 锁屏: 大字时间 + 底部手机名/签名, 上滑或点击解锁 */
export default function LockScreen() {
  const { toast, openRename, switchTab } = useUI()
  const { settings } = useStore()
  const now = useNow(1000)
  const [dy, setDy] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const startY = useRef(null)

  const lp = useLongPress(() => {
    if (navigator.vibrate) navigator.vibrate(30)
    openRename()
  })

  const unlock = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => switchTab('desktop'), 260)
  }

  const onPointerDown = (e) => {
    startY.current = e.clientY
    setLeaving(false)
  }
  const onPointerMove = (e) => {
    if (startY.current === null) return
    const d = startY.current - e.clientY
    setDy(Math.max(0, Math.min(160, d)))
  }
  const onPointerUp = () => {
    if (startY.current === null) return
    if (dy > 80) unlock()
    else setDy(0)
    startY.current = null
  }

  const shift = leaving ? -560 : -dy
  const opacity = leaving ? 0 : Math.max(0, 1 - dy / 200)

  return (
    <div
      className={`lockscreen ${leaving ? 'leaving' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ '--shift': `${shift}px`, '--fade': opacity }}
    >
      <div className="lock-glow lg-1" />
      <div className="lock-glow lg-2" />

      <div className="lock-center">
        <div className="lock-time fs-giant ls-cn-num">{fmtTime(now)}</div>
        <div className="lock-date timestamp ls-en-cap">{fmtDateEN(now)}</div>
        <div className="lock-date-cn fs-aux">{fmtDateCN(now)}</div>
      </div>

      <div className="lock-bottom">
        <button className="app-name lock-name" {...lp} onClick={() => toast('解锁后可在顶栏查看关于', 'info')}>
          {settings.phoneName}
        </button>
        {settings.signature && <div className="hint-text lock-sign">{settings.signature}</div>}
        <button className="lock-hint" onClick={unlock}>
          <Icon name="chevron-up" size={18} className="lock-hint-icon" />
          <span className="hint-text">上滑解锁</span>
        </button>
      </div>
    </div>
  )
}
