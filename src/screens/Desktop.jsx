import { Icon } from '../core/icons'
import { HomeTopNav } from '../components/TopNav'
import { useUI, useNow, fmtTime, fmtDateCN } from '../core/nav'
import { useStore } from '../core/store'

const APPS = [
  { id: 'chat', label: '聊天', icon: 'message-circle', route: 'chat' },
  { id: 'forum', label: '论坛', icon: 'globe', module: '论坛', batch: '第五批' },
  { id: 'moments', label: '朋友圈', icon: 'camera', module: '朋友圈', batch: '第三批' },
  { id: 'settings', label: '设置', icon: 'settings', route: 'settings' },
]

export default function Desktop() {
  const { navigate, switchTab } = useUI()
  const { settings } = useStore()
  const now = useNow(1000)

  const openApp = (app) => {
    if (app.route) {
      switchTab(app.route)
    } else {
      navigate('construction', { module: app.module, icon: app.icon, batch: app.batch })
    }
  }

  return (
    <div className="page page-enter">
      <HomeTopNav />
      <div className="scroll-area desktop-body">
        {/* 时间组件 (方案A: 大数字横排) */}
        <div className="glass-card clock-widget" onClick={() => navigate('construction', { module: '时间组件', icon: 'clock', batch: '第六批' })}>
          <div className="clock-time fs-giant ls-cn-num" style={{ fontFamily: 'var(--font-display)' }}>
            {fmtTime(now)}
          </div>
          <div className="clock-meta">
            <span className="fs-aux">{fmtDateCN(now)}</span>
            <span className="timestamp ls-en-cap">KONGSHIJI OS</span>
          </div>
        </div>

        <div className="app-grid">
          {APPS.map((app) => (
            <button key={app.id} className="app-icon" onClick={() => openApp(app)}>
              <span className="app-tile">
                <Icon name={app.icon} size={26} strokeWidth={1.8} />
              </span>
              <span className="app-label fs-aux">{app.label}</span>
            </button>
          ))}
        </div>

        <div className="desktop-foot hint-text">
          {settings.phoneName} · 已就绪
        </div>
      </div>
    </div>
  )
}
