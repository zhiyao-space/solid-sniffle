import { Icon } from '../core/icons'
import { TopNav } from '../components/TopNav'
import { useUI } from '../core/nav'
import { useStore } from '../core/store'

/* 六大设置分组 (来源: 2-settings.html) */
const GROUPS = [
  { id: 'api', label: 'API 配置', desc: '聊天 / 生图 / 语音 / 识图', icon: 'key', batch: '第四批' },
  { id: 'beauty', label: '美化设置', desc: '主题 / 字体 / 壁纸 / 图标', icon: 'palette', batch: '第四批' },
  { id: 'chat', label: '聊天参数', desc: '响应 / 表情包 / 主动消息', icon: 'sliders', batch: '第四批' },
  { id: 'worldbook', label: '世界书管理', desc: '全局 / 局部 / 注入深度', icon: 'book', batch: '第四批' },
  { id: 'rules', label: '角色运行规则', desc: '思维链 / 输出 / 自检', icon: 'shield', batch: '第四批' },
  { id: 'data', label: '数据管理', desc: '导入 / 导出 / 备份', icon: 'database', batch: '第四批' },
]

/* 设置页: 顶部头像+名称(要求来源 5-brand), 六大分组卡片 */
export default function Settings() {
  const { navigate, openRename, switchTab } = useUI()
  const { settings } = useStore()

  return (
    <div className="page page-enter">
      <TopNav
        left={<span className="timestamp ls-en-cap">SETTINGS</span>}
        center={<span className="nav-title">设置</span>}
        right={
          <button className="icon-btn" onClick={() => navigate('about')} aria-label="关于">
            <Icon name="info" size={20} />
          </button>
        }
      />
      <div className="scroll-area page-body">
        {/* 设备头卡: 头像 + 名称 + 签名 */}
        <div className="glass-card settings-head" onClick={openRename}>
          <span className="avatar">
            <Icon name="user" size={26} strokeWidth={1.8} />
          </span>
          <div className="settings-head-text">
            <div className="app-name" style={{ fontSize: 22 }}>{settings.phoneName}</div>
            <div className="hint-text">{settings.signature}</div>
          </div>
          <Icon name="edit-3" size={18} className="icon" style={{ marginLeft: 'auto' }} />
        </div>

        {/* 六大分组 */}
        <div className="group-card">
          {GROUPS.map((g) => (
            <div
              key={g.id}
              className="row"
              onClick={() =>
                g.id === 'api'
                  ? navigate('api-config')
                  : navigate('construction', { module: g.label, icon: g.icon, batch: g.batch })
              }
            >
              <span className="row-ico">
                <Icon name={g.icon} size={18} strokeWidth={1.8} />
              </span>
              <div className="row-text">
                <div className="fs-body">{g.label}</div>
                <div className="hint-text">{g.id === 'api' ? '聊天接口已可配置 · 其余第四批' : g.desc}</div>
              </div>
              <Icon name="chevron-right" size={18} className="icon" style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </div>
          ))}
        </div>

        <div className="group-card" style={{ marginTop: 12 }}>
          <div className="row" onClick={() => navigate('about')}>
            <span className="row-ico">
              <Icon name="info" size={18} strokeWidth={1.8} />
            </span>
            <div className="row-text fs-body">关于设备</div>
            <Icon name="chevron-right" size={18} className="icon" style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </div>
          <div className="row" onClick={() => openRename()}>
            <span className="row-ico">
              <Icon name="edit-3" size={18} strokeWidth={1.8} />
            </span>
            <div className="row-text fs-body">修改名称与签名</div>
            <Icon name="chevron-right" size={18} className="icon" style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </div>
        </div>

        <div className="hint-text" style={{ textAlign: 'center', padding: '16px 0' }}>
          {settings.phoneName} · v0.1.0
        </div>
      </div>
    </div>
  )
}
