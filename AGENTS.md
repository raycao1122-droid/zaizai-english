# 在在的英语课堂：持续迭代约定

- 本文件夹是固定项目根目录。云端位置为 `/workspace/zaizai-english`；迁移到电脑后，以用户打开的本地文件夹为项目根目录，不要求重建 `/workspace`。使用已有 Git 仓库和全部提交历史，不重建项目，不创建 worktree，不改动旁边的 ContentFlow 或其他项目。
- 开始前阅读 `design/CODEX_START_HERE.md`、`design/FRONTEND_SPEC.md`、`design/ACCEPTANCE_CHECKLIST.md`、`M1_DELIVERY.md` 和当前阶段的 `M2_DELIVERY.md`。
- 视觉优先级：02 课堂布局 > 01 Emma 外貌 > 03 流程；不得替换原始人物或把整页设计图当界面。
- 已确认的冲突解决：底部采用连续语音状态模拟，不采用按住说话。不请求真实设备权限。
- 用户已于 2026-10-29 明确批准开始 M2。当前范围为完整 11 环节、模拟发音纠正、课后报告、模拟学习档案和教材入口；沿用 M1，不重做产品。M3 的真实 AI、语音、评分、人物驱动与后端仍需另行授权。
- 保留原始 PNG 和来源记录。生成取景文件使用 `python3 scripts/prepare_assets.py`。无透明立绘、模型及独立花园背景；限制见交付文档，不能宣称数字人驱动或像素级完全还原。
- 代码拆分为组件和数据层。改动后运行 `npm run build` 及相关浏览器测试；视觉改动更新截图并实际查看。
- 使用 `npm ci` 安装锁定依赖；云端可指定 `/workspace/.cache/npm` 缓存，本机不要求该路径。Mac 可用 `bash start-local.command` 自动准备依赖并启动。浏览器测试在云端使用系统 Chromium，本地可先运行 `npx playwright install chromium`。每次完成一项独立修改后保存 Git 提交，不自动推送远端。
- 不保存凭据；课堂仍为本地模拟，不把模拟数据宣传为真实 AI / 发音 / 设备结果。
