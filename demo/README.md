# 实际操作录像

当前版本为 M2。`m2-classroom-demo.mp4` 覆盖准备、问候、认词、听说互动、模拟纠音、句型、情景对话、复习、儿童总结、家长报告、学习档案与课程资料入口。无音轨，所有 AI 与语音能力仍为模拟。

`classroom-demo.mp4` 是从真实运行的 M1 生产构建录制的浏览器画面，不是设计稿动画。使用 H.264 / yuv420p，便于手机播放。没有音轨，课堂语音仍未接入。

录像依次展示：默认课堂、选择错误动物、展开提示、选择正确动物、学习提示、编辑笔记、收起/展开辅助面板、推进到小猫练习、静音模拟、暂停/继续、退出及重新进入、重置演示。

这份录像可以在网站部署前用于查看视觉与交互反馈；它不是可亲手操作的网站。

## 重新录制

先准备生产构建并在另一终端启动预览：

```bash
cd /workspace/zaizai-english
PAGES_BASE_PATH=/zaizai-english/ npm run build
PAGES_BASE_PATH=/zaizai-english/ npm run preview -- --port 4173 --strictPort
```

然后执行：

```bash
bash scripts/record-demo.sh
```

当前录制脚本生成 M2 录像。云环境中使用现有 `/usr/bin/chromium` 与 `/usr/bin/ffmpeg`，中间 WebM 和录制缓存不加入 Git。录制脚本只操作现有控件，不修改应用功能。M1 历史录像保留原文件名。
