# 转到电脑本地继续开发

迁移的是现有项目和完整 Git 历史。当前云端已进入获用户批准的 M2；此前下载的 M1 包不会自动更新，需要另行导出当前版本。

## Mac 启动

如果下载的是精简迁移包（根目录为 `zaizai-english-transfer`，包含 `.bundle` 和 `restore-and-start.command`），先完整解压，再双击 `restore-and-start.command`。它会还原出下述 `zaizai-english` 文件夹，并接着启动；需要本机 Git 和 Node.js。精简包保留同一套完整文件和全部 Git 历史，只是不重复存放工作副本。如果已有同名目标文件夹，脚本会停止，不覆盖已有内容。

1. 下载迁移 ZIP 并解压。建议将解压出的 `zaizai-english` 文件夹放在「文稿」中，之后一直使用这个文件夹。
2. 首次需要 [Node.js 24 LTS](https://nodejs.org/)。已有 Node.js 20.19+、22.12+ 或更新兼容版本也可运行；Git 用于保留后续修改。
3. 双击 `start-local.command`；也可以在该文件夹的终端运行：

   ```bash
   bash start-local.command
   ```

4. 首次会按 `package-lock.json` 安装依赖，完成后启动课堂，并在 Mac 默认浏览器打开 `http://127.0.0.1:5173`。这个地址对应你的电脑；不需要等待云端的 GitHub 网络放行，也不需要部署公网。
5. 保留启动终端窗口。停止课堂时按 Control+C。如果端口 5173 正被其他程序使用，可以运行 `ZAIZAI_PORT=5174 bash start-local.command`，不要结束不认识的进程。

依赖和平台二进制会在本机安装；迁移包不包含云端 Linux 的 `node_modules`。后续锁文件没变化时，启动脚本复用本机已安装依赖。

## 在 Codex 电脑端接着修改

在 Codex 的本地项目入口选择/打开这个解压后的文件夹，并确认任务运行位置为「本地」。当前云端聊天不会因此自动变成本地执行任务，需要在该本地项目里继续。

可以把这段说明作为本地任务的起始消息：

> 继续当前文件夹里的「在在的英语课堂」。这是从云端迁移的已有 Git 项目，请先读 AGENTS.md、design/CODEX_START_HERE.md、design/FRONTEND_SPEC.md、design/ACCEPTANCE_CHECKLIST.md、M1_DELIVERY.md、M2_DELIVERY.md 和 LOCAL_DEVELOPMENT.md。保留原始 Emma 和动物素材、现有界面及全部 Git 历史，不重建项目。当前已授权 M2，先启动并验证完整 11 环节及模拟报告；不要自行进入 M3。每次完成修改后提交 Git。GitHub Pages 的配置已准备，但云端 API 网络受限，尚未创建远端仓库或上线。

## 手动运行与验证

在这个项目文件夹中运行，不要把命令中的工作目录改回云端 `/workspace`：

```bash
npm ci
npm run dev
```

构建和浏览器检查：

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

如果只看课堂、编辑前端，不需要安装 Playwright 的浏览器。Git 历史和原始设计资料已经随包保留，无需重新 `git init`。迁移包里的 `.git` 是隐藏文件夹，在 Finder 中不显示是正常的。

## 保存与同步

在同一本地文件夹中持续修改并提交 Git。文件、原始设计、截图和操作视频均留在该项目内。当前没有 GitHub 远端；本地改动不会自动同步回这条云端聊天或 GitHub。之后需要跨设备同步时，再连接同一个远端仓库。

启动脚本在云端以一个新位置解压的项目验证过依赖安装、启动和网页交互；Mac 的 `open` 浏览器行为仍需在你的电脑执行后确认，不能把云端验证当成已经操作了你的电脑。
