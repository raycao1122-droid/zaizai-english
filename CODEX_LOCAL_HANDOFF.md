# 给本地 Codex 的交接说明

这是现有「在在 AI 英语课堂」的完整项目，直接在本文件所在目录继续开发。保留源码、教材、Emma 原素材和完整 `.git` 历史，不重新创建项目或执行 git init。原远端：https://github.com/raycao1122-droid/zaizai-english 。

## 先做什么

1. 阅读 AGENTS.md、LOCAL_DEVELOPMENT.md、UNIT1_DELIVERY.md、UNIT1_ENTRY_FIX.md，并检查 git status。
2. 确认本机有 Node.js 24 LTS（24.5或更新）。项目有 package-lock.json，用 npm ci 安装，勿带入云端Linux依赖。
3. 运行 bash start-local.command（Mac也可双击该文件），它会准备依赖并启动本机前端及语音后端，打开一次性设备授权的浏览器课堂。只有本机回环地址，无需Render部署。
4. 验证默认进入 L1 Hello, Emma!，切换四个课时、开始/暂停/继续、图片与阶段对应，以及实际语音输入输出。没有Key时明确报告未配置，不把课堂浏览当成真实AI授课。
5. API Key不在交接包中。仅由用户在本机.env.local填写DASHSCOPE_API_KEY、DASHSCOPE_WORKSPACE_ID及地域；不要让用户粘贴到聊天，不打印/提交密钥，不加VITE_前缀。其余本机设备授权由启动器处理。

## 当前状态

- React + TypeScript + Vite，保持原Emma与三栏布局。
- 默认第一单元L1，四节真实课程和教案在curriculum/unit1，PDF与图片在public/assets/curriculum/unit1；Animals示例保留，明确选择后可继续演示。
- 实时语音经Node安全中转接百炼。新课程上下文由后端白名单课时/阶段生成，不允许浏览器伪造教案或评分。
- 口语转写默认待人工复核；知识检查按源教材答案对照。学习记录仅在当前浏览器本机保存，可导出；本机与线上数据不会自动同步。
- 自动发音评分、可靠的自动口语判分、云同步、通用PDF上传解析尚未实现。不要生成模拟真实成绩。
- 最近修复了默认仍是Animals、教材弹窗主按钮重置到旧课以及后端未就绪却显示学习中的问题。若看到旧课，先核对所选课程、浏览器来源及实际启动代码。
- 云端启动器验证包括本机前后端代理、授权交换和刷新恢复，未等同于用户Mac实机验收。历史真实百炼测试使用合成录音，不是孩子实际录音准确率证明。

## 持续迭代

每项独立修改后保存Git，按变化运行构建/相关测试，提供真实截图及未完成项。后续持续用当前文件夹。先完成用户电脑上的启动和语音验收，不自行购买资源或扩展新阶段。

可以直接给Codex这句话：

> 请读取当前文件夹的 CODEX_LOCAL_HANDOFF.md，接着这个已有项目在本机继续开发。先启动并验证第一单元和真实语音，保留Emma、布局和Git历史，不重建项目，不输出或提交密钥。
