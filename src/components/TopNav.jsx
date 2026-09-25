import { Icon } from '../core/icons'
import { useUI, useLongPress, useNow, fmtDateEN } from '../core/nav'
import { useStore } from '../core/store'

export function TopNav({ left, center, right }) {
  return (
    <div className="topnav">
      <div className="topnav-side">{left}</div>
      <div className="topnav-center">{center}</div>
      <div className="topnav-side right">{right}</div>
    </div>
  )
}

/* 桌面模式顶栏: 中央手机名, 点击→关于, 长按→改名 */
export function HomeTopNav() {
  const { navigate, openRename } = useUI()
  const { settings } = useStore()
  const now = useNow(1000)
  const lp = useLongPress(() => {
    if (navigator.vibrate) navigator.vibrate(30)
    openRename()
  })

  return (
    <TopNav
      left={<span className="timestamp ls-en-cap">{fmtDateEN(now)}</span>}
      center={
        <button
          className="app-name nav-name-btn"
          {...lp}
          onClick={() => navigate('about')}
          title="点击查看关于 / 长按修改名称"
        >
          {settings.phoneName}
        </button>
      }
      right={
        <button className="icon-btn" onClick={() => navigate('about')} aria-label="关于">
          <Icon name="info" size={20} />
        </button>
      }
    />
  )
}

/* 二级页顶栏: 返回 + 页面标题 + 右侧动作 */
export function PageTopNav({ title, right, onBack }) {
  const { back } = useUI()
  return (
    <TopNav
      left={
        <button className="icon-btn" onClick={onBack || back} aria-label="返回">
          <Icon name="chevron-left" size={22} />
        </button>
      }
      center={<span className="nav-title">{title}</span>}
      right={right}
    />
  )
}
