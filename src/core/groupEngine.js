import { getState, setState } from './store'
import { CHAR_STYLE, apiReady, chatCompleteWith } from './api'
import { uid } from './media'

export function gMemberName(group, char) {
  return (group.memberNames && group.memberNames[char.id]) || char.name
}

export function groupMsgsOf(groupId) {
  const s = getState()
  return (s.groupChats[groupId] && s.groupChats[groupId].messages) || []
}

export function pushGroupMsg(groupId, m) {
  setState((s) => {
    const chat = s.groupChats[groupId] || { messages: [] }
    return {
      groupChats: {
        ...s.groupChats,
        [groupId]: { ...chat, messages: [...chat.messages, { id: uid(), createdAt: Date.now(), ...m }] },
      },
    }
  })
}

export function patchGroupMsg(groupId, msgId, patch) {
  setState((s) => {
    const chat = s.groupChats[groupId]
    if (!chat) return {}
    return {
      groupChats: {
        ...s.groupChats,
        [groupId]: { ...chat, messages: chat.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) },
      },
    }
  })
}

export function extractAt(text) {
  const out = []
  const re = /@([^\s@，。,]{1,16})/g
  let m
  while ((m = re.exec(text || ''))) out.push(m[1])
  return out
}

function memberNameAt(group, senderType, senderId, fromCharId, msg) {
  const s = getState()
  if (senderType === 'user') return (group.myMask && msg && msg.maskName) || group.myMask || '我'
  if (senderType === 'char') {
    const c = s.characters.find((x) => x.id === (fromCharId || senderId))
    return c ? gMemberName(group, c) : '未知'
  }
  return '系统'
}

export function buildGroupSystem(group, char) {
  const s = getState()
  const myName = gMemberName(group, char)
  const ownerLabel = (c) => (c.id === group.ownerId ? '（群主）' : (group.admins || []).includes(c.id) ? '（管理员）' : '')
  const memberLines = group.memberIds
    .map((id) => s.characters.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => {
      const title = (group.titles && group.titles[c.id]) ? `，头衔「${group.titles[c.id]}」` : ''
      const brief = [c.identity, c.personality].filter(Boolean).join('；')
      return `- ${gMemberName(group, c)}${ownerLabel(c)}：${brief || '（未设定）'}${title}`
    })
    .join('\n')
  const userLine = group.mode === 'spectate' ? '' : `- ${group.myMask || '我'}（用户本人，也是群主）：你认识的那个用户`
  const now = new Date()
  const timeAware = group.settings && group.settings.timeAware
  return `【你的人设】
${char.name}：${[char.identity, char.appearance, char.personality, char.commStyle].filter(Boolean).join('\n') || '（用户未填写设定，自然发挥）'}
${char.taboos ? `【你的禁忌】${char.taboos}\n` : ''}
【当前场景】你在一个群聊「${group.name}」里，你的群昵称是「${myName}」${(group.titles && group.titles[char.id]) ? `，头衔「${group.titles[char.id]}」` : ''}。
${group.type ? `群类型：${group.type}\n` : ''}${group.intro ? `群介绍：${group.intro}\n` : ''}${group.relations ? `【群内关系网】${group.relations}\n` : ''}
【群成员】
${memberLines}
${userLine}

【群聊规则】
- 这里是多人群聊，你的发言所有人可见。像真人刷群一样：话少、口语、碎片化，可以只发几个字，可以接别人的话茬
- 平时按你的性格和当时话题决定说什么；这轮系统已判定你要发言，请给出一条自然的消息
- 有人@你时必须正面回应
- 聊天记录里每条消息前的 [名字] 表示谁说的；assistant 开头的消息是你自己之前说的话
${timeAware ? `- 当前时间：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}\n` : ''}
${CHAR_STYLE}

【输出要求】只输出你这条消息的正文本身，不要带名字前缀，不要任何解释。`
}

