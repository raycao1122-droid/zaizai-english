# Mac 本地继续开发（当前第一单元项目）

迁移现有源码、Emma原始素材、四课教材及完整Git历史，不重建项目。云端对话无法自动变成本机进程；需在Mac的Codex客户端打开下载后的固定项目文件夹，再选择本地任务继续。当前默认L1 Hello, Emma!，Animals仅作保留示例。

## 取得最新项目

先安装 Node.js 24 LTS（至少24.5）：https://nodejs.org/ 。Mac首次使用Git可能提示安装命令行工具，按系统提示完成即可。

打开Mac「终端」，粘贴：

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/raycao1122-droid/zaizai-english.git
cd zaizai-english
bash start-local.command
```

固定目录是 `~/Projects/zaizai-english`。如果此目录已经有项目，不要覆盖或重新clone；进入原目录先用`git status`检查并保存自己的修改，再按需要更新远端分支。旧M1/M2迁移包不包含本轮更新，建议使用仓库最新版本。

启动脚本首次用npm ci安装锁定依赖，随后同时启动本机前端5173与后端8787，打开已临时授权的浏览器课堂。终端保留，按Control+C会一并停止。以后双击根目录start-local.command即可。若Mac阻止双击，在项目终端运行`bash start-local.command`，不要关闭系统保护。

两个服务仅监听127.0.0.1，不暴露给公网。端口冲突不会结束其他程序；可用`ZAIZAI_PORT=5174 ZAIZAI_API_PORT=8788 bash start-local.command`，前端代理和授权来源会同步调整。

## 真实语音的本机配置

课堂和教材在本机运行，真实语音仍需要联网访问百炼。云环境和Render的密钥不会随Git下载，不能声称已经迁移。仅在项目根目录创建 `.env.local`：

```dotenv
DASHSCOPE_API_KEY=在本机填写已有百炼Key
DASHSCOPE_WORKSPACE_ID=在本机填写对应业务空间ID
DASHSCOPE_REGION=cn-beijing
```

不要加VITE_前缀，不要粘贴到聊天、教材或React代码。`.env.local`已被Git忽略；示例文件不是实际凭据。参考`.env.example`，已有配置可保留；本机启动会强制使用回环地址和匹配的前端来源。

停止并重新启动后读取新配置。启动器在内存中生成本机管理口令（如未配置），为浏览器打开一次性授权链接；不让学生填写管理口令或Key，也不打印长期Key。Key不完整时显示尚未配置，不能开始真实语音教学，但仍能查看课件和PDF。没有购买/创建新服务。

本机浏览器与线上是不同来源，线上设备cookie与本机学习记录不会自动迁移；如需旧记录，先在原浏览器导出并保留。本轮未实现学习记录导入/跨设备同步。

## 在Codex电脑端接着做

打开Codex桌面端 → 打开/添加本地项目 → 选择 `~/Projects/zaizai-english`。确认任务执行位置为本地，再发送：

> 继续当前「在在AI英语课堂」已有项目。先读AGENTS.md、LOCAL_DEVELOPMENT.md、UNIT1_DELIVERY.md、UNIT1_ENTRY_FIX.md。保留Emma和整体布局、四课教材、Animals示例及Git历史，不重建项目。使用bash start-local.command启动本机前后端。当前第一单元已接入，口语转写需人工复核，自动发音评分与云同步未实现。先检查本机语音和课程启动问题，真实运行验证后再修改；每项独立修改保存Git。不要读取/打印/提交.env.local中的密钥。

本地修改先Git提交；只有推送到GitHub后才会进入远端发布流程。你电脑的文件不会自动同步进原云端聊天，后续应持续使用该本地项目会话。

## 验证命令

```bash
npm run dev:local
npm run build
npm run test:api
npx playwright install chromium
npm run test:e2e
```

dev:local要求先安装依赖，start-local.command会自动检查安装。仅编辑前端也可npm run dev，但真实语音需要对应的本机后端运行。上述启动器在Linux云环境检查过启动、代理与授权，Mac的Finder/浏览器打开行为仍需实机确认，不能宣称已操作你的电脑。

本轮验证记录：Linux中实际运行本机前后端（独立测试端口5199/8799），Chromium经真实Vite代理交换一次性授权、URL移除授权片段、刷新后签名cookie恢复成功，课程目录确认支持第一单元，首页L1正确；停止启动器后两个测试端口均关闭。未调用付费模型或请求测试麦克风。后端18项检查、构建和启动脚本语法检查通过。Mac自动打开浏览器与用户电脑上的Key仍待本机确认。
