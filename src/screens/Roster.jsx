import { useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI, useLongPress } from '../core/nav'
import { useStore } from '../core/store'
import { toast } from '../core/toast'
import { CharAvatar } from './ChatList'
import { deleteGroup } from '../core/groupEngine'

function GroupAvatarMini({ group, chars, size = 44 }) {
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

export default function Roster() {
  const { navigate } = useUI()
  const { characters, groups } = useStore()
  const [tab, setTab] = useState('chars')
  const [menuGroup, setMenuGroup] = useState(null)

  const lpGroup = useLongPress((g) => setMenuGroup(g))

  return (
    <div className="page page-enter">
      <PageTopNav
        title="名册"
        right={
          <button
            className="icon-btn"
            onClick={() => (tab === 'chars' ? navigate('char-create') : navigate('group-form'))}
            aria-label={tab === 'chars' ? '新建角色' : '创建群聊'}
          >
            <Icon name="plus" size={20} />
          </button>
        }
      />
      <div className="seg-row roster-tabs">
        <button className={`seg-btn ${tab === 'chars' ? 'active' : ''}`} onClick={() => setTab('chars')}>
          角色 · {characters.length}
        </button>
        <button className={`seg-btn ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
          群聊 · {groups.length}
        </button>
      </div>
      <div className="scroll-area page-body">
        {tab === 'chars' ? (
          characters.length === 0 ? (
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
          )
        ) : groups.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 90 }}>
            <span className="app-tile" style={{ width: 72, height: 72 }}>
              <Icon name="users" size={30} strokeWidth={1.6} />
            </span>
            <div className="fs-title" style={{ color: 'var(--text-secondary)', marginTop: 6 }}>还没有群聊</div>
            <div className="hint-text">拉几个角色，建一个群</div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('group-form')}>
              <Icon name="plus" size={16} />
              创建群聊
            </button>
          </div>
        ) : (
          <div className="group-card">
            {groups.map((g) => (
              <div
                className="row"
                key={g.id}
                onClick={() => navigate('group-chat', { groupId: g.id })}
                {...lpGroup(g)}
              >
                <GroupAvatarMini group={g} chars={characters} size={44} />
                <div className="row-text" style={{ flex: 1 }}>
                  <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
                    {g.name}
                    {g.mode === 'spectate' && <span className="spectate-tag">旁观</span>}
                  </div>
                  <div className="hint-text">
                    {g.type || '群聊'} · {g.memberIds.length}个成员
                  </div>
                </div>
                <Icon name="chevron-right" size={18} className="icon" style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
            ))}
            <div className="hint-text" style={{ textAlign: 'center', padding: '6px 0' }}>长按群可编辑 / 解散</div>
          </div>
        )}
      </div>

      {menuGroup && (
        <div className="sheet-mask" onClick={() => setMenuGroup(null)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <span className="sheet-title">{menuGroup.name}</span>
              <button className="icon-btn" onClick={() => setMenuGroup(null)} aria-label="关闭">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="sheet-body">
              <div className="pick-list">
                <button
                  className="pick-row"
                  onClick={() => {
                    const g = menuGroup
                    setMenuGroup(null)
                    navigate('group-form', { editId: g.id })
                  }}
                >
                  <span className="mp-avatar mp-empty"><Icon name="sliders" size={14} /></span>
                  <span>编辑群资料</span>
                </button>
                <button
                  className="pick-row"
                  onClick={() => {
                    const g = menuGroup
                    setMenuGroup(null)
                    navigate('group-manage', { groupId: g.id })
                  }}
                >
                  <span className="mp-avatar mp-empty"><Icon name="shield" size={14} /></span>
                  <span>群管理</span>
                </button>
                <button
                  className="pick-row danger"
                  onClick={() => {
                    const g = menuGroup
                    setMenuGroup(null)
                    deleteGroup(g.id)
                    toast('群已解散', 'success')
                  }}
                >
                  <span className="mp-avatar mp-empty"><Icon name="x" size={14} /></span>
                  <span>解散群聊</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
