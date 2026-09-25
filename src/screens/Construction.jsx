import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'

/* 未实装模块占位页: 显示模块名 + 所在批次 + 返回 */
export default function Construction(props) {
  const { route, back } = useUI()
  const p = { ...(route.params || {}), ...props }
  const { module = route.name, icon = 'zap', batch = '后续批次' } = p

  return (
    <div className="page page-enter">
      <PageTopNav title={module} />
      <div className="scroll-area page-body">
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <span className="app-tile" style={{ width: 72, height: 72 }}>
            <Icon name={icon} size={30} strokeWidth={1.6} />
          </span>
          <div className="fs-title" style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
            {module}
          </div>
          <div className="hint-text">该模块将在{batch}实装</div>
          <button className="btn" style={{ marginTop: 18 }} onClick={back}>
            <Icon name="chevron-left" size={16} />
            返回
          </button>
        </div>
      </div>
    </div>
  )
}
