# Durham University Ultimate Frisbee Club 网站

[English](README.md) | **中文**

[![CI](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml/badge.svg)](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml)

网址：**https://alvinz26.github.io/team-site-template/**

## 这是什么

这是 Durham University Ultimate Frisbee Club（DUF，杜伦大学极限飞盘俱乐部）的官网。它同时是一个**可以复用的模板**：任何运动队或学生社团都可以复制一份，填上自己的内容就能用。

- **更新内容不用写代码**：网站上的所有内容都放在 [`content/`](content/) 文件夹里，都是简单的文本文件。
- **页面**：首页、关于、成员（委员会、队长、教练）、荣誉（成绩、筛选、选手排行榜）、新闻、联系方式。
- **纯静态，免费**：都是普通的 HTML 页面，托管在 GitHub Pages 上。没有服务器、数据库、登录，也没有统计追踪和 Cookie。
- **安全网**：文件填错时网站不会更新，并且会用简单的英文告诉你哪个文件、哪一条、哪个字段要改。
- 适配手机，并且做过基础的无障碍检查：图片替代文字、颜色对比度、键盘操作。

## 怎么改内容

所有可以改的内容都在 [`content/`](content/) 里：

| 文件 | 管什么 |
|---|---|
| [`content/site.yaml`](content/site.yaml) | 队名、颜色、logo、社交链接、首页数字、荣誉筛选项、各个模块的开关 |
| [`content/people.yaml`](content/people.yaml) | 委员会、队长、教练（每人每个赛季写一条） |
| [`content/honours.yaml`](content/honours.yaml) | 成绩：赛季、赛事、队伍、名次、标签、参赛名单 |
| [`content/news/`](content/news/) | 新闻，每篇一个文件 |
| [`content/pages/about.md`](content/pages/about.md) · [`join.md`](content/pages/join.md) | "关于"页，以及首页的 "New to ultimate?" 板块 |
| [`content/images/`](content/images/) | logo、照片、封面 |

**直接在 GitHub 网页上改**（不用装任何软件）：

1. 打开要改的文件，点 ✏️（Edit）。
2. 改好后点 **Commit changes…**。
3. GitHub 会建议"新建分支并发起 pull request"：保持这个选项，点 **Propose changes**，再点 **Create pull request**。
4. 等自动检查出现**绿色的 ✓**（通常几分钟），点 **Squash and merge**。

详细的分步说明见 [docs/content-guide.md](docs/content-guide.md)，每个字段的含义见 [docs/data-model.md](docs/data-model.md)。

## 改完多久生效

合并后大约 **1–3 分钟**。可以打开仓库顶部的 **Actions** 页查看进度：黄色圆点表示正在发布，绿色 ✓ 表示已经上线（刷新一下网页），红色 ✗ 表示有地方要改。

## 出错了怎么办

- 红色 ✗ 表示内容检查发现了问题。**线上网站会保持上一个正确的版本**，不会坏掉。
- 点红色 ✗ → **Details**，找到以 `Content check failed` 开头的那一段。每个问题都是这样列出来的：

  ```
  content/people.yaml → 2026/27 · Alex Smith (line 12)
    • role — is required but missing.
  ```

  意思是：哪个文件 → 哪一条（第几行）→ 哪个字段 — 出了什么问题。报错是英文的，看不懂可以整段复制到翻译软件里。
- 按提示改好，再保存一次就行。GitHub 会保存每一个历史版本，任何改动都可以撤回。

## 给自己的队伍用这个模板

1. 点本页顶部的 **Use this template → Create a new repository**，给新仓库起个名字。
2. 在新仓库里打开 **Settings → Pages → Source**，选 **GitHub Actions**。
3. 把 `content/` 里的内容换成你们队的，建议从 `content/site.yaml` 开始改。
4. 网站地址是 `https://<你的用户名>.github.io/<仓库名>/`。这个地址会自动算出来，不用改代码。

不同的运动也能用：荣誉筛选项和名次类型都在 `site.yaml` 里设置，荣誉和新闻两个模块也可以关掉。

## 给开发者

```bash
npm install
npm run dev     # 本地预览 http://localhost:4321
npm test        # 65 条验收测试（用测试数据构建整个网站）
npm run check   # TypeScript / Astro 类型检查
```

- 用 [Astro](https://astro.build) 7 构建。内容校验在 [`src/lib/content-validate.ts`](src/lib/content-validate.ts)；页面只通过 [`src/lib/content.ts`](src/lib/content.ts) 读取内容。
- 最初的需求文档是 [CLAUDE.md](CLAUDE.md)，所有设计决定都记在 [DECISIONS.md](DECISIONS.md)。
- 测试用的是 [`tests/fixtures/content/`](tests/fixtures/content/) 里一支虚构的俱乐部，所以改真实内容不会让测试失败。
