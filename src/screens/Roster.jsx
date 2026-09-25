import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { useStore } from '../core/store'
import { CharAvatar } from './ChatList'

export default function Roster() {
  const { navigate } = useUI()
  const { characters } = useStore()

  return (
    <div className="page page-enter">
      <PageTopNav
        title="名册"
        right={
          <button className="icon-btn" onClick={() => navigate('char-create')} aria-label="新建角色">
            <Icon name="plus" size={20} />
          </button>
        }
      />
      <div className="scroll-area page-body">
        {characters.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 90 }}>
            <span className="app-tile" style={{ width: 72, height: 72 }}>
              <Icon name="users" size={30} strokeWidth={1.6} />
            </span>
            <div className="fs-title" style={{ color: 'var(--text-secondary)', marginTop: 6 }}>名册是空的</div>
            <div className="hint-text">这里不会出现任何现成的人设</div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('char-create')}>
              <Icon name="plus" size={16} />
              创建你的第一个角色
            </button>
          </div>
        ) : (
          <div className="group-card">
            {characters.map((c) => (
              <div className="row" key={c.id} onClick={() => navigate('char-detail', { charId: c.id })}>
                <CharAvatar char={c} size={44} />
                <div className="row-text" style={{ flex: 1 }}>
                  <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                  <div className="hint-text">{c.identity || '身份未填写'}</div>
                </div>
                <Icon name="chevron-right" size={18} className="icon" style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
