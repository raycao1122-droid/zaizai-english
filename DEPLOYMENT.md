# GitHub Pages 发布

本次只发布已完成的 M1 演示，不扩展 M2/M3，不访问真实设备或 AI API。

## 已准备

- `.github/workflows/pages.yml`：推送 `main` 或手动触发后，用 Node 24、`npm ci` 构建，再通过 GitHub Pages 官方 Actions 发布。
- 构建时根据实际仓库名设置 `PAGES_BASE_PATH`；所有角色、动物和场景文件使用对应前缀，支持 GitHub Pages 的仓库子目录。
- 源代码及既有 Git 历史继续保留在 `/workspace/zaizai-english`，不混入 ContentFlow。
- 默认计划使用单独的 `raycao1122-droid/zaizai-english` 仓库；在身份和仓库权限核实后才创建和推送，不能仅根据名称假设远端已存在。

## 本地发布检查

```bash
PAGES_BASE_PATH=/zaizai-english/ npm run build
node scripts/check-pages.mjs
npm run test:e2e
```

`check-pages.mjs` 用严格的子路径静态服务器加载真实 `dist/`，根路径资源故意返回 404，并通过 Chromium 验证 Emma、动物、场景、点选反馈、面板、进度和请求错误，避免本地根路径正常但 Pages 图片失效。

## GitHub 操作顺序

1. 验证已注入的 GitHub 身份和所需权限，不要求在聊天中提供 Token。
2. 检查目标仓库是否存在。如不存在，在已授权账号下创建独立的 Pages 演示仓库；如已存在，先检查其内容和历史，不能覆盖无关内容或强制推送。
3. 为此项目设置 HTTPS `origin`，保留现有本地提交。
4. 设置目标仓库 Pages 的发布来源为 GitHub Actions（REST `build_type: workflow`）。
5. 推送 `main`，等待本次 GitHub Actions 完成，读取实际 Pages `html_url` / 部署 `page_url`。
6. 对远端实际网址检查 HTTP、脚本/图片加载和动物交互，通过后才给出「已上线」链接。站点为公开演示。

如果 Actions 因组织策略或账号权限受限，应报告具体失败，不把推测网址当成已发布的网址。

## 当前外部阻塞

Git HTTPS 读取正常。`gh api user` 请求及对 GitHub API 的 HTTPS CONNECT 均被云环境代理返回 403；运行时自定义域名允许列表中没有 `api.github.com`。

已将 `api.github.com` 和预期账号站点验证所需的 `raycao1122-droid.github.io` 添加到环境配置草稿。草稿保存不等于运行时已应用；需要在环境设置中保存并发布，再检查实际运行时规则和 GitHub API。

尚未验证 GitHub API 的账号身份、创建仓库权限、推送权限、Pages 设置和发布结果，不能声称已经部署。没有创建远端仓库，也没有修改 ContentFlow 的 GitHub 设置。网络放行后仍需分别验证上述操作，而不是假定 Git 读取成功等于 API 或发布权限可用。
