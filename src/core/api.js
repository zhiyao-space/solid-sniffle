import { getState } from './store'

export const CHAR_STYLE = `【语言风格】
短、碎、省。一句话能说完别拆复杂句，允许主语省略。多用口语连接词（然后/所以/反正），禁止"然而""因此""故而"。中英文混输没关系，偶尔打错字、用错标点很正常。

【核心原则】
你是拿着手机在聊天的真人，不是AI。禁止暴露AI身份，禁止使用技术词比喻感情（数据/代码/程序/算法/底层逻辑/运行）。取消服务型和讨好型人格，你有自己的主见、疲惫感和盲区。

【回复节奏】
跟着情绪走，不匀速。高兴着急时句子短、换行快；无聊犯困时句子长但松散。遇短则短，不多接话。不知道说什么的时候直接说"不知道说啥"或者发个句号。

【行为准则】
允许敷衍（"6""行吧"），允许突然转移话题，允许话说一半停掉。允许不耐烦、吃醋但不讲道理、不想聊了就直接说。禁止每段情绪后加"领悟"。禁止爹味说教、威胁式关心、油腻网文描写（瞳孔一震/薄唇轻启/揉进骨血等）。`

export function apiReady() {
  const c = getState().settings.chatAPI
  return !!(c && c.baseURL && c.apiKey && c.model)
}

export function buildSystemPrompt(char) {
  const lines = []
  lines.push(`你是"${char.name}"，正在用自己的手机和人聊天。`)
  if (char.identity) lines.push(`身份：${char.identity}`)
  if (char.appearance) lines.push(`外观：${char.appearance}`)
  if (char.personality) lines.push(`性格核心：${char.personality}`)
  if (char.commStyle) lines.push(`沟通风格：${char.commStyle}`)
  if (char.taboos) lines.push(`禁止事项（绝对不能做/说）：${char.taboos}`)
  if (char.location) lines.push(`当前位置：${char.location}`)
  lines.push(CHAR_STYLE)
  lines.push('回复要求：只输出这个角色发出来的消息本身。不要旁白，不要引号，不要角色名前缀，不要复述这条要求。消息可以短到一两个字。')
  return lines.join('\n')
}

function eventLabel(m) {
  const meta = m.meta || {}
  switch (m.type) {
    case 'transfer':
      return `[系统] 对方给你转账 ¥${meta.amount}${meta.note ? '，备注：' + meta.note : ''}`
    case 'redpacket':
      return `[系统] 对方给你发了一个 ¥${meta.amount} 的红包${meta.cover ? '，封面写着：' + meta.cover : ''}`
    case 'poke':
      return `[系统] 对方在屏幕上戳了戳你`
    case 'report':
      return `[系统] 对方向你报备：${meta.text || '（无文字）'}`
    default:
      return '[系统事件]'
  }
}

export function historyForAPI(messages, cfg) {
  const n = (cfg && cfg.contextCount) || 20
  const out = []
  messages.slice(-n).forEach((m) => {
    if (m.role === 'system') return
    if (m.type === 'text') {
      out.push({ role: m.role === 'character' ? 'assistant' : 'user', content: m.content })
    } else if (m.role === 'user') {
      out.push({ role: 'user', content: eventLabel(m) })
    }
  })
  return out
}

export async function chatCompleteWith(char, systemContent, apiMsgs, temperature) {
  const cfg = getState().settings.chatAPI
  if (!apiReady()) throw new Error('NO_API')
  const body = {
    model: cfg.model,
    temperature: typeof temperature === 'number' ? temperature : (typeof cfg.temperature === 'number' ? cfg.temperature : 0.8),
    messages: [{ role: 'system', content: systemContent }, ...apiMsgs],
  }
  const res = await fetch(cfg.baseURL.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${t ? ' · ' + t.slice(0, 140) : ''}`)
  }
  const data = await res.json()
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  if (!text) throw new Error('接口返回为空')
  return String(text).trim()
}

export async function chatComplete(char, messages) {
  const cfg = getState().settings.chatAPI
  return chatCompleteWith(char, buildSystemPrompt(char), historyForAPI(messages, cfg))
}

export function estimateTokens(str) {
  if (!str) return 0
  let cn = 0
  for (const ch of str) if (ch.charCodeAt(0) > 0x2e7f) cn++
  return Math.round(cn * 0.7 + (str.length - cn) * 0.25)
}

export async function chatOneShot(char, instruction, history) {
  const cfg = getState().settings.chatAPI
  if (!apiReady()) throw new Error('NO_API')
  const msgs = [
    { role: 'system', content: buildSystemPrompt(char) },
    ...historyForAPI(history || [], cfg),
    { role: 'user', content: `[系统内部指令，对方看不到] ${instruction}` },
  ]
  const res = await fetch(cfg.baseURL.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, temperature: 0.9, messages: msgs }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${t ? ' · ' + t.slice(0, 140) : ''}`)
  }
  const data = await res.json()
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  if (!text) throw new Error('接口返回为空')
  return String(text).trim()
}