export function groupEventLabel(m) {
  switch (m.type) {
    case 'image':
      return `[系统] ${memberNameOfMsg(m)}发了一张图片`
    case 'dice':
      return `[系统] ${memberNameOfMsg(m)}掷骰子，摇出了 ${m.meta && m.meta.value} 点`
    case 'poll':
      return `[系统] ${memberNameOfMsg(m)}发起了投票：${m.meta && m.meta.question}（选项：${(m.meta && m.meta.options || []).join('/')}）`
    case 'relay':
      return `[系统] ${memberNameOfMsg(m)}发起了接龙：${m.meta && m.meta.topic}，已接：${(m.meta && m.meta.entries || []).map((e) => e.text).join(' → ') || '（还没有人接）'}`
    case 'redpacket':
      return redPacketLabel(m)
    case 'transfer':
      return `[系统] ${memberNameOfMsg(m)}发起了一笔转账`
    case 'location':
      return `[系统] ${memberNameOfMsg(m)}分享了位置：${m.meta && m.meta.place}`
    case 'ooc':
      return `[旁白指令] ${m.content}`
    default:
      return '[系统事件]'
  }
}

function redPacketLabel(m) {
  const meta = m.meta || {}
  const kinds = { designated: '专属红包', lucky: '拼手气红包', password: '口令红包' }
  let extra = ''
  if (meta.kind === 'password' && meta.password) extra = `，口令是「${meta.password}」`
  const claimed = (meta.claims || []).map((c) => `${c.name}抢到¥${c.amount}`).join('、')
  return `[系统] ${memberNameOfMsg(m)}发了一个${kinds[meta.kind] || ''}红包¥${meta.amount}${meta.cover ? '，封面：' + meta.cover : ''}${extra}${claimed ? `。${claimed}` : ''}`
}

function memberNameOfMsg(m) {
  const s = getState()
  const group = s.groups.find((g) => g.id === m.__groupId)
  if (!group) return '有人'
  return memberNameAt(group, m.senderType, m.senderId, m.fromCharId, m)
}

export function groupAPIHistory(group, msgs, selfCharId) {
  const n = (group.settings && group.settings.contextCount) || 30
  const out = []
  msgs.slice(-n).forEach((m) => {
    if (m.type === 'sys' || m.recalled) return
    const isSelf =
      m.senderType === 'char'
        ? m.senderId === selfCharId || m.fromCharId === selfCharId
        : m.senderType === 'user' && m.fromCharId === selfCharId
    if (m.type === 'text') {
      if (isSelf) {
        out.push({ role: 'assistant', content: m.content })
        return
      }
      const name = memberNameAt(group, m.senderType === 'user' && !m.fromCharId ? 'user' : 'char', m.senderId, m.fromCharId, m)
      out.push({ role: 'user', content: `[${name}] ${m.content}` })
      return
    }
    if (isSelf) return
    out.push({ role: 'user', content: groupEventLabel({ ...m, __groupId: group.id }) })
  })
  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function groupOneShot(group, char, instruction) {
  const msgs = groupMsgsOf(group.id)
  const apiMsgs = [...groupAPIHistory(group, msgs, char.id), { role: 'user', content: `[系统内部指令，群里其他人看不到] ${instruction}` }]
  return chatCompleteWith(char, buildGroupSystem(group, char), apiMsgs)
}

export async function runGroupTurn(groupId, { onTyping } = {}) {
  const s0 = getState()
  const group = s0.groups.find((g) => g.id === groupId)
  if (!group) throw new Error('群不存在')
  if (!apiReady()) throw new Error('NO_API')
  grabLuckyRedpacket(groupId)
  autoClaimDesignated(groupId)
  const chars = s0.characters
  const muted = (id) => ((group.muted && group.muted[id]) || 0) > Date.now()
  const candidates = group.memberIds.map((id) => chars.find((c) => c.id === id)).filter(Boolean).filter((c) => !muted(c.id))
  const msgs = groupMsgsOf(groupId)
  const last = [...msgs].reverse().find((m) => !m.recalled && m.type !== 'sys')
  const atNames = last && last.type === 'text' ? extractAt(last.content) : []
  let responders = []
  for (const c of candidates) {
    const will = (group.settings && group.settings.willMap && group.settings.willMap[c.id])
    const willNum = typeof will === 'number' ? will : 60
    const nm = gMemberName(group, c)
    if (atNames.some((n) => n === nm || n === c.name)) {
      responders.push(c)
      continue
    }
    if (Math.random() * 100 < willNum) responders.push(c)
  }
  responders.sort(() => Math.random() - 0.5)
  const limit = (group.settings && group.settings.replyLimit) || 3
  responders = responders.slice(0, limit)
  const replied = []
  const errors = []
  for (const c of responders) {
    await sleep(700 + Math.random() * 1900)
    onTyping && onTyping(c.id, true)
    try {
      const fresh = getState()
      const g2 = fresh.groups.find((g) => g.id === groupId)
      const apiMsgs = groupAPIHistory(g2, groupMsgsOf(groupId), c.id)
      const text = await chatCompleteWith(c, buildGroupSystem(g2, c), apiMsgs)
      pushGroupMsg(groupId, { senderType: 'char', senderId: c.id, type: 'text', content: text })
      replied.push(c.id)
      checkPasswordRedpacket(groupId, text)
      autoClaimDesignated(groupId)
      checkSensitive(groupId, c.id, text)
    } catch (e) {
      errors.push(`${c.name}: ${e.message}`)
    } finally {
      onTyping && onTyping(c.id, false)
    }
  }
  if (errors.length) throw new Error(errors.join('；'))
  return replied
}

export function checkSensitive(groupId, charId, text) {
  if (!text) return false
  const s = getState()
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) return false
  const words = g.sensitiveWords || []
  if (!words.length) return false
  const hit = words.find((w) => w && text.includes(w))
  if (!hit) return false
  const c = s.characters.find((x) => x.id === charId)
  const name = c ? gMemberName(g, c) : '有人'
  setState((st) => ({
    groups: st.groups.map((x) =>
      x.id === groupId ? { ...x, muted: { ...(x.muted || {}), [charId]: Date.now() + 5 * 60 * 1000 } } : x
    ),
  }))
  const msgs = groupMsgsOf(groupId)
  const lastCharMsg = [...msgs].reverse().find((m) => m.senderType === 'char' && (m.senderId === charId || m.fromCharId === charId))
  if (lastCharMsg) patchGroupMsg(groupId, lastCharMsg.id, { recalled: true })
  pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `群管家：${name} 的发言触发敏感词「${hit}」，该消息已撤回并禁言5分钟` })
  return true
}

