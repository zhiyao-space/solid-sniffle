import { Icon } from '../core/icons'
import { useNow, fmtTime } from '../core/nav'

export default function StatusBar() {
  const now = useNow(1000)
  return (
    <div className="statusbar">
      <span className="timestamp ls-cn-num">{fmtTime(now)}</span>
      <div className="notch" />
      <div className="statusbar-right">
        <Icon name="signal" size={14} strokeWidth={2.2} />
        <Icon name="wifi" size={14} strokeWidth={2.2} />
        <Icon name="battery" size={18} strokeWidth={1.6} />
      </div>
    </div>
  )
}
