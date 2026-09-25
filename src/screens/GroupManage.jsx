import { useEffect, useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { getState, setState, useStore } from '../core/store'
import { toast } from '../core/toast'
import { gMemberName, deleteGroup } from '../core/groupEngine'

export default function GroupManage() {
  const { route, back, navigate } = useUI()
  const groupId = route.params && route.params.groupId
  const state = useStore()
  const group = state.groups.find((g) => g.id === groupId)
  const chars = state.characters

  const [announce, setAnnounce] = useState('')
  const [sensitive, setSensitive] = useState('')
  const [openId, setOpenId] = useState(null)
  const [nickDraft, setNickDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [confirmDisband, setConfirmDisband] = useState(false)

  useEffect(() => {
    if (!group) back()
  }, [group, back])

  useEffect(() => {
    if (group) {
      setAnnounce(group.announcements || '')
      setSensitive((group.sensitiveWords || []).join('\n'))
    }
  }, [group && group.id])

  if (!group) return null

  const members = group.memberIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean)
  const isAdmin = (id) => (group.admins || []).includes(id)
  const isOwner = (id) => group.ownerId === id
  const mutedUntil = (id) => ((group.muted || {})[id] || 0)

  const patchGroup = (patch) => {
    setState((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)) }))
  }

  const saveAnnounce = () => {
    patchGroup({ announcements: announce.trim() })
    toast('群公告已更新', 'success')
  }

  const saveSensitive = () => {
    const words = sensitive.split('\n').map((w) => w.trim()).filter(Boolean)
    patchGroup({ sensitiveWords: words })
    toast(`已保存 ${words.length} 个敏感词，违规自动撤回+禁言5分钟`, 'success')
  }

  const toggleAdmin = (c) => {
    if (isOwner(c.id)) return toast('群主不需要管理员头衔', 'error')
    const admins = isAdmin(c.id) ? (group.admins || []).filter((x) => x !== c.id) : [...(group.admins || []), c.id]
    patchGroup({ admins })
    toast(isAdmin(c.id) ? `已撤销 ${gMemberName(group, c)} 的管理员` : `${gMemberName(group, c)} 已任管理员`, 'success')
  }

  const mute = (c) => {
    const until = Date.now() + 30 * 60 * 1000
    patchGroup({ muted: { ...(group.muted || {}), [c.id]: until } })
    toast(`${gMemberName(group, c)} 被禁言30分钟`, 'success')
  }

  const unmute = (c) => {
    const m = { ...(group.muted || {}) }
    delete m[c.id]
    patchGroup({ muted: m })
    toast(`${gMemberName(group, c)} 已解除禁言`, 'success')
  }

  const kick = (c) => {
    if (isOwner(c.id)) return toast('不能踢群主', 'error')
    patchGroup({ memberIds: group.memberIds.filter((x) => x !== c.id), admins: (group.admins || []).filter((x) => x !== c.id) })
    setOpenId(null)
    toast(`${gMemberName(group, c)} 已移出群聊`, 'success')
  }

  const saveNick = (c) => {
    const name = nickDraft.trim()
    const mn = { ...(group.memberNames || {}) }
    if (name && name !== c.name) mn[c.id] = name
    else delete mn[c.id]
    patchGroup({ memberNames: mn })
    setOpenId(null)
    toast('群昵称已修改', 'success')
  }

  const saveTitle = (c) => {
    const t = titleDraft.trim()
    const tt = { ...(group.titles || {}) }
    if (t) tt[c.id] = t
    else delete tt[c.id]
    patchGroup({ titles: tt })
    setOpenId(null)
    toast('头衔已更新', 'success')
  }

  const transferOwner = (c) => {
    patchGroup({ ownerId: c.id, ownerType: 'char', admins: (group.admins || []).filter((x) => x !== c.id) })
    toast(`群主已转让给 ${gMemberName(group, c)}`, 'success')
  }

  const saveSettings = (patch) => {
    patchGroup({ settings: { ...group.settings, ...patch } })
  }

  const disband = () => {
    deleteGroup(groupId)
    toast('群已解散', 'success')
    back()
  }

  return (
    <div className="page page-enter">
      <PageTopNav title="群管理" />
      <div className="scroll-area page-body">
        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">群公告（群主专属）</label>
            <textarea className="input" rows={2} value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="写点什么贴在公告栏" maxLength={200} />
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveAnnounce}>保存公告</button>
          </div>
          {group.announcements && (
            <div className="hint-text">当前公告：{group.announcements}</div>
          )}
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">成员管理（{members.length}人）</label>
            <div className="pick-list">
              {members.map((c) => (
                <div key={c.id}>
                  <button className="pick-row" onClick={() => { setOpenId(openId === c.id ? null : c.id); setNickDraft(group.memberNames && group.memberNames[c.id] || ''); setTitleDraft(group.titles && group.titles[c.id] || '') }}>
                    {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                    <span>
                      {gMemberName(group, c)}
                      {isOwner(c.id) ? ' · 群主' : isAdmin(c.id) ? ' · 管理员' : ''}
                      {group.titles && group.titles[c.id] ? ` ·「${group.titles[c.id]}」` : ''}
                    </span>
                    {mutedUntil(c.id) > Date.now() && <span className="mute-tag">禁言中</span>}
                    <Icon name={openId === c.id ? 'chevron-up' : 'chevron-down'} size={14} />
                  </button>
                  {openId === c.id && (
                    <div className="member-ops">
                      {!isOwner(c.id) && (
                        <>
                          <button className="btn" onClick={() => toggleAdmin(c)}>{isAdmin(c.id) ? '撤销管理员' : '设为管理员'}</button>
                          <div className="op-field">
                            <label className="hint-text">群昵称</label>
                            <input className="input" value={nickDraft} onChange={(e) => setNickDraft(e.target.value)} placeholder={c.name} maxLength={16} />
                            <button className="btn" onClick={() => saveNick(c)}>改昵称</button>
                          </div>
                          <div className="op-field">
                            <label className="hint-text">头衔</label>
                            <input className="input" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="比如：气氛组组长" maxLength={12} />
                            <button className="btn" onClick={() => saveTitle(c)}>改头衔</button>
                          </div>
                          {mutedUntil(c.id) > Date.now() ? (
                            <button className="btn" onClick={() => unmute(c)}>解除禁言</button>
                          ) : (
                            <button className="btn" onClick={() => mute(c)}>禁言30分钟</button>
                          )}
                          <button className="btn btn-danger" onClick={() => kick(c)}>踢出群聊</button>
                          {group.ownerType === 'user' && !isOwner(c.id) && (
                            <button className="btn" onClick={() => transferOwner(c)}>转让群主给TA</button>
                          )}
                        </>
                      )}
                      {isOwner(c.id) && <div className="hint-text">群主拥有一切权限</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">群管家 · 敏感词（每行一个）</label>
            <textarea className="input" rows={3} value={sensitive} onChange={(e) => setSensitive(e.target.value)} placeholder={'违规词一\n违规词二'} />
            <div className="hint-text" style={{ marginTop: 6 }}>角色发言命中即自动撤回 + 禁言5分钟</div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={saveSensitive}>保存规则</button>
          </div>
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">群设置</label>
            <SwitchRow label="时间感知（告诉角色当前时间）" on={!!group.settings.timeAware} onChange={(v) => saveSettings({ timeAware: v })} />
            <SwitchRow label="显示成员昵称" on={!!group.settings.showNames} onChange={(v) => saveSettings({ showNames: v })} />
            <div className="op-field">
              <label className="hint-text">每轮回复上限（防token飞升）</label>
              <input className="input" type="number" min="1" max="8" value={group.settings.replyLimit || 3} onChange={(e) => saveSettings({ replyLimit: Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 3)) })} />
            </div>
            <div className="op-field">
              <label className="hint-text">群事件触发私聊概率（%）</label>
              <input className="input" type="number" min="0" max="100" value={typeof group.settings.dmProb === 'number' ? group.settings.dmProb : 15} onChange={(e) => saveSettings({ dmProb: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })} />
            </div>
            <div className="op-field">
              <label className="hint-text">上下文注入条数</label>
              <input className="input" type="number" min="5" max="200" value={group.settings.contextCount || 30} onChange={(e) => saveSettings({ contextCount: Math.max(5, Math.min(200, parseInt(e.target.value, 10) || 30)) })} />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label hint-text">回复意愿度（每角色独立，0=潜水 100=话痨）</label>
            {members.map((c) => {
              const v = typeof (group.settings.willMap || {})[c.id] === 'number' ? group.settings.willMap[c.id] : 60
              return (
                <div className="will-row" key={c.id}>
                  <span className="will-name">{gMemberName(group, c)}</span>
                  <input
                    type="range" min="0" max="100" value={v}
                    onChange={(e) => saveSettings({ willMap: { ...(group.settings.willMap || {}), [c.id]: parseInt(e.target.value, 10) } })}
                  />
                  <span className="will-val">{v}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">群资料</label>
            <button className="btn" onClick={() => navigate('group-form', { editId: groupId })}>编辑群资料 / 成员增减</button>
          </div>
          <div className="form-row">
            {confirmDisband ? (
              <div className="disband-confirm">
                <div className="hint-text">解散后聊天记录全没了，确认？</div>
                <button className="btn btn-danger" onClick={disband}>确认解散</button>
                <button className="btn" onClick={() => setConfirmDisband(false)}>再想想</button>
              </div>
            ) : (
              <button className="btn btn-danger" onClick={() => setConfirmDisband(true)}>解散群聊</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SwitchRow({ label, on, onChange }) {
  return (
    <div className="switch-row" onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`switch-pill ${on ? 'on' : ''}`}>
        <i className="switch-dot" />
      </span>
    </div>
  )
}
