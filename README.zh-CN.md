# 队伍网站模板（Team Site Template）

[English](README.md) | **中文**

[![CI](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml/badge.svg)](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml)

一个纯静态、不需要后端的运动队和学生社团网站模板，由 **Tao** 设计和开发。

- **在线演示**（虚构的俱乐部）：https://alvinz26.github.io/team-site-template/
- **实际使用案例**：[Durham University Ultimate Frisbee Club](https://durham-ultimate-frisbee.github.io/website/)，源码在 [Durham-ultimate-frisbee/website](https://github.com/Durham-ultimate-frisbee/website)

## 这是什么

一个**不会写代码的人也能维护**的网站：网站上的所有内容都放在 [`content/`](content/) 文件夹里，是一些简单的文本文件，平时完全不用碰代码。

- **页面**：首页、关于、成员（委员会、队长、教练）、荣誉（成绩、筛选、选手排行榜）、新闻、联系方式。
- **纯静态，免费**：普通的 HTML，托管在 GitHub Pages 上。没有服务器、数据库、登录，也没有追踪和 Cookie。
- **安全网**：文件填错时网站不会更新，并且会用简单的英文告诉你是哪个文件、哪一条、哪个字段要改。
- **任何队伍都能用**：颜色、荣誉筛选项、名次类型都是可以改的设置；荣誉和新闻两个模块可以关掉；绑定自己的域名只要加一行。
- 适配手机；做过基础无障碍检查（图片替代文字、颜色对比度、键盘操作）；照片里的位置信息会自动清除。

## 怎么改内容

所有可以改的内容都在 [`content/`](content/) 里：

| 文件 | 管什么 |
|---|---|
| [`content/site.yaml`](content/site.yaml) | 队名、颜色、logo、社交链接、首页数字、荣誉筛选项、模块开关、自定义域名 |
| [`content/people.yaml`](content/people.yaml) | 委员会、队长、教练（每人每个赛季写一条） |
| [`content/honours.yaml`](content/honours.yaml) | 成绩：赛季、赛事、队伍、名次、标签、参赛名单 |
| [`content/news/`](content/news/) | 新闻，每篇一个文件 |
| [`content/pages/about.md`](content/pages/about.md) · [`join.md`](content/pages/join.md) | "关于"页，以及首页的 "New to ultimate?" 板块 |
| [`content/images/`](content/images/) | logo、照片、封面 |

在 GitHub 网页上改：打开文件 → ✏️ **Edit** → **Commit changes…**。如果仓库的主分支有保护，就选 **Create a new branch and start a pull request**，等出现绿色 ✓ 后点 **Squash and merge**。

详细的分步说明见 [docs/content-guide.md](docs/content-guide.md)，每个字段的含义见 [docs/data-model.md](docs/data-model.md)。

## 改完多久生效

修改进入主分支后，通常**几分钟**就会生效。仓库顶部的 **Actions** 页可以看进度：黄色表示正在发布，绿色 ✓ 表示已经上线（刷新一下网页），红色 ✗ 表示有地方要改。

## 出错了怎么办

- 红色 ✗ 表示内容检查发现了问题。**线上网站会保持上一个正确的版本**，不会坏掉。
- 点红色 ✗ → **Details**，找到以 `Content check failed` 开头的那一段，比如：

  ```
  content/people.yaml → 2026/27 · Alex Smith (line 12)
    • role — is required but missing.
  ```

- 按提示改好，再保存一次就行。GitHub 会保存每一个历史版本，任何改动都可以撤回。

## 给自己的队伍用这个模板

1. 点本页顶部的 **Fork**。复制出来的仓库会一直带着指回本项目的链接。
2. 在你的副本里：打开 **Actions** 页启用工作流，然后到 **Settings → Pages → Source** 选 **GitHub Actions**。
3. 把 `content/` 里的内容换成你们队的，建议从 `content/site.yaml` 开始改。
4. 网站地址是 `https://<所有者>.github.io/<仓库名>/`，会自动算出来。要用自己的域名，就在 `site.yaml` 里加一行 `domain:`，并在 **Settings → Pages** 里填上同一个域名。

## 作者与许可证

由 **Tao**（[@alvinz26](https://github.com/alvinz26)）设计和开发，负责需求、架构、设计决策和交付。

采用 [MIT 许可证](LICENSE)：可以自由使用和修改，但必须保留版权声明。

## 给开发者

```bash
npm install
npm run dev     # 本地预览 http://localhost:4321
npm test        # 65 条验收测试（用测试数据构建整个网站）
npm run check   # TypeScript / Astro 类型检查
```

- 用 [Astro](https://astro.build) 7 构建。内容校验在 [`src/lib/content-validate.ts`](src/lib/content-validate.ts)，页面只通过 [`src/lib/content.ts`](src/lib/content.ts) 读取内容。
- 最初的需求文档是 [CLAUDE.md](CLAUDE.md)，所有设计决定都记在 [DECISIONS.md](DECISIONS.md)。
- 测试用的是 [`tests/fixtures/content/`](tests/fixtures/content/) 里一支虚构的俱乐部，所以改真实内容不会让测试失败。
