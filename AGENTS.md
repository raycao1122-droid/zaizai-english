# 在在的英语课堂：持续迭代约定

- 本文件夹是固定项目根目录。使用已有 Git 仓库，不重建项目，不创建 worktree，不改动旁边的 ContentFlow。
- 开始前阅读 `design/CODEX_START_HERE.md`、`design/FRONTEND_SPEC.md`、`design/ACCEPTANCE_CHECKLIST.md` 和 `M1_DELIVERY.md`。
- 视觉优先级：02 课堂布局 > 01 Emma 外貌 > 03 流程；不得替换原始人物或把整页设计图当界面。
- 已确认的冲突解决：底部采用连续语音状态模拟，不采用按住说话。不请求真实设备权限。
- M1 验收前不得自行实现 M2/M3。后续只有用户明确批准才扩展阶段。
- 保留原始 PNG 和来源记录。生成取景文件使用 `python3 scripts/prepare_assets.py`。无透明立绘、模型及独立花园背景；限制见交付文档，不能宣称数字人驱动或像素级完全还原。
- 代码拆分为组件和数据层。改动后运行 `npm run build` 及相关浏览器测试；视觉改动更新截图并实际查看。
- 使用 `npm ci --cache /workspace/.cache/npm` 安装锁定依赖。每次完成一项独立修改后保存 Git 提交，不自动推送远端。
- 不保存凭据；课堂仍为本地模拟，不把模拟数据宣传为真实 AI / 发音 / 设备结果。