export function checkPasswordRedpacket(groupId, text) {
  const msgs = groupMsgsOf(groupId)
  for (const m of msgs) {
    if (m.type !== 'redpacket' || m.recalled) continue
    const meta = m.meta || {}
    if (meta.kind !== 'password' || !meta.password) continue
    if ((meta.claims || []).length) continue
    if (!text || !text.includes(meta.password)) continue
    const g = getState().groups.find((x) => x.id === groupId)
    const c = getState().characters.find((x) => x.id === m.senderId)
    const name = c ? gMemberName(g, c) : '有人'
    const claims = [...(meta.claims || []), { name, key: m.senderId, amount: meta.amount, ts: Date.now() }]
    patchGroupMsg(groupId, m.id, { meta: { ...meta, claims } })
    pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `${name}说出了口令，领走了红包` })
    return
  }
}

export function grabLuckyRedpacket(groupId) {
  const s = getState()
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) return
  const msgs = groupMsgsOf(groupId)
  const rp = [...msgs].reverse().find((m) => m.type === 'redpacket' && !m.recalled && !m.grabDone && (m.meta || {}).kind === 'lucky')
  if (!rp) return
  const meta = rp.meta
  if ((meta.claims || []).length) return
  const members = g.memberIds.map((id) => s.characters.find((c) => c.id === id)).filter(Boolean)
  if (rp.senderType === 'user' && !rp.fromCharId) {
    const grabbers = members.filter((c) => {
      const will = (g.settings && g.settings.willMap && g.settings.willMap[c.id])
      const willNum = typeof will === 'number' ? will : 60
      return Math.random() * 100 < willNum * 0.8
    })
    const n = grabbers.length
    if (!n) return
    const pool = Math.round(meta.amount * (0.3 + Math.random() * 0.6) * 100) / 100
    const cuts = []
    let rest = pool
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? rest : Math.max(0.01, Math.round((rest / (n - i)) * (0.4 + Math.random() * 1.3) * 100) / 100)
      const amt = Math.min(rest, Math.round(v * 100) / 100)
      cuts.push(amt)
      rest = Math.round((rest - amt) * 100) / 100
    }
    const claims = grabbers.map((c, i) => ({ name: gMemberName(g, c), key: c.id, amount: cuts[i], ts: Date.now() }))
    patchGroupMsg(groupId, rp.id, { grabDone: true, meta: { ...meta, claims } })
    claims.forEach((c) => {
      setState((st) => ({
        characters: st.characters.map((x) => (x.id === c.key ? { ...x, balance: (x.balance || 0) + c.amount } : x)),
      }))
    })
    pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `红包被抢了一波：${claims.map((c) => `${c.name}¥${c.amount}`).join('、')}` })
  }
}

