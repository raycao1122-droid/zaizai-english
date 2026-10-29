# Emma 连续语音回复修复

本轮保留课堂、Emma 原图、教材及全部演示逻辑，只修正真实语音链路。修改前检查点 `before-live-conversation-fix`。

- 连接成功后由 Emma 主动用真实模型语音问候，并问一个当前课程问题。依据百炼官方 DashScope SDK 的 `create_response(instructions=...)`，发送 `response.create.response.instructions`；不伪造用户消息。空 `response.create` 不适用于无输入的新会话。
- 使用声学 `server_vad`，静默等待 1200ms，避免语义检测遗漏短词。保留自然打断；语音模型不能修改课程或档案。
- 回听只暂停麦克风实际采集，并持续发送零值 PCM 让上一句话正常结束；不再调用会清空输入、取消 AI 回答的后端 mute。回听期间到达的真实回复暂存，结束后自动续播；浏览器暂停音频时也保留待播回复。显式静音和断开仍有取消能力。
- 界面区分“正在听你说话”“Emma 正在准备语音回答”“Emma 正在说话”，只在实际安排音频播放后显示正在说话。

## 验证与限制

真实 Chromium（390×844），合成英文 WAV 经浏览器麦克风、原生采样/转码、新版本地中转和真实百炼模型：连接后主动问候；输入 `Hello, Emma. I like dogs.`，识别一致，Emma 自动回复 `That's great! Do you have a dog?`。自动播放调用 28 个音频片段，用户 WAV 4.68 秒、回复 2.8 秒可解码，浏览器脚本错误为零。截图中原生回听器显示的播放是随后额外检查；前面的自动播放已单独计数验证，无需先点击回听器。

单词合成录音 `Dog.` 的真实 API 检查收到 69120 字节回复，Emma 说 `Yes, dog!`，但 ASR 字幕为 `Drug.`，因此不能声称短词识别准确率已验收。中文求助、孩子真实声线、手机扬声器回声和打断体验仍需实机验收。

网络诊断使用正常 TLS 的 Node 转发和本地新中转，不是模型事件夹具；未关闭证书验证。合成输入不等于孩子录音实测。截图：`screenshots/voice-conversation/real-mobile.png`。

本轮后端14项及语音浏览器专项19项通过，涵盖主动问候仅一次、完整教师约束、无伪造学生输入、回听不发送清空式 mute、零值帧、回复暂存并自动续播、既有授权/连接/静音/课程状态保留。全量68项检查中67项首次通过；一项原有启动限流测试把浏览器等待时间计入固定帧数，碰到8帧边界，已改为测量ready后的120ms内帧数，继续校验无预连接音频和无积压突发，修订后专项复测通过。构建通过。

部署：Pages 保持原部署。验证时现有 Render 的 X-Classroom-Revision 仍为 `508c092`，不含本轮主动问候。若提交后仍未自动部署，需在已有 `zaizai-classroom-api` 服务选择 Manual Deploy → Deploy latest commit；无需重填密钥或新建服务。只有检查运行版本及实际语音返回后，才能声称新版后端上线。

官方依据：
- https://help.aliyun.com/zh/model-studio/realtime
- https://help.aliyun.com/zh/model-studio/omni-realtime-python-sdk
- DashScope 2.0.2 `audio/qwen_omni/omni_realtime.py` 的 create_response(instructions=...)。
