import { useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { setState, useStore } from '../core/store'
import { toast } from '../core/toast'
import { CharAvatar } from './ChatList'

const FIELD_LABELS = [
  ['identity', '身份'],
  ['appearance', '外观'],
  ['personality', '性格核心'],
  ['commStyle', '沟通风格'],
  ['taboos', '禁止事项'],
  ['location', '所在位置'],
]

export default function CharacterDetail() {
  const { route, navigate, back } = useUI()
  const { characters } = useStore()
  const char = characters.find((c) => c.id === (route.params && route.params.charId))
  const [confirmDel, setConfirmDel] = useState(false)

  if (!char) {
    return (
      <div className="page page-enter">
        <PageTopNav title="角色" />
        <div className="empty-state">
          <div className="hint-text">角色不存在</div>
          <button className="btn" onClick={back}>返回</button>
        </div>
      </div>
    )
  }

  const remove = () => {
    setState((s) => {
      const chats = { ...s.chats }
      delete chats[char.id]
      return { characters: s.characters.filter((c) => c.id !== char.id), chats }
    })
    setConfirmDel(false)
    toast('已删除角色及相关记录', 'success')
    setTimeout(back, 200)
  }

  return (
    <div className="page page-enter">
      <PageTopNav
        title={char.name}
        right={
          <button className="icon-btn" onClick={() => navigate('char-create', { editId: char.id })} aria-label="编辑">
            <Icon name="edit-3" size={19} />
          </button>
        }
      />
      <div className="scroll-area page-body">
        <div className="glass-card about-card" style={{ padding: '24px 16px', cursor: 'default' }}>
          <CharAvatar char={char} size={76} />
          <div className="fs-title" style={{ color: 'var(--text-primary)', marginTop: 8 }}>{char.name}</div>
          {char.identity && <div className="hint-text">{char.identity}</div>}
          <div className="timestamp ls-cn-num" style={{ marginTop: 4 }}>钱包 ¥{(char.balance || 0).toFixed(2)}</div>
        </div>

        <div className="group-card">
          {FIELD_LABELS.filter(([k]) => char[k]).map(([k, label]) => (
            <div className="row" key={k} style={{ cursor: 'default', alignItems: 'flex-start' }}>
              <span className="hint-text" style={{ width: 76, flexShrink: 0, paddingTop: 2 }}>{label}</span>
              <span className="body-text" style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{char[k]}</span>
            </div>
          ))}
          {FIELD_LABELS.every(([k]) => !char[k]) && (
            <div className="row" style={{ cursor: 'default' }}>
              <span className="hint-text">还没填任何设定，点右上角编辑</span>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => navigate('chat-view', { charId: char.id })}>
          <Icon name="message-circle" size={16} />
          发消息
        </button>
        <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
          <Icon name="trash-2" size={16} />
          删除角色
        </button>
      </div>

      {confirmDel && (
        <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDel(false)}>
          <div className="modal-box">
            <div className="nav-title" style={{ marginBottom: 10 }}>删除「{char.name}」？</div>
            <div className="hint-text" style={{ marginBottom: 18 }}>聊天记录和TA的钱包会一起清掉，删了就找不回来。</div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmDel(false)}>取消</button>
              <button className="btn btn-danger" onClick={remove}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
