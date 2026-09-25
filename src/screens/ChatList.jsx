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

function GroupAvatar({ group, chars, size = 44 }) {
  if (group.avatar) {
    return <img className="avatar-img" src={group.avatar} alt={group.name} style={{ width: size, height: size }} />
  }
  const ms = group.memberIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean).slice(0, 4)
  return (
    <span className="avatar avatar-fallback group-mosaic" style={{ width: size, height: size }}>
      {ms.map((c) => (c.avatar ? <img key={c.id} src={c.avatar} alt="" /> : <i key={c.id}>{c.name.slice(0, 1)}</i>))}
      {!ms.length && <i>?</i>}
    </span>
  )
}

export function groupPreview(m) {
  switch (m.type) {
    case 'image': return '[图片]'
    case 'dice': return `[骰子 ${m.meta && m.meta.value}点]`
    case 'poll': return `[投票] ${m.meta && m.meta.question}`
    case 'relay': return `[接龙] ${m.meta && m.meta.topic}`
    case 'redpacket': return `[红包 ¥${m.meta && m.meta.amount}]`
    case 'transfer': return `[转账 ¥${m.meta && m.meta.amount}]`
    case 'location': return `[位置] ${m.meta && m.meta.place}`
    case 'ooc': return `[OOC] ${m.content}`
    case 'sys': return m.content
    default: return '[消息]'
  }
}

export default function ChatList() {
  const { navigate } = useUI()
  const { characters, chats, groups, groupChats } = useStore()

  if (characters.length === 0 && groups.length === 0) {
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

  const rows = characters
    .map((c) => {
      const msgs = (chats[c.id] && chats[c.id].messages) || []
      const last = msgs[msgs.length - 1]
      return { kind: 'dm', id: c.id, char: c, last, ts: last ? last.createdAt : 0 }
    })
    .concat(
      groups.map((g) => {
        const msgs = (groupChats[g.id] && groupChats[g.id].messages) || []
        const last = msgs[msgs.length - 1]
        return { kind: 'group', id: g.id, group: g, last, ts: last ? last.createdAt : 0 }
      })
    )
    .sort((a, b) => b.ts - a.ts)

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
          {rows.map((r) => {
            if (r.kind === 'dm') {
              const { char, last } = r
              return (
                <div className="row" key={`dm-${char.id}`} onClick={() => navigate('chat-view', { charId: char.id })}>
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
              )
            }
            const { group, last } = r
            return (
              <div className="row" key={`grp-${group.id}`} onClick={() => navigate('group-chat', { groupId: group.id })}>
                <GroupAvatar group={group} chars={characters} size={44} />
                <div className="row-text" style={{ flex: 1 }}>
                  <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
                    {group.name}
                    {group.mode === 'spectate' && <span className="spectate-tag">旁观</span>}
                  </div>
                  <div className="hint-text chat-preview">
                    {last
                      ? last.type === 'text' ? `${last.senderType === 'user' ? (last.maskName || group.myMask || '我') + '：' : ''}${last.content}` : groupPreview(last)
                      : group.mode === 'spectate' ? '还没开场，进去让他们自己聊' : '群还静着，点这里破冰'}
                  </div>
                </div>
                {last && <span className="timestamp">{fmtTime(new Date(last.createdAt))}</span>}
              </div>
            )
          })}
        </div>
        <div className="dual-actions">
          <button className="btn" onClick={() => navigate('char-create')}>
            <Icon name="plus" size={15} />
            新建角色
          </button>
          <button className="btn" onClick={() => navigate('group-form')}>
            <Icon name="users" size={15} />
            创建群聊
          </button>
        </div>
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
