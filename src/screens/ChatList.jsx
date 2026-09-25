import { Icon } from '../core/icons'
import { TopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { useStore } from '../core/store'
import { fmtTime } from '../core/nav'

export function CharAvatar({ char, size = 44 }) {
  if (char.avatar) {
    return <img className="avatar-img" src={char.avatar} alt={char.name} style={{ width: size, height: size }} />
  }
  return (
    <span className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(char.name || '?').slice(0, 1)}
    </span>
  )
}

export default function ChatList() {
  const { navigate } = useUI()
  const { characters, chats } = useStore()

  if (characters.length === 0) {
    return (
      <div className="page page-enter">
        <TopNav
          left={<span className="timestamp ls-en-cap">CHAT</span>}
          center={<span className="nav-title">聊天</span>}
          right={
            <button className="icon-btn" onClick={() => navigate('wallet')} aria-label="钱包">
              <Icon name="wallet" size={20} />
            </button>
          }
        />
        <div className="scroll-area page-body">
          <div className="empty-state" style={{ paddingTop: 90 }}>
            <span className="app-tile" style={{ width: 72, height: 72 }}>
              <Icon name="message-circle" size={30} strokeWidth={1.6} />
            </span>
            <div className="fs-title" style={{ color: 'var(--text-secondary)', marginTop: 6 }}>还没有角色</div>
            <div className="hint-text">一切从你亲手创建开始</div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('char-create')}>
              <Icon name="plus" size={16} />
              创建你的第一个角色
            </button>
          </div>
        </div>
      </div>
    )
  }

  const rows = characters.map((c) => {
    const msgs = (chats[c.id] && chats[c.id].messages) || []
    const last = msgs[msgs.length - 1]
    return { char: c, last }
  })

  return (
    <div className="page page-enter">
      <TopNav
        left={
          <button className="icon-btn" onClick={() => navigate('roster')} aria-label="名册">
            <Icon name="users" size={20} />
          </button>
        }
        center={<span className="nav-title">聊天</span>}
        right={
          <button className="icon-btn" onClick={() => navigate('wallet')} aria-label="钱包">
            <Icon name="wallet" size={20} />
          </button>
        }
      />
      <div className="scroll-area page-body" style={{ gap: 8 }}>
        <div className="group-card">
          {rows.map(({ char, last }) => (
            <div className="row" key={char.id} onClick={() => navigate('chat-view', { charId: char.id })}>
              <CharAvatar char={char} size={44} />
              <div className="row-text" style={{ flex: 1 }}>
                <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{char.name}</div>
                <div className="hint-text chat-preview">
                  {last
                    ? last.type === 'text' ? last.content : previewOf(last, char)
                    : '还没聊过，点这里开始'}
                </div>
              </div>
              {last && <span className="timestamp">{fmtTime(new Date(last.createdAt))}</span>}
            </div>
          ))}
        </div>
        <button className="btn" style={{ alignSelf: 'center', marginTop: 4 }} onClick={() => navigate('char-create')}>
          <Icon name="plus" size={15} />
          新建角色
        </button>
      </div>
    </div>
  )
}

function previewOf(m, char) {
  switch (m.type) {
    case 'transfer': return m.role === 'user' ? `[转账给${char.name} ¥${m.meta.amount}]` : ''
    case 'redpacket': return `[红包 ¥${m.meta.amount}]`
    case 'poke': return '[戳了一戳]'
    case 'report': return '[报备]'
    default: return '[消息]'
  }
}
