// Build an ordinary script (not an ES module) so the preview can be opened
// directly from an extracted folder, without a development server.
import { build } from "vite";
import { resolve, join } from "node:path";
import { readdir, writeFile, rm } from "node:fs/promises";

const outDir = resolve(".local-cache/offline-preview");
await build({
  base: "./",
  build: {
    outDir,
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: 1000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve("src/main.tsx"),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "classroom.js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
// The viewports already embed the original PNG bytes. Omit only redundant,
// unused public source copies from this testing build; originals stay in Git.
for (const name of await readdir(join(outDir, "assets"))) {
  if (name.endsWith(".png") || name === "provenance.json")
    await rm(join(outDir, "assets", name));
}
const styles = (await readdir(join(outDir, "assets"))).filter((name) =>
  name.endsWith(".css"),
);
await writeFile(
  join(outDir, "index.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"><title>在在的英语课堂 · M2 离线测试</title>${styles.map((name) => `<link rel="stylesheet" href="./assets/${name}">`).join("")}</head><body><div id="root"></div><script defer src="./classroom.js"></script></body></html>`,
);
await writeFile(
  join(outDir, "使用说明.txt"),
  `在在的英语课堂 · M2 离线测试版

1. 请先完整解压 ZIP，保留 index.html、classroom.js 和 assets 文件夹在一起。
2. 在电脑上用 Chrome 打开 index.html，无需安装 Node、Git 或启动服务器。
3. 点击“开始上课”，用底部“下一步”体验完整 11 环节。
   “课程目录”可以直接跳到发音纠正、课后报告或长期档案。
   顶部“课程”可以测试教材文件信息登记，不读取正文或上传文件。
4. 刷新网页会重置本页操作和笔记。测试包不会同步修改到云端项目。

本阶段全部 AI、语音、发音反馈和历史学习数据为模拟；不访问麦克风。
这是可交互的测试构建，持续开发的源代码和 Git 历史仍在云端固定项目中。
本包不是已发布的网站，也不是源代码迁移包。

验证范围：云端 Chromium 已检查相同静态文件的 11 环节、素材和导出。
云端管理策略禁止 file:// 导航，未在此环境完成双击文件方式的浏览器验证；
尚未在你的 Mac / Safari 上执行测试。若打开异常，请提供错误信息。
`,
);
console.log(`Offline preview: ${outDir}`);
