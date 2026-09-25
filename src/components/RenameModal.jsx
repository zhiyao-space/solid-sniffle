import { useEffect, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { useUI } from '../core/nav'
import { setState, useStore } from '../core/store'
import { toast } from '../core/toast'

/* 改名弹窗: 输入框 + 确认按钮, ESC/蒙层关闭, 保存到 localStorage */
export default function RenameModal() {
  const { renameOpen, closeRename } = useUI()
  const { settings } = useStore()
  const [name, setName] = useState(settings.phoneName)
  const [signature, setSignature] = useState(settings.signature)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (renameOpen) {
      setName(settings.phoneName)
      setSignature(settings.signature)
      setSaving(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [renameOpen, settings.phoneName, settings.signature])

  useEffect(() => {
    if (!renameOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeRename()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [renameOpen, closeRename])

  if (!renameOpen) return null

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast('名称不能为空', 'error')
      inputRef.current?.focus()
      return
    }
    setSaving(true)
    setState((s) => ({
      settings: { ...s.settings, phoneName: trimmed, signature: signature.trim() },
    }))
    setTimeout(() => {
      setSaving(false)
      closeRename()
      toast('已保存', 'success')
    }, 300)
  }

  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && closeRename()}>
      <div className="modal-box" role="dialog" aria-modal>
        <div className="modal-head">
          <span className="nav-title">修改名称</span>
          <button className="icon-btn" onClick={closeRename} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>

        <label className="field-label hint-text">手机名称</label>
        <input
          ref={inputRef}
          className="input"
          value={name}
          maxLength={12}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="输入新名称"
        />

        <label className="field-label hint-text">个性签名（锁屏显示）</label>
        <input
          className="input"
          value={signature}
          maxLength={30}
          onChange={(e) => setSignature(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="写一句签名"
        />

        <div className="modal-actions">
          <button className="btn" onClick={closeRename}>
            取消
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