export function autoClaimDesignated(groupId) {
  const s = getState()
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) return
  const msgs = groupMsgsOf(groupId)
  for (const m of msgs) {
    if (m.type !== 'redpacket' || m.recalled) continue
    const meta = m.meta || {}
    if (meta.kind !== 'designated' || !meta.to || (meta.claims || []).length) continue
    if (meta.to === 'user' || meta.to.startsWith('user:')) continue
    if (s.characters.find((c) => c.id === meta.to)) {
      const c = s.characters.find((x) => x.id === meta.to)
      patchGroupMsg(groupId, m.id, { meta: { ...meta, claims: [{ name: gMemberName(g, c), key: c.id, amount: meta.amount, ts: Date.now() }] } })
      setState((st) => ({
        characters: st.characters.map((x) => (x.id === c.id ? { ...x, balance: (x.balance || 0) + (meta.amount || 0) } : x)),
      }))
      pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `${gMemberName(g, c)}领取了专属红包 ¥${meta.amount}` })
    }
  }
}

export function runRedpacketExpiry(groupId) {
  const s = getState()
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) return
  const msgs = groupMsgsOf(groupId)
  for (const m of msgs) {
    if (m.type !== 'redpacket' || m.recalled || m.expiredHandled) continue
    const meta = m.meta || {}
    if (meta.expireAt && Date.now() > meta.expireAt && (meta.claims || []).length === 0) {
      patchGroupMsg(groupId, m.id, { expiredHandled: true })
      if (m.senderType === 'user') {
        setState((st) => ({
          wallet: { ...st.wallet, balance: st.wallet.balance + (meta.amount || 0) },
        }))
        pushGroupMsg(groupId, { senderType: 'system', type: 'sys', content: `红包24小时没人领，¥${meta.amount}已退回你的钱包` })
      }
    }
  }
}

export function maybeGroupDM(groupId) {
  const s = getState()
  const g = s.groups.find((x) => x.id === groupId)
  if (!g || g.mode !== 'with-user') return null
  const prob = (g.settings && g.settings.dmProb)
  const probNum = typeof prob === 'number' ? prob : 15
  if (Math.random() * 100 >= probNum) return null
  const lastDM = (g.lastDMAt || 0)
  if (Date.now() - lastDM < 10 * 60 * 1000) return null
  const chars = g.memberIds.map((id) => s.characters.find((c) => c.id === id)).filter(Boolean)
  if (!chars.length) return null
  const char = chars[Math.floor(Math.random() * chars.length)]
  setState((st) => ({
    groups: st.groups.map((x) => (x.id === groupId ? { ...x, lastDMAt: Date.now() } : x)),
  }))
  return char
}

export async function generateGroupDM(group, char) {
  const msgs = groupMsgsOf(group.id)
  const apiMsgs = groupAPIHistory(group, msgs, char.id)
  const text = await chatCompleteWith(
    char,
    buildGroupSystem(group, char) + `\n\n【特殊情况】刚才群里的内容让你憋不住了，你想私下找用户本人聊（只有你们俩能看到）。现在直接输出你要私聊发的第一条消息正文。`,
    apiMsgs
  )
  return text
}

export function deleteGroup(groupId) {
  setState((s) => {
    const chats = { ...s.groupChats }
    delete chats[groupId]
    return { groups: s.groups.filter((g) => g.id !== groupId), groupChats: chats }
  })
}
