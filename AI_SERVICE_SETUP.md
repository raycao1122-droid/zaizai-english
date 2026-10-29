# 在在 AI 英语课堂：实时语音配置指南

> 最新规则：课堂中已删除全部服务管理表单。以下是管理员后台的历史配置说明，不能再引导学生到课堂填写 Key、后端地址或口令。当前后台操作及一次性设备授权见 [ADMIN_OPERATIONS.md](ADMIN_OPERATIONS.md)。

当前代码位于原项目 `/workspace/zaizai-english`，分支 `m3-text-integration`。本轮没有创建云服务、购买资源或发布新版前端。原 GitHub Pages 网站仍为已验收的 M2。

## 先知道填在哪里

**阿里云长期 API Key 只填在后端的环境变量 `DASHSCOPE_API_KEY`，不要填在网页、聊天、GitHub Pages 或 GitHub 仓库里。**

网页入口：右侧「课堂对话」→「AI 服务配置」，或顶部右侧头像按钮打开的「课堂设置」→「AI 服务配置」。右侧顶部小下拉框选择语音厂商，默认通义千问；刷新保留选择。会话连接中和已连接时禁止切换，断开后可选下次模型。豆包、OpenAI Realtime 为未接入的接口预留，不会使用模拟回复冒充可用模型。

配置页的「课堂访问口令」填写你自己设置的 `CLASSROOM_ACCESS_CODE`，它不是厂商 API Key。这个口令用来限制谁能调用你的后端。验证后返回30分钟的随机访问令牌，仅保留在当前页面内存中，刷新即失效。

## 百炼申请与地域

