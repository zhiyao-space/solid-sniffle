import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { useStore } from '../core/store'

const ROWS = [
  { label: '版本', value: '0.1.0 · 第一批' },
  { label: '构建日期', value: '2026-09-25' },
  { label: '开发者', value: 'MonkeyCode AI' },
  { label: '技术栈', value: 'React + Vite' },
  { label: '数据存储', value: 'localStorage / IndexedDB' },
]

/* 关于页: 版本信息 + 开发者署名 */
export default function About() {
  const { settings } = useStore()
  return (
    <div className="page page-enter">
      <PageTopNav title="关于" />
      <div className="scroll-area page-body">
        <div className="glass-card about-card">
          <div className="about-logo">
            <Icon name="zap" size={30} strokeWidth={1.8} />
          </div>
          <div className="app-name" style={{ fontSize: 26 }}>
            {settings.phoneName}
          </div>
          <div className="hint-text ls-en-cap">VOID ETCHING ERA</div>
        </div>

        <div className="group-card">
          {ROWS.map((r) => (
            <div className="row" key={r.label} style={{ cursor: 'default' }}>
              <span className="fs-body row-label">{r.label}</span>
              <span className="timestamp" style={{ marginLeft: 'auto' }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div className="hint-text" style={{ textAlign: 'center', padding: '18px 0 8px' }}>
          长按顶栏名称可修改手机名与签名
        </div>
      </div>
    </div>
  )
}
