import { useEffect, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { getState, setState } from '../core/store'
import { toast } from '../core/toast'
import { uid, fileToDataURL } from '../core/media'

const EMPTY = {
  name: '',
  type: '',
  intro: '',
  relations: '',
  avatar: '',
  mode: 'with-user',
  myMask: '',
  memberIds: [],
}

export default function GroupForm() {
  const { route, back } = useUI()
  const editId = route.params && route.params.editId
  const editing = editId ? getState().groups.find((g) => g.id === editId) : null
  const [form, setForm] = useState(() => {
    if (editing) {
      const f = { ...EMPTY }
      for (const k of Object.keys(EMPTY)) if (editing[k] !== undefined) f[k] = editing[k]
      return f
    }
    return { ...EMPTY }
  })
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const chars = getState().characters

  useEffect(() => {
    if (editId && !editing) back()
  }, [editId, editing, back])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id],
    }))
  }

  const pickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const url = await fileToDataURL(file, 256, 0.85)
      setForm((f) => ({ ...f, avatar: url }))
      toast('群头像已就位', 'success')
    } catch (err) {
      toast(err.message || '图片处理失败', 'error')
    }
    e.target.value = ''
  }

  const save = () => {
    if (!form.name.trim()) {
      toast('群昵称得有一个', 'error')
      return
    }
    if (!form.memberIds.length) {
      toast('至少拉一个角色进群', 'error')
      return
    }
    if (form.mode === 'with-user' && !form.myMask.trim()) {
      toast('填一下你在群里的马甲名', 'error')
      return
    }
    setSaving(true)
    setState((s) => {
      const base = {
        name: form.name.trim(),
        type: form.type.trim(),
        intro: form.intro.trim(),
        relations: form.relations.trim(),
        avatar: form.avatar,
        mode: form.mode,
        myMask: form.myMask.trim(),
        memberIds: form.memberIds,
      }
      if (editing) {
        return { groups: s.groups.map((g) => (g.id === editing.id ? { ...g, ...base } : g)) }
      }
      const group = {
        id: uid(),
        ...base,
        ownerType: 'user',
        ownerId: 'user',
        admins: [],
        announcements: '',
        muted: {},
        titles: {},
        memberNames: {},
        sensitiveWords: [],
        settings: { timeAware: true, showNames: true, willMap: {}, replyLimit: 3, dmProb: 15, contextCount: 30 },
        createdAt: Date.now(),
      }
      return { groups: [...s.groups, group] }
    })
    setTimeout(() => {
      setSaving(false)
      back()
      toast(editing ? '群资料已保存' : '群建好了', 'success')
    }, 250)
  }

  return (
    <div className="page page-enter">
      <PageTopNav title={editing ? '编辑群聊' : '创建群聊'} />
      <div className="scroll-area page-body">
        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">模式</label>
            <div className="seg-row">
              <button className={`seg-btn ${form.mode === 'with-user' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, mode: 'with-user' }))}>
                包含自己
              </button>
              <button className={`seg-btn ${form.mode === 'spectate' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, mode: 'spectate' }))}>
                仅NPC · 旁观
              </button>
            </div>
            <div className="hint-text" style={{ marginTop: 6 }}>
              {form.mode === 'spectate' ? '你不在群里，纯看他们自由聊天，也能以任意角色身份下场' : '你以马甲身份加入群聊，和角色们一起聊'}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label hint-text">
              群昵称<span className="form-req">*</span>
            </label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="这个群叫什么" maxLength={24} />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">群类型</label>
            <input className="input" value={form.type} onChange={set('type')} placeholder="闲聊群 / 工作群 / 游戏开黑群…" maxLength={16} />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">群介绍</label>
            <textarea className="input" rows={2} value={form.intro} onChange={set('intro')} placeholder="群是干嘛的（可选）" maxLength={200} />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">群关系网</label>
            <textarea className="input" rows={3} value={form.relations} onChange={set('relations')} placeholder="成员之间什么关系、有什么恩怨（可选）" maxLength={400} />
          </div>
          {form.mode === 'with-user' && (
            <div className="form-row">
              <label className="form-label hint-text">
                我的群内马甲<span className="form-req">*</span>
              </label>
              <input className="input" value={form.myMask} onChange={set('myMask')} placeholder="你在这个群里叫什么" maxLength={16} />
              <div className="hint-text" style={{ marginTop: 6 }}>群内身份可以和私聊不同，这就是你的面具</div>
            </div>
          )}
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">群成员（至少1个）</label>
            {chars.length === 0 && <div className="hint-text">还没有角色，先去创建角色</div>}
            <div className="member-pick-list">
              {chars.map((c) => (
                <button key={c.id} className={`member-pick ${form.memberIds.includes(c.id) ? 'on' : ''}`} onClick={() => toggleMember(c.id)}>
                  {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                  <span className="mp-name">{c.name}</span>
                  {form.memberIds.includes(c.id) && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label hint-text">群头像</label>
            <div className="group-avatar-row">
              <button className="form-avatar" style={{ width: 56, height: 56 }} onClick={() => fileRef.current && fileRef.current.click()}>
                {form.avatar ? <img src={form.avatar} alt="群头像" /> : <Icon name="camera" size={20} />}
              </button>
              <div className="hint-text">
                {form.avatar ? '已上传自定义头像' : '不上传则自动用成员头像拼一格'}
              </div>
              {form.avatar && (
                <button className="btn" style={{ height: 30, padding: '0 12px' }} onClick={() => setForm((f) => ({ ...f, avatar: '' }))}>
                  清除
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
          </div>
        </div>

        <div className="form-foot">
          <button className="btn" onClick={back}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : editing ? '保存修改' : '建群'}
          </button>
        </div>
      </div>
    </div>
  )
}
