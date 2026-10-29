# 在在的英语课堂 · M2（0.2.0）

云端固定项目目录：`/workspace/zaizai-english`。迁移到电脑后，以你打开的 `zaizai-english` 本地文件夹为固定项目目录，保留同一个 Git 仓库及全部历史。后续不要重建一套项目，也不要改动旁边的 ContentFlow 或其他项目。

本阶段：React + TypeScript + Vite + Tailwind CSS 前端，使用本地模拟数据。没有 AI、语音、麦克风、摄像头、发音评分或后端调用。底部按用户确认采用**连续语音状态模拟**。

## 运行

电脑本地开发先看 [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)。Mac 安装 Node.js 24 LTS 后，双击项目根目录的 `start-local.command`，或在该文件夹终端执行 `bash start-local.command`，会安装依赖并打开本机课堂。

环境使用 Node.js 24.19.0 / npm 11.9.0。

```bash
cd /workspace/zaizai-english
npm ci --cache /workspace/.cache/npm
npm run dev -- --port 5173 --strictPort
```

开发服务器只监听本机，不能直接从手机访问。本仓库没有向公网部署，也没有创建远端 Git 仓库。

```bash
npm run build
npm run preview -- --port 4173 --strictPort
npm run test:e2e
```

浏览器测试在当前云环境使用系统 `/usr/bin/chromium`；其他机器默认使用 Playwright 管理的 Chromium，可先执行 `npx playwright install chromium`，也可用 `CHROMIUM_PATH` 指定现有 Chromium。测试会启动或复用 5173 端口的开发服务器。截图保存在 `screenshots/`。

## GitHub Pages 发布

已为用户要求的 GitHub 部署准备自动发布工作流及仓库子路径资源适配。发布步骤、实际验证和当前网络阻塞见 [DEPLOYMENT.md](DEPLOYMENT.md)。发布范围为当前 M2 模拟前端，真实 AI 与语音属于后续 M3。

```bash
PAGES_BASE_PATH=/zaizai-english/ npm run build
node scripts/check-pages.mjs
```

该检查会加载真实生产构建并验证子路径下的图片、点选反馈、面板和进度；不需要外部 API。

## 文件与迭代

- `design/`：完整保留交接包的四份文档。
- `public/assets/01_*.png`、`02_*.png`、`03_*.png`：原始设计图，不修改。
- `public/assets/*.svg`：从原图选取局部视窗，原始 PNG 字节完整嵌入，显式裁切，不是重新绘制。
- `public/assets/provenance.json`：每份素材的原图、取景坐标和 SHA-256。
- `scripts/prepare_assets.py`：可重复生成上述 SVG，运行 `python3 scripts/prepare_assets.py`。
- `src/components/`：可编辑、可交互的课堂、Emma、动物卡片、对话、语音栏与弹窗组件。
- `src/data/lessonFlow.ts`：完整 11 环节、提问和预设回答。
- `src/data/mockLesson.ts`、`mockReports.ts`：原始动物素材、对话、模拟报告和历史数据。
- `src/hooks/useClassroom.ts`：课堂状态流转、暂停、重置和本页操作记录。
- `tests/classroom.spec.ts`、`m2.spec.ts`：30 项浏览器检查，包括完整课堂、模拟报告导出、文件信息登记及多尺寸检查。
- `M1_DELIVERY.md`：第一阶段历史验收记录；Git 标签 `m1-complete` 保留 M1 检查点。
- `M2_DELIVERY.md`：第二阶段交付、截图、模拟数据说明和已知限制。

课堂进度、笔记和聊天仅保存在本次页面内，刷新后重置；面板折叠和退出重进会保留笔记、当前标签及未发送回答。暂停时保留草稿，暂不可发送回答或从目录切换练习；继续后可以正常操作。「重新开始」会恢复初始练习、展开面板并清空本次笔记、草稿和对话。右侧收起后课件区域扩展。完整流程覆盖准备、问候、认词、互动、模拟纠音、句型、情景对话、复习、儿童总结、家长报告和学习档案。报告、曲线与历史数据均为模拟；本页图片点选记录单独展示。课程入口可登记本机文件名、大小和类型，文件未上传、未解析。

每个独立修改完成验证后提交 Git，并写清修改用途。当前 Git 提交仅保存在本云项目内；没有自动推送到 GitHub。后续可在同一任务中继续；要跨新任务恢复，还需将项目接入远端仓库或发布包含本项目的环境快照。

**用户已授权 M2。第二阶段完成后等待验收，不自行进入 M3 的真实 AI、语音、驱动和后端接入。**
