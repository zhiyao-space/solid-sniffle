import { Icon } from '../core/icons'
import { useUI } from '../core/nav'
import { useStore } from '../core/store'

const TABS = [
  { id: 'desktop', label: '桌面', icon: 'home' },
  { id: 'chat', label: '聊天', icon: 'message-circle' },
  { id: 'forum', label: '论坛', icon: 'globe' },
  { id: 'moments', label: '朋友圈', icon: 'camera' },
  { id: 'settings', label: '设置', icon: 'settings' },
]

export default function BottomNav() {
  const { route, switchTab } = useUI()
  const current = route.tab || route.name

  return (
    <nav className="bottomnav">
      {TABS.map((t) => {
        const active = current === t.id
        return (
          <button
            key={t.id}
            className={`tab-item ${active ? 'active' : ''}`}
            onClick={() => switchTab(t.id)}
            aria-label={t.label}
          >
            <Icon name={t.icon} size={21} strokeWidth={active ? 2.2 : 1.8} />
            <span className="tab-label fs-micro">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
