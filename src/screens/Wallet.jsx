import { useState } from 'react'
import { Icon } from '../core/icons'
import { PageTopNav } from '../components/TopNav'
import { useUI, pad2 } from '../core/nav'
import { setState } from '../core/store'
import { toast } from '../core/toast'
import { uid } from '../core/media'
import { useStore } from '../core/store'

const TYPE_LABEL = {
  income: '入账',
  transfer: '转出',
  redpacket: '红包',
}

export default function Wallet() {
  const { back } = useUI()
  const { wallet } = useStore()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const income = () => {
    const a = Math.round(parseFloat(amount) * 100) / 100
    if (!(a > 0)) return toast('金额得大于 0', 'error')
    setBusy(true)
    setState((s) => ({
      wallet: {
        balance: +(s.wallet.balance + a).toFixed(2),
        transactions: [{ id: uid(), type: 'income', amount: a, note: '手动入账', ts: Date.now() }, ...s.wallet.transactions],
      },
    }))
    setAmount('')
    setTimeout(() => { setBusy(false); toast(`已入账 ¥${a.toFixed(2)}`, 'success') }, 200)
  }

  return (
    <div className="page page-enter">
      <PageTopNav title="钱包" />
      <div className="scroll-area page-body">
        <div className="glass-card about-card" style={{ cursor: 'default' }}>
          <div className="hint-text ls-en-cap">BALANCE</div>
          <div className="fs-giant ls-cn-num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
            ¥{wallet.balance.toFixed(2)}
          </div>
        </div>

        <div className="income-row">
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="模拟到账金额"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="btn" onClick={income} disabled={busy}>
            <Icon name="plus" size={15} />
            入账
          </button>
        </div>
        <div className="hint-text" style={{ padding: '0 4px' }}>这个世界没有银行，钱从你自己手里来。</div>

        {wallet.transactions.length === 0 ? (
          <div className="empty-state">
            <Icon name="wallet" size={26} className="empty-icon" />
            <div className="hint-text">还没有流水</div>
          </div>
        ) : (
          <div className="group-card">
            {wallet.transactions.map((t) => {
              const out = t.type === 'transfer' || t.type === 'redpacket'
              const d = new Date(t.ts)
              return (
                <div className="row" key={t.id} style={{ cursor: 'default' }}>
                  <span className="row-ico"><Icon name={t.type === 'income' ? 'download' : 'upload'} size={16} /></span>
                  <div className="row-text" style={{ flex: 1 }}>
                    <div className="fs-body">{TYPE_LABEL[t.type]}{t.charName ? ` · ${t.charName}` : ''}</div>
                    <div className="hint-text">
                      {t.note || '—'} · {d.getMonth() + 1}月{d.getDate()}日 {pad2(d.getHours())}:{pad2(d.getMinutes())}
                    </div>
                  </div>
                  <span className="fs-body" style={{ color: out ? '#ff9d9d' : '#7ee2a8', fontFamily: 'var(--font-mono)' }}>
                    {out ? '-' : '+'}¥{t.amount.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
