import { useCallback, useEffect, useState } from 'react'
import { useStore, setState } from './core/store'
import { useUIProvider } from './core/nav'
import { ToastHost } from './core/ToastHost'
import StatusBar from './components/StatusBar'
import BottomNav from './components/BottomNav'
import RenameModal from './components/RenameModal'
import LockScreen from './screens/LockScreen'
import Desktop from './screens/Desktop'
import About from './screens/About'
import Construction from './screens/Construction'
import Settings from './screens/Settings'
import ChatList from './screens/ChatList'
import Roster from './screens/Roster'
import CharacterForm from './screens/CharacterForm'
import CharacterDetail from './screens/CharacterDetail'
import Chat from './screens/Chat'
import ApiConfig from './screens/ApiConfig'
import Wallet from './screens/Wallet'
import GroupForm from './screens/GroupForm'
import GroupChat from './screens/GroupChat'
import GroupManage from './screens/GroupManage'

const CONSTRUCTION_MAP = {
  forum: { module: '论坛', icon: 'globe', batch: '第五批' },
  moments: { module: '朋友圈', icon: 'camera', batch: '第三批' },
}

export default function App() {
  const { settings } = useStore()
  const [stack, setStack] = useState([{ name: 'lock' }])
  const route = stack[stack.length - 1]
  const locked = route.name === 'lock'

  const navigate = useCallback((name, params = {}) => {
    setStack((s) => [...s, { name, params }])
  }, [])
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])
  const switchTab = useCallback((id) => {
    setStack([{ name: id, tab: id }])
  }, [])

  const ui = useUIProvider({ navigate, back, route, switchTab })

  /* 全局字号缩放 (设置页 0.8~1.2 将作用于 --font-scale) */
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale || 1))
  }, [settings.fontScale])

  /* 锁屏解锁回调 (LockScreen 通过 window.__ksUnlock 触发, 避免拖拽事件冒泡干扰) */
  useEffect(() => {
    window.__ksUnlock = () => {
      setStack([{ name: 'desktop', tab: 'desktop' }])
    }
    return () => {
      delete window.__ksUnlock
    }
  }, [])

  let screen = null
  if (route.name === 'lock') screen = <LockScreen />
  else if (route.name === 'desktop') screen = <Desktop />
  else if (route.name === 'about') screen = <About />
  else if (route.name === 'settings') screen = <Settings />
  else if (route.name === 'chat') screen = <ChatList />
  else if (route.name === 'roster') screen = <Roster />
  else if (route.name === 'char-create') screen = <CharacterForm />
  else if (route.name === 'char-detail') screen = <CharacterDetail />
  else if (route.name === 'chat-view') screen = <Chat />
  else if (route.name === 'api-config') screen = <ApiConfig />
  else if (route.name === 'wallet') screen = <Wallet />
  else if (route.name === 'group-form') screen = <GroupForm />
  else if (route.name === 'group-chat') screen = <GroupChat />
  else if (route.name === 'group-manage') screen = <GroupManage />
  else if (CONSTRUCTION_MAP[route.name]) {
    const meta = CONSTRUCTION_MAP[route.name]
    screen = <Construction key={route.name} module={meta.module} icon={meta.icon} batch={meta.batch} />
  } else {
    screen = <Construction key={route.name + JSON.stringify(route.params || {})} />
  }

  return (
    <div className="stage">
      <div className="phone">
        <div className="screen">
          <StatusBar />
          <div className="screen-body">
            {screen}
            {!locked && <BottomNav />}
          </div>
        </div>
        <ToastHost />
        <RenameModal />
      </div>
    </div>
  )
}
