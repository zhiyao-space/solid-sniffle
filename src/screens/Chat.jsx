import { useEffect, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI, pad2 } from '../core/nav'
import { getState, setState, useStore } from '../core/store'
import { toast } from '../core/toast'
import { apiReady, chatComplete } from '../core/api'
import { uid } from '../core/media'
import { CharAvatar } from './ChatList'
import { FuncSheet, TransferPanel, RedpacketPanel, ReportPanel, CheckInModal, VoiceSheet } from '../components/ChatPanels'

function hhmm(ts) {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export default function Chat() {
  const { route, back, navigate } = useUI()
  const { characters, chats, wallet } = useStore()
  const char = characters.find((c) => c.id === (route.params && route.params.charId))
  const messages = (char && chats[char.id] && chats[char.id].messages) || []

  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [checkin, setCheckin] = useState(false)
  const listRef = useRef(null)
  const lastLen = useRef(0)

  useEffect(() => {
    if (!char) back()
  }, [char, back])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (messages.length !== lastLen.current || typing) {
      if (nearBottom || messages.length > lastLen.current) {
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
      }
    }
    lastLen.current = messages.length
  }, [messages.length, typing])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setSheet(null); setCheckin(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!char) return null

  const pushMsg = (m) =>
    setState((s) => {
      const chat = s.chats[char.id] || { messages: [] }
      return {
        chats: {
          ...s.chats,
          [char.id]: { ...chat, messages: [...chat.messages, { id: uid(), createdAt: Date.now(), ...m }] },
        },
      }
    })

  const patchMsg = (msgId, patch) =>
    setState((s) => {
      const chat = s.chats[char.id]
      if (!chat) return {}
      return {
        chats: {
          ...s.chats,
          [char.id]: { ...chat, messages: chat.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) },
        },
      }
    })

  const walletTx = (tx, delta) =>
    setState((s) => ({
      wallet: {
        balance: +(s.wallet.balance + delta).toFixed(2),
        transactions: [tx, ...s.wallet.transactions],
      },
    }))

  const creditChar = (delta) =>
    setState((s) => ({
      characters: s.characters.map((c) => (c.id === char.id ? { ...c, balance: +((c.balance || 0) + delta).toFixed(2) } : c)),
    }))

  const requestReply = async () => {
    if (!apiReady()) {
      pushMsg({ role: 'system', type: 'sys-hint', content: '消息已保存。TA还不会说话——去 设置 → API 配置 把聊天接口填上。' })
      return
    }
    setTyping(true)
    try {
      const msgs = (getState().chats[char.id] || { messages: [] }).messages
      const reply = await chatComplete(char, msgs)
      pushMsg({ role: 'character', type: 'text', content: reply })
      claimRedpacket()
    } catch (e) {
      toast(e.message === 'NO_API' ? '未配置聊天API' : '回复失败：' + e.message, 'error', 3200)
    } finally {
      setTyping(false)
    }
  }

  const claimRedpacket = () => {
    const msgs = (getState().chats[char.id] || { messages: [] }).messages
    const pending = [...msgs].reverse().find((m) => m.type === 'redpacket' && !m.meta.claimed)
    if (!pending) return
    patchMsg(pending.id, { meta: { ...pending.meta, claimed: true, claimedAt: Date.now() } })
    creditChar(pending.meta.amount)
    pushMsg({ role: 'system', type: 'sys-hint', content: `${char.name} 领取了红包` })
  }

  const sendText = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    pushMsg({ role: 'user', type: 'text', content: t })
    requestReply()
  }

  const doTransfer = ({ amount, note }) => {
    setSheet(null)
    walletTx({ id: uid(), type: 'transfer', amount, note, charId: char.id, charName: char.name, ts: Date.now() }, -amount)
    creditChar(amount)
    pushMsg({ role: 'user', type: 'transfer', meta: { amount, note } })
    toast(`已转 ¥${amount.toFixed(2)}`, 'success')
    requestReply()
  }

  const doRedpacket = ({ amount, cover }) => {
    setSheet(null)
    walletTx({ id: uid(), type: 'redpacket', amount, cover, charId: char.id, charName: char.name, ts: Date.now() }, -amount)
    pushMsg({ role: 'user', type: 'redpacket', meta: { amount, cover, claimed: false } })
    toast('红包已发出', 'success')
    if (apiReady()) requestReply()
  }

  const doPoke = () => {
    setSheet(null)
    pushMsg({ role: 'user', type: 'poke' })
    if (navigator.vibrate) navigator.vibrate(20)
    requestReply()
  }

  const doReport = ({ text: t, image }) => {
    setSheet(null)
    pushMsg({ role: 'user', type: 'report', meta: { text: t, image } })
    requestReply()
  }

  const onPick = (key) => {
    if (key === 'poke') return doPoke()
    if (key === 'focus') return toast('番茄钟第三批开放', 'info')
    setSheet(key)
  }

  let lastTs = 0

  return (
    <div className="page page-enter">
      <PageTopNav
        title={char.name}
        onBack={back}
        right={
          <button className="icon-btn" onClick={() => setSheet('voice')} aria-label="心声">
            <Icon name="heart" size={19} />
          </button>
        }
      />

      <button className="char-status-bar" onClick={() => setCheckin(true)}>
        <span className={`status-dot ${char.lastCheckIn ? 'live' : ''}`} />
        <span className="hint-text">
          {char.lastCheckIn ? `${char.lastCheckIn.activity} · ${char.lastCheckIn.progress}%` : '点这里看看TA在干嘛'}
        </span>
        <Icon name="chevron-right" size={13} className="icon" style={{ opacity: 0.5 }} />
      </button>

      <div className="scroll-area chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <div className="hint-text">还没有消息。第一句由你开场。</div>
          </div>
        )}
        {messages.map((m) => {
          const showTime = m.createdAt - lastTs > 5 * 60 * 1000
          lastTs = m.createdAt
          return (
            <div key={m.id}>
              {showTime && <div className="sys-line timestamp">{hhmm(m.createdAt)}</div>}
              <MsgRow m={m} char={char} />
            </div>
          )
        })}
        {typing && (
          <div className="msg-row">
            <CharAvatar char={char} size={30} />
            <div className="bubble bubble-char typing-bubble">
              <div className="typing-dots"><i /><i /><i /></div>
            </div>
          </div>
        )}
        <div style={{ height: 8 }} />
      </div>

      <div className="chat-inputbar">
        <button className="icon-btn" onClick={() => setSheet('func')} aria-label="功能">
          <Icon name="plus" size={21} />
        </button>
        <input
          className="input chat-input"
          placeholder="说点什么…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
        />
        <button className="icon-btn send-btn" onClick={sendText} disabled={!text.trim()} aria-label="发送">
          <Icon name="send" size={18} />
        </button>
      </div>

      {sheet === 'func' && <FuncSheet onClose={() => setSheet(null)} onPick={onPick} />}
      {sheet === 'transfer' && <TransferPanel char={char} wallet={wallet} onClose={() => setSheet(null)} onDone={doTransfer} />}
      {sheet === 'redpacket' && <RedpacketPanel char={char} wallet={wallet} onClose={() => setSheet(null)} onDone={doRedpacket} />}
      {sheet === 'report' && <ReportPanel char={char} onClose={() => setSheet(null)} onDone={doReport} />}
      {sheet === 'voice' && <VoiceSheet char={char} onClose={() => setSheet(null)} />}
      {checkin && <CheckInModal char={char} onClose={() => setCheckin(false)} />}
    </div>
  )
}

