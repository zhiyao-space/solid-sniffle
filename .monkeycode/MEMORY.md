# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
- Date: YYYY-MM-DD
- Context: scenario
- Instructions: line by line

## Entries

[User Instruction Summary]
- Date: 2026-09-25
- Context: "空蚀纪"小手机App开发启动时用户提出的协作规则
- Instructions:
  - 分批次开发，每完成一批必须停下来等用户验收，验收通过后才继续下一批
  - 每个功能必须有真实 UI 和交互逻辑，禁止只写 CSS 样式描述
  - 所有按钮可点击、有视觉反馈、有数据写入（localStorage/IndexedDB）
  - 字体必须按四层级方案：T1 书法体(Ma Shan Zheng)手机名 24-32px/700、T2 Noto Sans SC 导航标题 14-18px/600、T3 PingFang SC 正文 13-15px/400、T4 Share Tech Mono 辅助时间戳 11-12px/300
  - 手机名称"空蚀纪"必须显示在：顶部导航栏中央、锁屏底部、设置页顶部头像区；名称可点击跳关于页、长按弹出改名弹窗并持久化
  - 【核心原则·最高优先级】一切内容由用户创作，系统零内置：名册/通讯录只允许空状态+"创建你的第一个角色"提示；创建角色所有字段（昵称/身份/外观/性格核心/沟通风格/禁止事项等）全由用户填写；禁止内置示例对话/模板对话/快捷回复/预设开场白/预设角色头像姓名人设；聊天/朋友圈/论坛/记录页空状态即真空，不塞示例数据
  - 【角色回复风格】角色生成对话必须注入 .monkeycode/docs/specs/6-char-style.md 的规范（短碎省口语/不暴露AI身份/禁技术词比喻/禁网文腔），此文件是用户提供的原始规范，组装 system prompt 时原样引用

[Project Knowledge Summary]
- Date: 2026-09-25
- Context: Agent 初始化项目时整理
- Category: Build Methods / Operations & Deployment
- Instructions:
  - 技术栈：Vite + React 18，纯 JSX，无路由库（App.jsx 内 stack 状态路由），无状态库（src/core/store.js 自研 useSyncExternalStore + localStorage 直写）
  - 开发服务器：npm run dev（端口 5173，已配置 allowedHosts .monkeycode-ai.online）
  - 代码仓库：https://github.com/zhiyao-space/solid-sniffle（origin 已指向此仓库，main 分支，凭据走 git credential helper，改完代码需 commit + push 到这里）
  - 构建验证：npm run build
  - 用户原始需求文档（HTML 编码格式）已复制到 .monkeycode/docs/specs/ 下：1-ui-design / 2-settings / 3-chat / 4-forum / 5-brand-font
  - 批次计划：1 骨架锁屏导航 → 2 聊天核心 → 2.5 群聊核心（已完成：创建/调度引擎/红包投票接龙骰子/权限管理/旁观模式）→ 3 日程/主动消息/分支/朋友圈 → 4 设置中心（聊天参数/表情包管理/美化定制/记忆系统）→ 5 论坛 → 6 论坛扩展+桌面组件
  - 群聊方案中延后到第四批的部分：表情包消息（依赖第四批表情包管理）、语音消息（依赖语音API）、记忆自动总结/手动总结/记忆注入条数（属记忆系统）、美化定制（壁纸/气泡样式/头像形状等属美化中心）；延后不做：角色主动拉人踢人/改自己群昵称（AI自主指令，复杂度高）、红包雨/放烟花/角色卡接龙（可选后续）
