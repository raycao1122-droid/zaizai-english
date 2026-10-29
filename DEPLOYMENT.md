# GitHub Pages 发布

当前待发布内容为用户已授权的 M2 模拟前端，不访问真实设备或 AI API，不进入 M3。

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

2026-10-29 用户应用环境设置后，运行时网络模式已为 `unrestricted`，状态为 `enforced`，观测为当前值。GitHub API 已连通；`gh api user` 成功确认账号为 `raycao1122-droid`。此前的域名网络阻塞已解除，无需重复添加域名。

读取 `raycao1122-droid/zaizai-english` 返回 404，尚不能确认存在可访问的目标仓库。按已授权的发布要求尝试创建独立公开仓库：`gh repo create` 的 GraphQL `createRepository` 被拒绝；标准 REST `POST /user/repos` 同样返回 HTTP 403、`Resource not accessible by integration`。这次失败来自 GitHub 集成权限，不是云端网络拒绝。

下一步需用户在 GitHub 创建 `raycao1122-droid/zaizai-english` 空的公开仓库，不预建 README、许可或 .gitignore，以保留当前项目完整历史。创建后重新验证 API 和 Git HTTPS 的访问权限；如现有集成不能访问新仓库，再明确指出需要授权的仓库范围，不要求在聊天中提供 Token。

尚未设置远端、推送代码、配置 Pages 或确认网站上线；没有修改 ContentFlow。仓库可访问后，继续上述操作顺序并验证最终真实网址。
