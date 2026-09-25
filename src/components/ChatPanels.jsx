import { useEffect, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { useUI } from '../core/nav'
import { setState } from '../core/store'
import { toast } from '../core/toast'
import { apiReady, chatOneShot } from '../core/api'
import { fileToDataURL, uid } from '../core/media'

function SheetShell({ title, onClose, children }) {
  return (
    <div className="modal-mask sheet-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-box">
        <div className="sheet-head">
          <span className="nav-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FuncSheet({ onClose, onPick }) {
  const items = [
    { key: 'report', icon: 'camera', label: '报备', desc: '让TA知道你在干嘛' },
    { key: 'transfer', icon: 'wallet', label: '转账', desc: '直接打钱' },
    { key: 'redpacket', icon: 'zap', label: '红包', desc: '发一个红包' },
    { key: 'poke', icon: 'pointer', label: '戳一戳', desc: '戳一下TA' },
    { key: 'focus', icon: 'clock', label: '一起专注', desc: '番茄钟 · 第三批开放', disabled: true },
  ]
  return (
    <SheetShell title="功能" onClose={onClose}>
      <div className="func-grid">
        {items.map((it) => (
          <button
            key={it.key}
            className="func-item"
            disabled={it.disabled}
            onClick={() => { onClose(); onPick(it.key) }}
          >
            <span className="row-ico"><Icon name={it.icon} size={19} strokeWidth={1.8} /></span>
            <span className="func-label fs-aux">{it.label}</span>
            <span className="hint-text func-desc">{it.desc}</span>
          </button>
        ))}
      </div>
    </SheetShell>
  )
}

export function TransferPanel({ char, wallet, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = () => {
    const a = Math.round(parseFloat(amount) * 100) / 100
    if (!(a > 0)) return toast('金额得大于 0', 'error')
    if (a > wallet.balance) return toast('余额不够，先去钱包入账', 'error')
    setBusy(true)
    onDone({ amount: a, note: note.trim() })
  }

  return (
    <SheetShell title={`转账给 ${char.name}`} onClose={onClose}>
      <div className="hint-text" style={{ marginBottom: 10 }}>我的余额 ¥{wallet.balance.toFixed(2)}</div>
      <input
        className="input pay-amount"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <input
        className="input"
        style={{ marginTop: 10 }}
        placeholder="备注（可空）"
        value={note}
        maxLength={40}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={submit} disabled={busy}>
        {busy ? '转账中…' : '确认转账'}
      </button>
    </SheetShell>
  )
}

export function RedpacketPanel({ char, wallet, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [cover, setCover] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = () => {
    const a = Math.round(parseFloat(amount) * 100) / 100
    if (!(a > 0)) return toast('金额得大于 0', 'error')
    if (a > wallet.balance) return toast('余额不够，先去钱包入账', 'error')
    setBusy(true)
    onDone({ amount: a, cover: cover.trim() })
  }

  return (
    <SheetShell title={`给 ${char.name} 发红包`} onClose={onClose}>
      <div className="hint-text" style={{ marginBottom: 10 }}>我的余额 ¥{wallet.balance.toFixed(2)}</div>
      <input
        className="input pay-amount"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <input
        className="input"
        style={{ marginTop: 10 }}
        placeholder="封面祝福语，自己写（可空）"
        value={cover}
        maxLength={20}
        onChange={(e) => setCover(e.target.value)}
      />
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={submit} disabled={busy}>
        {busy ? '发送中…' : '塞钱进红包'}
      </button>
    </SheetShell>
  )
}

export function ReportPanel({ char, onClose, onDone }) {
  const [text, setText] = useState('')
  const [img, setImg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    try {
      setImg(await fileToDataURL(f, 480, 0.8))
    } catch (err) {
      toast(err.message || '图片处理失败', 'error')
    }
    e.target.value = ''
  }

  const submit = () => {
    if (!text.trim() && !img) return toast('写点什么或传张图', 'error')
    setBusy(true)
    onDone({ text: text.trim(), image: img })
  }

  return (
    <SheetShell title={`向 ${char.name} 报备`} onClose={onClose}>
      <textarea
        className="input"
        rows={3}
        placeholder="现在在做什么、去哪儿，跟TA说一声"
        value={text}
        maxLength={200}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className="report-img-row">
        <button className="btn" style={{ height: 36 }} onClick={() => fileRef.current && fileRef.current.click()}>
          <Icon name="image" size={15} />
          {img ? '换一张' : '加张图'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        {img && <img className="report-thumb" src={img} alt="预览" />}
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={submit} disabled={busy}>
        {busy ? '提交中…' : '提交报备'}
      </button>
    </SheetShell>
  )
}

export function CheckInModal({ char, onClose }) {
  const { navigate } = useUI()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(char.lastCheckIn || null)

  const run = async () => {
    setLoading(true)
    setErr('')
    try {
      const raw = await chatOneShot(
        char,
        '报备一下你此刻正在做的事。严格按格式输出一行，不要别的：活动名|0到100之间的数字|一句话当前心情'
      )
      const parts = raw.split('|').map((x) => x.trim())
      const data = {
        activity: parts[0] || raw.slice(0, 20),
        progress: Math.max(0, Math.min(100, parseInt(parts[1], 10) || 0)),
        moodLine: parts[2] || '',
        ts: Date.now(),
      }
      setResult(data)
      setState((s) => ({
        characters: s.characters.map((c) => (c.id === char.id ? { ...c, lastCheckIn: data } : c)),
      }))
    } catch (e) {
      setErr(e.message === 'NO_API' ? '未配置聊天API' : e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!result && !loading && apiReady()) run()
  }, [])

  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box checkin-box">
        <div className="modal-head">
          <span className="nav-title">{char.name} 在干嘛</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>

        {!apiReady() ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <Icon name="plug" size={26} className="empty-icon" />
            <div className="hint-text">查岗需要角色真的"活着"，先去配置聊天API</div>
            <button className="btn" onClick={() => { onClose(); navigate('api-config') }}>去配置</button>
          </div>
        ) : loading ? (
          <div className="empty-state" style={{ padding: '26px 0' }}>
            <div className="typing-dots"><i /><i /><i /></div>
            <div className="hint-text">TA那边有点动静…</div>
          </div>
        ) : err ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <Icon name="alert-circle" size={24} className="empty-icon" />
            <div className="hint-text">{err}</div>
            <button className="btn" onClick={run}>重试</button>
          </div>
        ) : result ? (
          <>
            <div className="fs-title" style={{ color: 'var(--text-primary)' }}>{result.activity}</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${result.progress}%` }} /></div>
            <div className="hint-text">进行到 {result.progress}%</div>
            {result.moodLine && <div className="body-text" style={{ marginTop: 8 }}>{result.moodLine}</div>}
            <div className="timestamp" style={{ marginTop: 8 }}>报备于 {new Date(result.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
            <button className="btn" style={{ marginTop: 14 }} onClick={run}>再查一次</button>
          </>
        ) : null}
      </div>
    </div>
  )
}

const STAT_DEFS = [
  ['mood', '心情'],
  ['health', '健康'],
  ['sanity', '理智'],
  ['favor', '好感度'],
]

export function VoiceSheet({ char, onClose }) {
  const [thought, setThought] = useState(char.lastThought || null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const stats = char.stats || { mood: 50, health: 50, sanity: 50, favor: 50, history: [] }

  const genThought = async () => {
    setLoading(true)
    setErr('')
    try {
      const t = await chatOneShot(char, '用第一人称写你此刻心里真正想的一句坏毛病的话。只写这一句，别加引号。')
      const data = { text: t, ts: Date.now() }
      setThought(data)
      setState((s) => ({
        characters: s.characters.map((c) => (c.id === char.id ? { ...c, lastThought: data } : c)),
      }))
    } catch (e) {
      setErr(e.message === 'NO_API' ? '未配置聊天API' : e.message)
    } finally {
      setLoading(false)
    }
  }

  const hist = (stats.history || []).map((h) => h.mood)

  return (
    <SheetShell title="心声" onClose={onClose}>
      <div className="voice-stats">
        {STAT_DEFS.map(([k, label]) => (
          <div className="stat-row" key={k}>
            <span className="hint-text stat-label">{label}</span>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${stats[k] || 0}%` }} /></div>
            <span className="timestamp stat-val">{stats[k] || 0}</span>
          </div>
        ))}
      </div>

      {hist.length > 1 && (
        <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            points={hist.slice(-24).map((v, i, arr) => `${(i / (arr.length - 1)) * 100},${28 - (v / 100) * 26 - 1}`).join(' ')}
          />
        </svg>
      )}
      {hist.length <= 1 && <div className="hint-text" style={{ textAlign: 'center', padding: '4px 0' }}>情绪曲线会随相处慢慢长出来</div>}

      <div className="divider" style={{ margin: '12px 0' }} />

      <div className="hint-text" style={{ marginBottom: 6 }}>此刻想法</div>
      {loading ? (
        <div className="typing-dots"><i /><i /><i /></div>
      ) : err ? (
        <div className="empty-state" style={{ padding: '8px 0' }}>
          <div className="hint-text">{err}</div>
          <button className="btn" style={{ height: 34 }} onClick={genThought}>重试</button>
        </div>
      ) : thought ? (
        <div className="body-text" style={{ whiteSpace: 'pre-wrap' }}>{thought.text}</div>
      ) : (
        <div className="hint-text">TA没说。想听就点下面。</div>
      )}

      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <span className="hint-text">{char.location ? `位置：${char.location}` : '没填位置'}</span>
        <button className="btn" style={{ height: 36 }} onClick={genThought} disabled={loading}>
          {thought ? '再偷听一次' : '听听TA想什么'}
        </button>
      </div>
    </SheetShell>
  )
}