1. 登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)，按[官方获取 API Key 指南](https://help.aliyun.com/zh/model-studio/get-api-key)开通对应服务。
2. 选择地域、业务空间，在「API Key」中创建 Key。按控制台当前显示的空间信息取得**业务空间 ID**。不是阿里云账号 ID，也不是模型 ID。
3. 本实现支持 `cn-beijing`（北京，默认）和 `ap-southeast-1`（新加坡）。Key、业务空间和地域必须一致。确认该业务空间有 `qwen3.8-omni-flash-realtime` 模型调用权限；不要自行换成普通文字模型。
4. 核对控制台的模型计费、可用额度及用量限制。是否有免费额度以你的账号为准，项目不会自动充值或开启付费资源。

本轮未取得百炼 Key/业务空间，也没有进行真实百炼语音调用。

## 最小安全架构

```text
GitHub Pages React 页面（HTTPS）
   → HTTPS：读取配置 / 课堂口令验证 / 获取单次短效语音票据
   → WSS：音频与字幕（浏览器不持有厂商 Key）
独立 Node 24 后端（WebSocket 中转）
   → WSS + Authorization: Bearer [服务器内的 Key]
阿里云百炼
```

- 原 React + TypeScript + Vite 技术栈保留；后端沿用原 M3 Node 服务，增加 `ws` 和代理支持，无数据库。
- Key 不经任何接口返回，不写入日志，不进入 Vite 构建；只有后端向对应厂商发送。
- 后端校验网页 Origin、访问口令、30分钟访问令牌及30秒单次 WebSocket 票据；限制请求体、音频速率、单个并发会话和10分钟会话时长，断开即终止上游。
- 这是家庭试用的最小服务，不是多租户账号系统。不要把课堂口令公开发布；网站截图和日志中也不要包含口令或票据。
- 浏览器只持久化模型 ID 和公开后端地址，不保存口令、访问令牌、厂商 Key 或音频。音频经后端实时转发，不落盘；最终字幕留在本次课堂页面，刷新后清空。厂商对数据的处理以其服务条款为准。
- 真实语音与现有文字通道共用 Emma 设定、当前课堂和本页记录。后端不开放工具调用或课程写接口，模型不能改变课程、教材或学习档案。模拟历史报告不会当成真实学习证据。

## 后端部署候选：Render Free Web Service（尚未创建）

选择原因：可运行现有 Node HTTP/WebSocket 服务，提供 HTTPS/WSS，前端继续放 GitHub Pages。仓库提供 `render.yaml` 供检查，**不要在确认前创建服务**。本轮没有调用部署、购买或付费开通操作。

按本轮查阅的 [Render Free 文档](https://render.com/docs/free)：Free Web Service 每个 workspace 每月共享750运行小时，闲置15分钟会休眠，唤醒约需1分钟。包含的带宽、构建额度和超额规则以 [Pricing](https://render.com/pricing) 及账户页面为准；免费服务可能要求账户验证，不能保证免绑卡或长期免费。模型费用由百炼另行计算；实时会话上下文、音频输入、音频与对应文本输出可能计费。跨境网络质量也需要实机验证。

确认后需要你完成的操作：

1. 先确认允许发布本分支代码。当前本地分支尚未推送；Render 必须能读取这份分支代码，不要部署旧 `main` 冒充新功能。
2. 登录 Render → **New → Web Service**，连接现有 `raycao1122-droid/zaizai-english` 仓库，选择新代码所在分支。Runtime 选 Node，Instance Type 明确选择 **Free**；如果页面不提供 Free，停止创建，先核对费用。
3. Build Command：`npm ci --omit=dev`；Start Command：`npm run start:api`；Node 版本24。关闭自动部署。服务启动时绑定 `0.0.0.0`，使用平台提供的 `PORT`。
4. 在该服务的 **Environment → Add Environment Variable** 中逐项添加以下变量，敏感值只在平台安全输入框填写。已有服务修改后选保存并重新部署，让进程读取新值。[官方环境变量说明](https://render.com/docs/configure-environment-variables)。

| 环境变量 | 填写内容 | 是否秘密 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 百炼生成的完整 Key | 是，只在后端 |
| `DASHSCOPE_WORKSPACE_ID` | 上述地域下的业务空间 ID | 服务器配置 |
| `DASHSCOPE_REGION` | `cn-beijing` 或 `ap-southeast-1` | 否 |
| `CLASSROOM_ACCESS_CODE` | 自设至少16位、至多128位的独立随机课堂口令；不要复用 API Key | 是 |
| `ALLOWED_ORIGINS` | `https://raycao1122-droid.github.io`（**不带** `/zaizai-english/`） | 否 |
| `CLASSROOM_HOST` | `0.0.0.0` | 否 |
| `NODE_ENV` | `production` | 否 |
| `NODE_VERSION` | `24` | 否 |

5. 创建服务属于部署动作，须在你确认后进行。部署就绪后取得形如 `https://你的服务.onrender.com` 的地址。
6. 发布新版前端后，在「AI 服务配置」→「语音后端地址」填写这个 HTTPS 根地址，点击保存；点击「刷新配置」。此时显示“待测试”，并不表示通话已验收。
7. 填写**独立课堂访问口令**→「验证访问口令」→「测试连接」。测试只建立百炼会话并配置，然后立即断开，不申请麦克风；仍可能产生厂商费用。
8. 测试通过后点「连接真实语音」，允许浏览器麦克风。主动连接才会录音；静音停止发送音频并停止 Emma 播放；暂停、退出、重置会断开并释放麦克风。恢复课堂后需要主动重新连接。网络断开同样不会偷偷重连或持续录音。

可选：若想给所有设备预设同一个公开后端地址，在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables → New repository variable**，名称 `CLASSROOM_API_URL`，值为公开 HTTPS 后端根地址。Pages 工作流把这个公开地址作为 `VITE_CLASSROOM_API_URL` 构建。**不要把任何厂商 Key 添加到这个变量或 Pages 工作流里。** 单独在网页保存地址不需要重建前端。

## 先在当前 Codex 云环境试配（不创建公网服务）

在云环境设置的「网络密钥 → 管理」添加 `DASHSCOPE_API_KEY`，仅注入后端环境变量。若要求允许域名，使用该业务空间实际调用域名，例如 `[业务空间ID].cn-beijing.maas.aliyuncs.com`（将方括号内容替换为真实 ID，不保留括号）。另在「环境变量」配置 `DASHSCOPE_WORKSPACE_ID`、`DASHSCOPE_REGION`；`CLASSROOM_ACCESS_CODE` 也作为网络密钥/安全环境变量配置。保存并应用后重启 API 进程。

本机运行可在 Git 忽略的 `.env.local` 中填写后端变量，参照 `.env.example`；不要使用 `VITE_` 前缀保存任何秘密。终端执行：

```bash
npm ci
npm run dev:api
# 另开终端
npm run dev -- --port 5173 --strictPort
```

Vite 开发代理将 `/api` 转发给 `127.0.0.1:8787`。本地配置页后端地址留空。云端的 loopback 地址不是你电脑/手机可访问的公网测试链接；公网使用须完成上面的独立后端部署。GitHub Pages 不能运行 Node 服务。

## 已核对的官方协议（2026-10-29）

- [Qwen-Omni-Realtime 指南](https://help.aliyun.com/zh/model-studio/realtime)：当前优先模型 `qwen3.8-omni-flash-realtime`，音色 `Tina`；已按文档核对，不使用猜测的旧型号。
- [Realtime 协议概述](https://help.aliyun.com/zh/model-studio/realtime-api-overview)：WebSocket / WebRTC / AOQ；本轮选 WebSocket 方便服务器保管 Key、限制时长并主动关闭上游。WebSocket 弱网体验需实测；客户端申请回声消除、降噪，不保证所有设备都支持。
- 北京 WebSocket：`wss://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime?model=qwen3.8-omni-flash-realtime`；新加坡将地域改为 `ap-southeast-1`。鉴权：请求头 `Authorization: Bearer DASHSCOPE_API_KEY`，只由后端发送。
- 官方 WebRTC 信令是 `POST https://{WorkspaceId}.{region}.maas.aliyuncs.com/api/v1/webrtc/realtime?model=...`，`application/sdp`，返回 Answer SDP。本轮**没有**实现 WebRTC 通道，不把它与 WebSocket 的 PCM 事件混用。
- [客户端事件](https://help.aliyun.com/zh/model-studio/client-events)：`session.update`，嵌套 `audio.input.format`（16kHz、s16le、单声道PCM）及 `audio.output.format`（24kHz PCM）；输入转录固定 `qwen3-asr-flash-realtime`；`semantic_vad`，当前初始静默阈值1200ms，需在孩子真实停顿场景调校。
- [服务端事件](https://help.aliyun.com/zh/model-studio/server-events)：输入转录增量/完成、`response.audio.delta`、`response.audio_transcript.delta/done`、语音开始/结束等。字幕只来自实际事件；自然打断清除浏览器播放队列，停止旧回复，等待新轮次音频。

## 连接失败怎么看

- **未配置**：后端没有 Key、有效业务空间/地域，或没有至少16位课堂口令。
- **后端未连接**：地址未部署/填写错误、免费实例休眠、网络问题；检查 HTTPS 地址，唤醒后再次刷新。
- **访问口令无效/过期**：填写你自己设置的课堂口令，重新验证；不是填 API Key。
- **百炼鉴权失败**：检查 Key 是否有效、地域/业务空间是否一致、模型权限。
- **额度或并发受限**：到百炼核对余额和额度；本服务同时只允许一场真实语音或测试。
- **麦克风权限被拒绝**：在浏览器网站权限里允许麦克风；必须 HTTPS 或本机 localhost。
- **连接中断**：页面明确提示并释放麦克风。恢复网络后手动“重新连接”；沿用当前课程和最近本页对话，但不会重放丢失的音频，也不能保证恢复厂商原会话内部状态。

## 等你配置后的真实验收

说 `It's a dog.`、`I like cats.`；中文说“我不会，帮我一下”；中英文混说；句中短暂停顿后继续；Emma 说话时插话；静音/取消、暂停/继续、退出、断网/恢复。

这些场景需要真实 Key、浏览器权限、麦克风/扬声器和可访问的后端。本轮合成设备和本地协议测试不能证明真实识别准确率、语音自然度或自然打断质量。安卓安装包/WebView 的录音权限与兼容性尚未验证；本轮未封装 APK。发音评分、人物口型、学习数据云同步仍未实现。


## 用户已授权部署后的状态

用户已明确要求部署。新版前端将通过 main 发布至原 GitHub Pages；Render 模板已指向 main，使用 Free 计划、关闭自动部署。此执行环境没有 Render 账号授权或 API token，无法代登录或实际创建该服务。使用官方创建入口：https://render.com/deploy?repo=https://github.com/raycao1122-droid/zaizai-english 。该入口不会携带任何 Key 或口令；用户须登录自己的 Render 账号，并在其安全配置表单填写三个 sync:false 字段。Codex 云环境中的网络密钥不会自动同步到 Render，不能把平台代理占位值当成真实 Key 复制到别的平台。