function MsgRow({ m, char }) {
  const { navigate, toast } = useUI()

  if (m.role === 'system') {
    return <div className="sys-line hint-text">{m.content}</div>
  }

  if (m.type === 'transfer') {
    return (
      <div className="msg-row user">
        <div className="pay-card" style={{ cursor: 'default' }}>
          <div className="pay-card-head"><Icon name="wallet" size={15} /> 转账</div>
          <div className="pay-amount-txt">¥{m.meta.amount.toFixed(2)}</div>
          {m.meta.note && <div className="pay-note">{m.meta.note}</div>}
          <div className="pay-foot">已转到 {char.name} 的钱包</div>
        </div>
      </div>
    )
  }

  if (m.type === 'redpacket') {
    return (
      <div className="msg-row user">
        <div
          className="rp-card"
          onClick={() => {
            if (m.meta.claimed) toast('TA已经领过了', 'info')
            else if (!apiReady()) toast('配置聊天API后TA才能领取', 'info')
          }}
        >
          <div className="rp-top"><Icon name="zap" size={16} /> {m.meta.cover || '红包'}</div>
          <div className="rp-amount">¥{m.meta.amount.toFixed(2)}</div>
          <div className="rp-foot">{m.meta.claimed ? '已领取' : '等TA打开手机…'}</div>
        </div>
      </div>
    )
  }

  if (m.type === 'poke') {
    return <div className="sys-line hint-text">你戳了戳 {char.name}</div>
  }

  if (m.type === 'report') {
    return (
      <div className="msg-row user">
        <div className="report-card">
          <div className="pay-card-head"><Icon name="camera" size={14} /> 报备</div>
          {m.meta.text && <div className="body-text" style={{ marginTop: 6 }}>{m.meta.text}</div>}
          {m.meta.image && <img className="report-img" src={m.meta.image} alt="报备图片" loading="lazy" />}
        </div>
      </div>
    )
  }

  const mine = m.role === 'user'
  return (
    <div className={`msg-row ${mine ? 'user' : ''}`}>
      {!mine && (
        <span onClick={() => navigate('char-detail', { charId: char.id })} style={{ display: 'inline-flex', cursor: 'pointer' }}>
          <CharAvatar char={char} size={30} />
        </span>
      )}
      <div className={`bubble ${mine ? 'bubble-user' : 'bubble-char'}`}>
        <span className="body-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</span>
      </div>
    </div>
  )
}
