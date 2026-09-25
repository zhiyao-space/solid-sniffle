import { useEffect, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { getState, setState } from '../core/store'
import { toast } from '../core/toast'
import { uid, fileToDataURL } from '../core/media'

const FIELDS = [
  { key: 'name', label: '昵称', ph: '你打算怎么叫这个角色', required: true },
  { key: 'identity', label: '身份', ph: 'TA是谁，做什么的', required: false },
  { key: 'appearance', label: '外观', ph: '长相、穿搭、气质', required: false },
  { key: 'personality', label: '性格核心', ph: '骨子里的性格是什么样的', required: false },
  { key: 'commStyle', label: '沟通风格', ph: '说话的习惯、语气、口癖', required: false },
  { key: 'taboos', label: '禁止事项', ph: '绝对不允许TA做的事或说的话', required: false },
  { key: 'location', label: '所在位置', ph: 'TA平时在哪儿', required: false },
]

const EMPTY = { name: '', identity: '', appearance: '', personality: '', commStyle: '', taboos: '', location: '', avatar: '' }

export default function CharacterForm() {
  const { route, back } = useUI()
  const editId = route.params && route.params.editId
  const editing = editId ? getState().characters.find((c) => c.id === editId) : null
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

  useEffect(() => {
    if (editId && !editing) back()
  }, [editId, editing, back])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const url = await fileToDataURL(file, 256, 0.85)
      setForm((f) => ({ ...f, avatar: url }))
      toast('头像已就位，保存后生效', 'success')
    } catch (err) {
      toast(err.message || '图片处理失败', 'error')
    }
    e.target.value = ''
  }

  const save = () => {
    if (!form.name.trim()) {
      toast('昵称得有一个', 'error')
      return
    }
    setSaving(true)
    setState((s) => {
      if (editing) {
        return {
          characters: s.characters.map((c) => (c.id === editing.id ? { ...c, ...form, name: form.name.trim() } : c)),
        }
      }
      const char = {
        id: uid(),
        ...form,
        name: form.name.trim(),
        avatar: form.avatar || '',
        balance: 0,
        stats: { mood: 50, health: 50, sanity: 50, favor: 50, history: [] },
        lastCheckIn: null,
        createdAt: Date.now(),
      }
      return { characters: [...s.characters, char] }
    })
    setTimeout(() => {
      setSaving(false)
      back()
      toast(editing ? '已保存修改' : '角色已创建', 'success')
    }, 250)
  }

  return (
    <div className="page page-enter">
      <PageTopNav title={editing ? '编辑角色' : '创建角色'} />
      <div className="scroll-area page-body">
        <div className="glass-card form-avatar-card">
          <button className="form-avatar" onClick={() => fileRef.current && fileRef.current.click()}>
            {form.avatar ? (
              <img src={form.avatar} alt="头像" />
            ) : (
              <Icon name="camera" size={24} />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
          <div className="hint-text">头像由你上传，系统不提供任何现成形象</div>
          {form.avatar && (
            <button className="btn" style={{ height: 34, padding: '0 14px' }} onClick={() => setForm((f) => ({ ...f, avatar: '' }))}>
              清除头像
            </button>
          )}
        </div>

        <div className="group-card form-card">
          {FIELDS.map((f) => (
            <div className="form-row" key={f.key}>
              <label className="form-label hint-text">
                {f.label}
                {f.required && <span className="form-req">*</span>}
              </label>
              {f.key === 'taboos' || f.key === 'personality' ? (
                <textarea
                  className="input"
                  rows={3}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.ph}
                  maxLength={500}
                />
              ) : (
                <input
                  className="input"
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.ph}
                  maxLength={f.key === 'name' ? 20 : 120}
                />
              )}
            </div>
          ))}
        </div>

        <div className="form-foot">
          <button className="btn" onClick={back}>取消</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : editing ? '保存修改' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  )
}
