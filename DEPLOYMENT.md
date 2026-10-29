# GitHub Pages 发布

## 当前状态：M2 已上线

测试网址：**https://raycao1122-droid.github.io/zaizai-english/**

源码仓库：https://github.com/raycao1122-droid/zaizai-english

本网站为用户授权发布的 M2 模拟课堂，不访问真实设备或 AI API。完整 11 环节、Emma 与原始动物素材、模拟纠音、报告和档案均沿用同一个项目。M3 的真实服务尚未接入。

## 已完成的验证

- 用户已启用 Pages，并将发布来源设为 GitHub Actions；API 确认为 `build_type: workflow`。
- GitHub Actions 运行 `40815096141` 重试失败的部署步骤后成功，安装、生产构建、上传产物及部署均通过。运行记录：https://github.com/raycao1122-droid/zaizai-english/actions/runs/40815096141
- 实际网址返回 HTTP 200。使用正常 HTTPS 证书校验下载线上 32 个文件，共 43,434,577 字节，每个文件的 SHA-256 均与该次 GitHub Actions 的发布产物一致，包括 HTML、脚本、样式、字体和原始图像素材。
- 下载该次发布产物，以严格仓库子路径在 Chromium 中实际运行；Emma 和动物图片解码、正确反馈、辅助面板、模拟纠音重试、情景对话、复习、家长报告和长期档案检查通过，无资源失败或浏览器脚本错误。
- 云端 Chromium 直接访问 HTTPS 时缺少当前代理 CA，返回 `ERR_CERT_AUTHORITY_INVALID`。自动审批拒绝持久修改用户证书信任库，原因是该操作会扩大后续 HTTPS 信任范围，因此没有修改信任库或关闭证书校验。线上文件验证与浏览器运行验证分别完成，不能声称已通过云端浏览器直接 HTTPS 访问检查。

## 持续发布

`.github/workflows/pages.yml` 在推送 `main` 或手动触发时，用 Node 24 和锁定依赖构建，再通过 GitHub Pages 官方 Actions 部署。构建根据仓库名设置 `PAGES_BASE_PATH`，全部素材支持仓库子目录。

固定开发项目为 `/workspace/zaizai-english`，HTTPS `origin` 为上述独立仓库。原有 `main` 完整历史和 `m1-complete` 标签均已上传；没有修改 ContentFlow。

```bash
PAGES_BASE_PATH=/zaizai-english/ npm run build
node scripts/check-pages.mjs
npm run test:e2e
```

`check-pages.mjs` 对根路径资源故意返回 404，以发现错误的素材前缀。后续变更先验证、保存 Git，再按授权推送；观察本次 Actions 结果并检查实际网站后再宣称上线。若仅需重试已有运行中失败的部署，可使用 `gh run rerun <run-id> --failed`。

## 权限说明

当前 GitHub 集成可以读取、推送此仓库及触发 Actions；新建个人仓库和开通 Pages 的 API 曾分别返回 `Resource not accessible by integration`。用户已在 GitHub 界面完成这两项设置。仓库 `admin: true` 标记不保证集成具备所有 API 权限；当前发布已无上述阻塞，不需要重复创建仓库或更改网络设置。
