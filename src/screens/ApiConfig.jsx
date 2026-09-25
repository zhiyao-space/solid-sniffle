import { useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { getState, setState, useStore } from '../core/store'
import { toast } from '../core/toast'

/* 精简版聊天API配置（完整预设管理在第四批） */
export default function ApiConfig() {
  const { back } = useUI()
  const { settings } = useStore()
  const cfg = settings.chatAPI || {}
  const [form, setForm] = useState({
    baseURL: cfg.baseURL || '',
    apiKey: cfg.apiKey || '',
    model: cfg.model || '',
    temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.8,
    contextCount: cfg.contextCount || 20,
  })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = () => {
    if (!form.baseURL.trim() || !form.model.trim()) {
      toast('Base URL 和模型得填', 'error')
      return
    }
    setState((s) => ({ settings: { ...s.settings, chatAPI: { ...form, baseURL: form.baseURL.trim(), model: form.model.trim() } } }))
    toast('已保存', 'success')
  }

  const test = async () => {
    if (!form.baseURL.trim() || !form.apiKey.trim() || !form.model.trim()) {
      toast('三项都填上再测', 'error')
      return
    }
    setTesting(true)
    try {
      const res = await fetch(form.baseURL.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${form.apiKey}` },
        body: JSON.stringify({
          model: form.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: '回复一个字：通' }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const txt = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      toast(`连通成功，返回：${String(txt).slice(0, 12)}`, 'success')
    } catch (e) {
      toast('连通失败：' + e.message, 'error', 3600)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="page page-enter">
      <PageTopNav title="聊天 API" />
      <div className="scroll-area page-body">
        <div className="hint-text" style={{ padding: '0 2px' }}>
          填一个 OpenAI 兼容接口（末尾带 /v1）。Key 只存在这台手机里。
        </div>

        <div className="group-card form-card">
          <div className="form-row">
            <label className="form-label hint-text">Base URL</label>
            <input className="input" value={form.baseURL} onChange={set('baseURL')} placeholder="https://…/v1" />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={set('apiKey')}
                placeholder="sk-…"
                autoComplete="off"
              />
              <button className="icon-btn" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShowKey((v) => !v)} aria-label="显示">
                <Icon name="eye" size={16} />
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label hint-text">模型</label>
            <input className="input" value={form.model} onChange={set('model')} placeholder="model-name" />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">温度 {Number(form.temperature).toFixed(1)}</label>
            <input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={set('temperature')} className="slider" />
          </div>
          <div className="form-row">
            <label className="form-label hint-text">上下文条数</label>
            <input className="input" type="number" min="2" max="100" value={form.contextCount} onChange={set('contextCount')} />
          </div>
        </div>

        <div className="form-foot">
          <button className="btn" onClick={test} disabled={testing}>
            {testing ? '测试中…' : '测试连通'}
          </button>
          <button className="btn btn-primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}
