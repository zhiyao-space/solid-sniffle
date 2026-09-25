import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../core/icons'
import { TopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { useStore, getState, setState } from '../core/store'
import { toast } from '../core/toast'
import { uid, fileToDataURL } from '../core/media'
import { apiReady, estimateTokens } from '../core/api'
import {
  gMemberName,
  groupMsgsOf,
  pushGroupMsg,
  patchGroupMsg,
  runGroupTurn,
  groupOneShot,
  groupAPIHistory,
  grabLuckyRedpacket,
  maybeGroupDM,
  generateGroupDM,
  runRedpacketExpiry,
} from '../core/groupEngine'

const RP_KINDS = { designated: '专属红包', lucky: '拼手气红包', password: '口令红包' }

export default function GroupChat() {
  const { route, back, navigate } = useUI()
  const groupId = route.params && route.params.groupId
  const state = useStore()
  const group = state.groups.find((g) => g.id === groupId)
  const msgs = (state.groupChats[groupId] || { messages: [] }).messages
  const chars = state.characters

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState([])
  const [sheet, setSheet] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [tokenEst, setTokenEst] = useState(0)
  const [autoRounds, setAutoRounds] = useState('3')
  const [pendingText, setPendingText] = useState('')
  const [rpForm, setRpForm] = useState({ kind: 'lucky', amount: '', cover: '', password: '', to: '' })
  const [trForm, setTrForm] = useState({ to: '', amount: '', note: '' })
  const [pollForm, setPollForm] = useState({ question: '', options: ['', ''] })
  const [relayForm, setRelayForm] = useState({ topic: '' })
  const [locForm, setLocForm] = useState({ place: '' })
  const [oocForm, setOocForm] = useState('')
  const [membersOpen, setMembersOpen] = useState(false)
  const [viewChar, setViewChar] = useState(null)
  const scrollRef = useRef(null)
  const imgRef = useRef(null)
  const pressTimer = useRef(null)
  const lpProps = (cb) => ({
    onPointerDown: () => {
      clearTimeout(pressTimer.current)
      pressTimer.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(30)
        cb()
      }, 500)
    },
    onPointerUp: () => clearTimeout(pressTimer.current),
    onPointerLeave: () => clearTimeout(pressTimer.current),
    onPointerCancel: () => clearTimeout(pressTimer.current),
  })

  const members = useMemo(
    () => (group ? group.memberIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean) : []),
    [group, chars]
  )
  const isSpectate = group && group.mode === 'spectate'

  const shownMsgs = useMemo(() => {
    if (!group) return []
    if (!searchOpen || !searchQ.trim()) return msgs
    const q = searchQ.trim()
    return msgs.filter((m) => {
      if (m.type === 'sys' || m.type === 'image') return false
      const txt = m.type === 'text' || m.type === 'ooc' ? m.content : JSON.stringify(m.meta || {})
      return String(txt).includes(q)
    })
  }, [msgs, searchOpen, searchQ, group])

  useEffect(() => {
    if (!group) back()
  }, [group, back])

  useEffect(() => {
    if (group) runRedpacketExpiry(groupId)
  }, [group, groupId, msgs.length])

  useEffect(() => {
    if (!group) return
    try {
      setTokenEst(estimateTokens(JSON.stringify(groupAPIHistory(group, msgs, '__est__'))))
    } catch {
      setTokenEst(0)
    }
  }, [group, msgs])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, typing.length, searchOpen])

  if (!group) return null

  const onTyping = (charId, on) => {
    setTyping((t) => (on ? (t.includes(charId) ? t : [...t, charId]) : t.filter((x) => x !== charId)))
  }

  const nameOf = (m) => {
    if (m.senderType === 'system') return ''
    if (m.senderType === 'user') {
      if (m.fromCharId) {
        const c = chars.find((x) => x.id === m.fromCharId)
        return c ? gMemberName(group, c) : '??'
      }
      return (m.maskName || group.myMask || '我')
    }
    const c = chars.find((x) => x.id === (m.senderId || m.fromCharId))
    return c ? gMemberName(group, c) : '??'
  }

  const avatarOf = (m) => {
    if (m.senderType === 'user' && !m.fromCharId) return null
    const c = chars.find((x) => x.id === (m.fromCharId || m.senderId))
    return c ? c.avatar : null
  }

  const canRecall = (m) => {
    if (m.recalled || m.type === 'sys') return false
    const mine = m.senderType === 'user'
    if (mine) return Date.now() - m.createdAt < 10 * 60 * 1000
    return Date.now() - m.createdAt < 5 * 60 * 1000
  }

  const recall = (m) => {
    patchGroupMsg(groupId, m.id, { recalled: true })
    toast('已撤回', 'success')
  }

  const lpRecall = (m) =>
    lpProps(() => {
      if (canRecall(m)) recall(m)
      else toast('这条消息撤不了了', 'error')
    })

  const doTurn = async () => {
    setBusy(true)
    try {
      await runGroupTurn(groupId, { onTyping })
      const dm = maybeGroupDM(groupId)
      if (dm) {
        try {
          const gNow = getState().groups.find((g) => g.id === groupId)
          const text = await generateGroupDM(gNow, dm)
          setState((s) => {
            const chat = s.chats[dm.id] || { messages: [] }
            return {
              chats: {
                ...s.chats,
                [dm.id]: { ...chat, messages: [...chat.messages, { id: uid(), role: 'character', type: 'text', content: text, createdAt: Date.now() }] },
              },
            }
          })
          toast(`${dm.name} 私聊找你了`, 'success')
        } catch {
          /* dm failure is silent */
        }
      }
    } catch (e) {
      if (e.message === 'NO_API') toast('先去 设置 → API配置 接好接口，他们才会开口', 'error')
      else toast(`群聊出错：${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const sendText = () => {
    const t = input.trim()
    if (!t || busy) return
    if (isSpectate) {
      setPendingText(t)
      setSheet('identity')
      setInput('')
      return
    }
    pushGroupMsg(groupId, { senderType: 'user', type: 'text', content: t, maskName: group.myMask })
    setInput('')
    if (!apiReady()) {
      toast('先去 设置 → API配置 接好接口，他们才会开口', 'error')
      return
    }
    doTurn()
  }

  const sendAs = (charId) => {
    const t = pendingText
    setPendingText('')
    setSheet(null)
    if (!t) return
    if (charId === '__ooc') {
      pushGroupMsg(groupId, { senderType: 'user', fromCharId: '__ooc', type: 'ooc', content: t })
    } else {
      pushGroupMsg(groupId, { senderType: 'user', fromCharId: charId, type: 'text', content: t })
    }
    if (!apiReady()) {
      toast('先配置 API 他们才会开口', 'error')
      return
    }
    doTurn()
  }

  const autoRun = async () => {
    const n = Math.max(1, Math.min(10, parseInt(autoRounds, 10) || 3))
    if (!apiReady()) {
      toast('先配置 API', 'error')
      return
    }
    pushGroupMsg(groupId, { senderType: 'user', fromCharId: '__ooc', type: 'ooc', content: '（剧情继续自然发展，你们自己聊）' })
    setSheet(null)
    setBusy(true)
    for (let i = 0; i < n; i++) {
      try {
        await runGroupTurn(groupId, { onTyping })
      } catch (e) {
        toast(`第${i + 1}轮出错：${e.message}`, 'error')
        break
      }
    }
    setBusy(false)
  }

  const sendImage = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await fileToDataURL(file, 640, 0.8)
      pushGroupMsg(groupId, { senderType: 'user', type: 'image', content: url, maskName: group.myMask })
      if (apiReady()) doTurn()
    } catch (err) {
      toast(err.message || '图片处理失败', 'error')
    }
  }

  const rollDice = () => {
    const v = 1 + Math.floor(Math.random() * 6)
    pushGroupMsg(groupId, { senderType: 'user', type: 'dice', meta: { value: v }, maskName: group.myMask })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const insertAt = (c) => {
    setInput((v) => `${v}@${gMemberName(group, c)} `.slice(0, 500))
    setSheet(null)
  }

  const sendRedpacket = () => {
    const amount = Math.round(parseFloat(rpForm.amount) * 100) / 100
    if (!amount || amount <= 0) return toast('金额得大于0', 'error')
    if (rpForm.kind === 'designated' && !rpForm.to) return toast('选一下发给谁', 'error')
    if (rpForm.kind === 'password' && !rpForm.password.trim()) return toast('口令不能为空', 'error')
    if (state.wallet.balance < amount) return toast('钱包余额不够', 'error')
    setState((s) => ({
      wallet: {
        ...s.wallet,
        balance: Math.round((s.wallet.balance - amount) * 100) / 100,
        transactions: [...s.wallet.transactions, { id: uid(), kind: 'group-redpacket', amount: -amount, note: `群「${group.name}」发红包`, ts: Date.now() }],
      },
    }))
    pushGroupMsg(groupId, {
      senderType: 'user',
      type: 'redpacket',
      maskName: group.myMask,
      meta: {
        kind: rpForm.kind,
        amount,
        cover: rpForm.cover.trim(),
        password: rpForm.password.trim(),
        to: rpForm.to,
        claims: [],
        expireAt: Date.now() + 24 * 3600 * 1000,
      },
    })
    setRpForm({ kind: 'lucky', amount: '', cover: '', password: '', to: '' })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const claimRP = (m) => {
    const meta = m.meta
    const claimed = meta.claims || []
    if (claimed.some((c) => c.key === 'user')) return
    if (meta.kind === 'designated') {
      if (meta.to !== 'user') return toast('这个红包是专属的，不是给你的', 'error')
      patchGroupMsg(groupId, m.id, { meta: { ...meta, claims: [...claimed, { name: group.myMask || '我', key: 'user', amount: meta.amount, ts: Date.now() }] } })
      setState((s) => ({ wallet: { ...s.wallet, balance: Math.round((s.wallet.balance + meta.amount) * 100) / 100 } }))
      pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `你领取了自己的专属红包 ¥${meta.amount}` })
      return
    }
    if (meta.kind === 'lucky') {
      grabLuckyRedpacket(groupId)
      const now = getState()
      const fresh = (now.groupChats[groupId].messages.find((x) => x.id === m.id) || {}).meta || meta
      const taken = ((fresh.claims || []).reduce((a, c) => a + c.amount, 0))
      const rest = Math.round((fresh.amount - taken) * 100) / 100
      if (rest <= 0) return toast('手慢了，红包被抢完了', 'error')
      patchGroupMsg(groupId, m.id, { meta: { ...fresh, userClaimed: rest } })
      setState((s) => ({ wallet: { ...s.wallet, balance: Math.round((s.wallet.balance + rest) * 100) / 100 } }))
      pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `你抢到尾款 ¥${rest}` })
    }
  }

  const sendTransfer = () => {
    const amount = Math.round(parseFloat(trForm.amount) * 100) / 100
    if (!amount || amount <= 0) return toast('金额得大于0', 'error')
    if (state.wallet.balance < amount) return toast('钱包余额不够', 'error')
    const c = chars.find((x) => x.id === trForm.to)
    if (!c) return toast('选一个转账对象', 'error')
    setState((s) => ({
      wallet: {
        ...s.wallet,
        balance: Math.round((s.wallet.balance - amount) * 100) / 100,
        transactions: [...s.wallet.transactions, { id: uid(), kind: 'group-transfer', amount: -amount, note: `群「${group.name}」转给${gMemberName(group, c)}`, ts: Date.now() }],
      },
      characters: s.characters.map((x) => (x.id === c.id ? { ...x, balance: (x.balance || 0) + amount } : x)),
    }))
    pushGroupMsg(groupId, { senderType: 'user', type: 'transfer', maskName: group.myMask, meta: { to: c.id, toName: gMemberName(group, c), amount, note: trForm.note.trim() } })
    setTrForm({ to: '', amount: '', note: '' })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const sendPoll = () => {
    const q = pollForm.question.trim()
    const opts = pollForm.options.map((o) => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) return toast('问题和至少两个选项', 'error')
    pushGroupMsg(groupId, { senderType: 'user', type: 'poll', maskName: group.myMask, meta: { question: q, options: opts, votes: {} } })
    setPollForm({ question: '', options: ['', ''] })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const castVote = (m, idx) => {
    const meta = m.meta
    if (meta.votes && meta.votes['user'] !== undefined) return
    patchGroupMsg(groupId, m.id, { meta: { ...meta, votes: { ...(meta.votes || {}), user: idx } } })
  }

  const urgeVotes = async (m) => {
    if (!apiReady()) return toast('先配置 API', 'error')
    setBusy(true)
    setSheet(null)
    const opts = m.meta.options
    for (const c of members) {
      try {
        const gNow = getState().groups.find((g) => g.id === groupId)
        const t = await groupOneShot(gNow, c, `群里有投票「${m.meta.question}」，选项：${opts.map((o, i) => `${i + 1}.${o}`).join(' ')}。按你的性格和立场投一票。只回复选项的序号数字。`)
        const num = parseInt((t.match(/[0-9]/) || [])[0], 10)
        if (num >= 1 && num <= opts.length) {
          const msgs2 = groupMsgsOf(groupId)
          const msg = msgs2.find((x) => x.id === m.id)
          if (msg) patchGroupMsg(groupId, m.id, { meta: { ...msg.meta, votes: { ...(msg.meta.votes || {}), [c.id]: num - 1 } } })
          pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `${gMemberName(group, c)} 参与了投票` })
        }
      } catch {
        /* skip this voter */
      }
    }
    setBusy(false)
  }

  const sendRelay = () => {
    const t = relayForm.topic.trim()
    if (!t) return toast('写个接龙主题', 'error')
    pushGroupMsg(groupId, { senderType: 'user', type: 'relay', maskName: group.myMask, meta: { topic: t, entries: [] } })
    setRelayForm({ topic: '' })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const continueRelay = async (m) => {
    if (!apiReady()) return toast('先配置 API', 'error')
    if (busy) return
    setBusy(true)
    const entries = m.meta.entries || []
    const c = members[entries.length % Math.max(1, members.length)]
    try {
      const gNow = getState().groups.find((g) => g.id === groupId)
      const t = await groupOneShot(gNow, c, `这是群接龙「${m.meta.topic}」，已有接龙：${entries.map((e) => e.text).join(' → ') || '（还没有人接）'}。直接输出你接的那一句，不要解释。`)
      const msgs2 = groupMsgsOf(groupId)
      const msg = msgs2.find((x) => x.id === m.id)
      patchGroupMsg(groupId, m.id, { meta: { ...msg.meta, entries: [...(msg.meta.entries || []), { name: gMemberName(group, c), text: t }] } })
    } catch (e) {
      toast(e.message, 'error')
    }
    setBusy(false)
  }

  const sendLoc = () => {
    const p = locForm.place.trim()
    if (!p) return toast('写个位置', 'error')
    pushGroupMsg(groupId, { senderType: 'user', type: 'location', maskName: group.myMask, meta: { place: p } })
    setLocForm({ place: '' })
    setSheet(null)
    if (apiReady()) doTurn()
  }

  const sendOoc = () => {
    const t = oocForm.trim()
    if (!t) return
    pushGroupMsg(groupId, { senderType: 'user', type: 'ooc', maskName: group.myMask, content: t })
    setOocForm('')
    setSheet(null)
  }

  const renderBubble = (m) => {
    if (m.recalled) return <div className="sys-line">{nameOf(m)}撤回了一条消息</div>
    switch (m.type) {
      case 'sys':
        return <div className="sys-line">{m.content}</div>
      case 'text':
        return <div className="bubble-text">{m.content}</div>
      case 'image':
        return <img className="bubble-img" src={m.content} alt="图片" />
      case 'ooc':
        return <div className="bubble-ooc">OOC · {m.content}</div>
      case 'dice':
        return (
          <div className="bubble-card dice-card">
            <Icon name="zap" size={16} />
            <span className="dice-num">{(m.meta && m.meta.value) || '?'}</span>
            <span className="dice-label">掷骰子</span>
          </div>
        )
      case 'location':
        return (
          <div className="bubble-card loc-card">
            <Icon name="compass" size={18} />
            <div>
              <div className="loc-name">{(m.meta && m.meta.place) || '位置'}</div>
              <div className="hint-text">位置分享</div>
            </div>
          </div>
        )
      case 'transfer':
        return (
          <div className="bubble-card grp-rp">
            <div className="rp-head">
              <Icon name="wallet" size={18} />
              <span>转账给 {(m.meta && m.meta.toName) || '成员'}</span>
            </div>
            <div className="rp-amount">¥{(m.meta && m.meta.amount) || 0}</div>
            {(m.meta && m.meta.note) && <div className="rp-cover">{m.meta.note}</div>}
          </div>
        )
      case 'redpacket': {
        const meta = m.meta || {}
        const claims = meta.claims || []
        const iClaimed = claims.some((c) => c.key === 'user')
        const expired = meta.expireAt && Date.now() > meta.expireAt
        return (
          <div className="bubble-card grp-rp">
            <div className="rp-head">
              <Icon name="wallet" size={18} />
              <span>{RP_KINDS[meta.kind] || '红包'} · ¥{meta.amount}</span>
            </div>
            {meta.kind === 'password' && meta.password && <div className="rp-cover">口令：{meta.password}</div>}
            {meta.kind === 'designated' && <div className="rp-cover">专属：{meta.to === 'user' ? (group.myMask || '我') : gMemberName(group, chars.find((c) => c.id === meta.to) || { name: '?' })}</div>}
            {meta.cover && <div className="rp-cover">{meta.cover}</div>}
            <div className="rp-claims">
              {claims.map((c, i) => (
                <span key={i} className="rp-claim">{c.name} ¥{c.amount}</span>
              ))}
              {meta.userClaimed ? <span className="rp-claim">我 ¥{meta.userClaimed}</span> : null}
              {!claims.length && !meta.userClaimed && <span className="hint-text">{expired ? '已过期' : '等待领取'}</span>}
            </div>
            {!expired && !iClaimed && !meta.userClaimed && (meta.kind === 'designated' ? meta.to === 'user' : true) && (
              <button className="rp-claim-btn" onClick={() => claimRP(m)}>领取</button>
            )}
            {expired && !iClaimed && !meta.userClaimed && <div className="hint-text">已过24小时，未领部分已处理</div>}
          </div>
        )
      }
      case 'poll': {
        const meta = m.meta || {}
        const votes = meta.votes || {}
        const total = Object.keys(votes).length
        return (
          <div className="bubble-card poll-card">
            <div className="poll-q">{meta.question}</div>
            {meta.options.map((o, i) => {
              const n = Object.values(votes).filter((v) => v === i).length
              const pct = total ? Math.round((n / total) * 100) : 0
              return (
                <button key={i} className={`poll-opt ${votes.user === i ? 'mine' : ''}`} onClick={() => castVote(m, i)}>
                  <span>{o}</span>
                  <span className="poll-pct">{pct}%</span>
                  <i className="poll-bar" style={{ width: `${pct}%` }} />
                </button>
              )
            })}
            <div className="poll-foot hint-text">{total} 人已投</div>
            <button className="rp-claim-btn" onClick={() => urgeVotes(m)} disabled={busy}>让角色们投票</button>
          </div>
        )
      }
      case 'relay': {
        const meta = m.meta || {}
        const entries = meta.entries || []
        return (
          <div className="bubble-card relay-card">
            <div className="poll-q">接龙 · {meta.topic}</div>
            <ol className="relay-list">
              {entries.map((e, i) => (
                <li key={i}><b>{e.name}</b>{e.text}</li>
              ))}
              {!entries.length && <li className="hint-text">还没有人接</li>}
            </ol>
            <button className="rp-claim-btn" onClick={() => continueRelay(m)} disabled={busy}>继续接龙</button>
          </div>
        )
      }
      default:
        return <div className="bubble-text">[未知消息]</div>
    }
  }

  const renderMsg = (m) => {
    if (m.type === 'sys' || m.recalled) return <div key={m.id} className="gmsg-sys">{renderBubble(m)}</div>
    const showName = group.settings && group.settings.showNames
    const ava = avatarOf(m)
    const cls = m.senderType === 'user' && !m.fromCharId ? 'mine' : 'other'
    return (
      <div key={m.id} className={`gmsg ${cls}`} {...lpRecall(m)}>
        {ava ? <img className="gmsg-avatar" src={ava} alt="" /> : <span className="gmsg-avatar gmsg-avatar-txt">{nameOf(m).slice(0, 1)}</span>}
        <div className="gmsg-body">
          {showName && <div className="gmsg-name hint-text">{nameOf(m)}</div>}
          <div className={`gmsg-bubble ${['dice', 'poll', 'relay', 'redpacket', 'transfer', 'location', 'ooc'].includes(m.type) ? 'wide' : ''}`}>
            {renderBubble(m)}
          </div>
        </div>
      </div>
    )
  }

  const typingLabel = typing.map((id) => gMemberName(group, chars.find((c) => c.id === id) || { name: '?' })).join('、')

  return (
    <div className="page page-enter chat-page">
      <TopNav
        left={
          <button className="icon-btn" onClick={back} aria-label="返回">
            <Icon name="chevron-left" size={22} />
          </button>
        }
        center={
          <button className="nav-title grp-title" onClick={() => setMembersOpen(true)}>
            {group.name}
            <span className="grp-count">{isSpectate ? `旁观 · ${members.length}人` : `${members.length + 1}人`}</span>
          </button>
        }
        right={
          <>
            <button className="icon-btn" onClick={() => { setSearchOpen((v) => !v); setSearchQ('') }} aria-label="搜索">
              <Icon name="search" size={18} />
            </button>
            <button className="icon-btn" onClick={() => navigate('group-manage', { groupId })} aria-label="群管理">
              <Icon name="sliders" size={18} />
            </button>
          </>
        }
      />

      {searchOpen && (
        <div className="chat-search">
          <input className="input" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="搜历史消息" autoFocus />
        </div>
      )}

      <div className="scroll-area chat-body" ref={scrollRef}>
        {!shownMsgs.length && (
          <div className="chat-empty">
            <div className="chat-empty-title">{searchOpen ? '没搜到相关消息' : isSpectate ? '围观已就位' : '群还静着'}</div>
            <div className="hint-text">{searchOpen ? '' : isSpectate ? '下方可以让他们自己开聊，或选个身份下场' : '说点什么，或从 + 里发个红包破冰'}</div>
          </div>
        )}
        {shownMsgs.map(renderMsg)}
        {typingLabel && <div className="sys-line typing-line">{typingLabel} 正在输入…</div>}
      </div>

      <div className="chat-inputbar wrap-col">
        {tokenEst > 0 && <div className="token-est hint-text">上下文 ≈{tokenEst} tokens</div>}
        <div className="chat-input-row">
          <button className="icon-btn" onClick={() => setSheet('func')} aria-label="功能">
            <Icon name="plus" size={22} />
          </button>
          <input
            className="input chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendText()}
            placeholder={isSpectate ? '以角色身份或OOC发言' : `以「${group.myMask || '我'}」发言…`}
            maxLength={500}
          />
          <button className="icon-btn send-btn" onClick={sendText} disabled={busy || !input.trim()} aria-label="发送">
            <Icon name="send" size={20} />
          </button>
        </div>
      </div>

      {sheet === 'func' && (
        <Sheet onClose={() => setSheet(null)} title="群功能">
          <div className="func-grid">
            <FuncBtn icon="image" label="图片" onClick={() => { setSheet(null); imgRef.current && imgRef.current.click() }} />
            <FuncBtn icon="compass" label="位置" onClick={() => setSheet('loc')} />
            <FuncBtn icon="zap" label="骰子" onClick={rollDice} />
            <FuncBtn icon="wallet" label="红包" onClick={() => setSheet('rp')} />
            <FuncBtn icon="wallet" label="转账" onClick={() => setSheet('transfer')} />
            <FuncBtn icon="check" label="投票" onClick={() => setSheet('poll')} />
            <FuncBtn icon="book" label="接龙" onClick={() => setSheet('relay')} />
            <FuncBtn icon="users" label="@成员" onClick={() => setSheet('at')} />
            <FuncBtn icon="eye" label="OOC" onClick={() => setSheet('ooc')} />
            {isSpectate && <FuncBtn icon="clock" label="自动聊N轮" onClick={() => setSheet('auto')} />}
          </div>
        </Sheet>
      )}

      {sheet === 'at' && (
        <Sheet onClose={() => setSheet(null)} title="选择要@的成员">
          <div className="pick-list">
            {members.map((c) => (
              <button key={c.id} className="pick-row" onClick={() => insertAt(c)}>
                {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                <span>{gMemberName(group, c)}{c.id === group.ownerId ? ' · 群主' : (group.admins || []).includes(c.id) ? ' · 管理员' : ''}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'identity' && (
        <Sheet onClose={() => { setSheet(null); setPendingText('') }} title="以谁的身份发言">
          <div className="pick-list">
            {members.map((c) => (
              <button key={c.id} className="pick-row" onClick={() => sendAs(c.id)}>
                {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                <span>{gMemberName(group, c)}</span>
              </button>
            ))}
            <button className="pick-row" onClick={() => sendAs('__ooc')}>
              <span className="mp-avatar mp-empty"><Icon name="eye" size={14} /></span>
              <span>旁观者 · OOC指令</span>
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'rp' && (
        <Sheet onClose={() => setSheet(null)} title="发红包">
          <div className="seg-row">
            {['lucky', 'designated', 'password'].map((k) => (
              <button key={k} className={`seg-btn ${rpForm.kind === k ? 'active' : ''}`} onClick={() => setRpForm((f) => ({ ...f, kind: k, to: '' }))}>
                {RP_KINDS[k]}
              </button>
            ))}
          </div>
          {rpForm.kind === 'designated' && (
            <div className="sheet-field">
              <label className="hint-text">发给谁</label>
              <div className="pick-list">
                <button className={`pick-row ${rpForm.to === 'user' ? 'on' : ''}`} onClick={() => setRpForm((f) => ({ ...f, to: 'user' }))}>
                  <span className="mp-avatar mp-empty">{(group.myMask || '我').slice(0, 1)}</span>
                  <span>{group.myMask || '我'}（自己）</span>
                </button>
                {members.map((c) => (
                  <button key={c.id} className={`pick-row ${rpForm.to === c.id ? 'on' : ''}`} onClick={() => setRpForm((f) => ({ ...f, to: c.id }))}>
                    {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                    <span>{gMemberName(group, c)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="sheet-field">
            <label className="hint-text">金额</label>
            <input className="input" type="number" min="0.01" value={rpForm.amount} onChange={(e) => setRpForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="sheet-field">
            <label className="hint-text">封面语（可选）</label>
            <input className="input" value={rpForm.cover} onChange={(e) => setRpForm((f) => ({ ...f, cover: e.target.value }))} placeholder="恭喜发财" maxLength={30} />
          </div>
          {rpForm.kind === 'password' && (
            <div className="sheet-field">
              <label className="hint-text">口令（TA说对口令才能领）</label>
              <input className="input" value={rpForm.password} onChange={(e) => setRpForm((f) => ({ ...f, password: e.target.value }))} placeholder="比如：今天也要加油" maxLength={20} />
            </div>
          )}
          <div className="hint-text">24小时没人领，钱自动回你钱包 · 余额 ¥{state.wallet.balance}</div>
          <button className="btn btn-primary" onClick={sendRedpacket}>塞钱进红包</button>
        </Sheet>
      )}

      {sheet === 'transfer' && (
        <Sheet onClose={() => setSheet(null)} title="转账给群成员">
          <div className="sheet-field">
            <label className="hint-text">转给谁</label>
            <div className="pick-list">
              {members.map((c) => (
                <button key={c.id} className={`pick-row ${trForm.to === c.id ? 'on' : ''}`} onClick={() => setTrForm((f) => ({ ...f, to: c.id }))}>
                  {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                  <span>{gMemberName(group, c)} · ¥{c.balance || 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sheet-field">
            <label className="hint-text">金额</label>
            <input className="input" type="number" min="0.01" value={trForm.amount} onChange={(e) => setTrForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="sheet-field">
            <label className="hint-text">备注（可选）</label>
            <input className="input" value={trForm.note} onChange={(e) => setTrForm((f) => ({ ...f, note: e.target.value }))} maxLength={30} />
          </div>
          <button className="btn btn-primary" onClick={sendTransfer}>转账</button>
        </Sheet>
      )}

      {sheet === 'poll' && (
        <Sheet onClose={() => setSheet(null)} title="发起投票">
          <div className="sheet-field">
            <label className="hint-text">问题</label>
            <input className="input" value={pollForm.question} onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))} placeholder="投个票：…" maxLength={50} />
          </div>
          {pollForm.options.map((o, i) => (
            <div className="sheet-field" key={i}>
              <label className="hint-text">选项 {i + 1}</label>
              <input
                className="input"
                value={o}
                onChange={(e) => setPollForm((f) => ({ ...f, options: f.options.map((x, j) => (j === i ? e.target.value : x)) }))}
                maxLength={30}
              />
            </div>
          ))}
          {pollForm.options.length < 6 && (
            <button className="btn" onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, ''] }))}>加一个选项</button>
          )}
          <button className="btn btn-primary" onClick={sendPoll}>发起投票</button>
        </Sheet>
      )}

      {sheet === 'relay' && (
        <Sheet onClose={() => setSheet(null)} title="发起接龙">
          <div className="sheet-field">
            <label className="hint-text">主题</label>
            <input className="input" value={relayForm.topic} onChange={(e) => setRelayForm({ topic: e.target.value })} placeholder="比如：今天晚饭吃什么接龙" maxLength={40} />
          </div>
          <button className="btn btn-primary" onClick={sendRelay}>发起</button>
        </Sheet>
      )}

      {sheet === 'loc' && (
        <Sheet onClose={() => setSheet(null)} title="分享位置">
          <div className="sheet-field">
            <input className="input" value={locForm.place} onChange={(e) => setLocForm({ place: e.target.value })} placeholder="位置名称" maxLength={40} />
          </div>
          <button className="btn btn-primary" onClick={sendLoc}>发送</button>
        </Sheet>
      )}

      {sheet === 'ooc' && (
        <Sheet onClose={() => setSheet(null)} title="OOC 指令">
          <div className="hint-text">给所有角色的幕后指令：纠正剧情、约束行为，群里显示为旁白</div>
          <div className="sheet-field">
            <textarea className="input" rows={3} value={oocForm} onChange={(e) => setOocForm(e.target.value)} placeholder="比如：大家别聊工作了，气氛轻松点" maxLength={200} />
          </div>
          <button className="btn btn-primary" onClick={sendOoc}>发出指令</button>
        </Sheet>
      )}

      {sheet === 'auto' && (
        <Sheet onClose={() => setSheet(null)} title="让他们自己聊">
          <div className="hint-text">无人值守跑若干轮：每个角色按意愿度独立决定开口，剧情自动推进</div>
          <div className="sheet-field">
            <label className="hint-text">轮数（1-10）</label>
            <input className="input" type="number" min="1" max="10" value={autoRounds} onChange={(e) => setAutoRounds(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={autoRun} disabled={busy}>{busy ? '跑着…' : '开跑'}</button>
        </Sheet>
      )}

      {membersOpen && (
        <MemberSheet onClose={() => { setMembersOpen(false); setViewChar(null) }} viewChar={viewChar} setViewChar={setViewChar} group={group} members={members} />
      )}

      <input ref={imgRef} type="file" accept="image/*" hidden onChange={sendImage} />
    </div>
  )
}

function FuncBtn({ icon, label, onClick }) {
  return (
    <button className="func-item" onClick={onClick}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  )
}

function Sheet({ title, children, onClose }) {
  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

function MemberSheet({ onClose, viewChar, setViewChar, group, members }) {
  if (viewChar) {
    const st = viewChar.stats || {}
    return (
      <div className="sheet-mask" onClick={onClose}>
        <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-head">
            <span className="sheet-title">{gMemberName(group, viewChar)} 的心声</span>
            <button className="icon-btn" onClick={() => setViewChar(null)} aria-label="返回">
              <Icon name="chevron-left" size={18} />
            </button>
          </div>
          <div className="sheet-body">
            <div className="stat-row">
              <span className="stat-label">心情 {st.mood ?? 50}</span>
              <div className="stat-track"><i style={{ width: `${st.mood ?? 50}%` }} /></div>
            </div>
            <div className="stat-row">
              <span className="stat-label">好感 {st.favor ?? 50}</span>
              <div className="stat-track"><i style={{ width: `${st.favor ?? 50}%` }} /></div>
            </div>
            <div className="stat-row">
              <span className="stat-label">理智 {st.sanity ?? 50}</span>
              <div className="stat-track"><i style={{ width: `${st.sanity ?? 50}%` }} /></div>
            </div>
            <div className="voice-quote">{viewChar.lastThought || 'TA还没留下想法'}</div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">群成员</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="pick-list">
            {members.map((c) => {
              const title = (group.titles || {})[c.id]
              const role = c.id === group.ownerId ? '群主' : (group.admins || []).includes(c.id) ? '管理员' : ''
              return (
                <button key={c.id} className="pick-row" onClick={() => setViewChar(c)}>
                  {c.avatar ? <img className="mp-avatar" src={c.avatar} alt="" /> : <span className="mp-avatar mp-empty">{c.name.slice(0, 1)}</span>}
                  <span>
                    {gMemberName(group, c)}
                    {title ? ` · ${title}` : ''}
                    {role ? ` · ${role}` : ''}
                  </span>
                  <Icon name="chevron-right" size={14} />
                </button>
              )
            })}
          </div>
          <div className="hint-text">点成员可看心声（好感度 / 心理活动）</div>
        </div>
      </div>
    </div>
  )
}
