# 项目:队伍官网模板(Team Site Template)

## 一句话目标
一个**纯静态、零后端**的运动队 / 学生社团介绍网站框架。不会写代码的人只需修改 `content/` 目录里的文字文件和图片,就能得到一个专业的队伍官网,托管在 GitHub Pages 上。

最终用途是**模板化**:任何队伍(飞盘队、足球队、辩论社……)复制这个仓库、填自己的内容即可上线。

---

## 硬性约束(任何阶段都不得违反)

1. **纯静态**:构建产物只有 HTML / CSS / JS / 图片。不得引入服务器、数据库、云函数、登录、表单提交、第三方统计或追踪脚本。
2. **唯一数据源是本仓库**:改内容 = 改仓库文件并推送。
3. **部署在 GitHub Pages,无自定义域名**:默认地址形如 `https://alvinz26.github.io/<repo-name>/`。因此必须正确处理 base 路径——任何内部链接和图片路径都不得写死为以 `/` 开头的绝对路径。
4. **内容与代码彻底分离**:用户需要编辑的一切(文字、人员、荣誉、新闻、主题色、社交链接、图片)集中在顶层 `content/` 目录。用户换内容时不应需要打开 `src/`。
5. **不依赖运行时外部资源**:不从外部 CDN 加载脚本或字体。社交媒体图标用内联 SVG。
6. **示例数据必须是虚构的**:虚构队名、虚构人名。不得使用任何真实社团的照片、人名或文字。占位图用本地生成的 SVG 或纯色块。
   > **已由 DECISIONS.md D41 修改（2026-10-14，取代 D28）**:已取得俱乐部许可,`content/` 放 Durham University Ultimate Frisbee Club 的真实公开信息,只用官方渠道,没有确认的不填。测试数据(`tests/fixtures/content/`)仍然完全虚构,模板通用性靠它和 Stage 4 验证。
7. **交互只做轻量 UI 反馈**:hover、点击、过渡动画、移动端菜单、荣誉页筛选。不引入前端状态管理框架。
8. **必须适配手机屏幕**。
9. **为扩展留口子但不实现**:所有内容读取集中在一个模块里(如 `src/lib/content.ts`),将来有人想改成从 API 或云端读数据,只需改这一处。

---

## 技术栈

- **Astro**(使用当前稳定版。动手前查阅官方文档确认版本与 API,不要凭记忆)
- **Content Collections + schema 校验**:内容填错时构建失败,并给出普通人能看懂的报错。这是给非程序员的安全网。
- **内容格式**:结构化数据用 **YAML**(可写注释、不用操心引号和逗号,比 JSON 对非程序员友好);长文本用 **Markdown**。
- **样式**:纯 CSS + CSS 变量,主题色从 `content/site.yaml` 读取并注入。不引入 Tailwind 等需要额外学习的体系。
- **浏览器端 JS**:只用于移动端菜单和荣誉页筛选,原生 JS 即可。
- **部署**:GitHub Actions + Astro 官方推荐的 GitHub Pages 部署流程。

---

## 站点结构(第一版范围,不多做)

| 页面 | 路径 | 内容来源 |
|---|---|---|
| 首页 | `/` | `site.yaml`(标语、简介、主图、统计条)+ 最新 3 条新闻 + 委员会预览 + 最新荣誉 |
| 关于 / 历史 | `/about` | `content/pages/about.md` |
| 成员 / 委员会 | `/people` | `content/people.yaml` |
| 荣誉 | `/honours` | `content/honours.yaml` |
| 新闻 | `/news`、`/news/[slug]` | `content/news/*.md` |
| 联系 | `/contact` | `site.yaml` 中的邮箱与社交链接,**不做表单** |

全站共用:导航栏、页脚(社交图标外链,新窗口打开)。

**模块开关**:`site.yaml` 中可关闭可选模块(荣誉、新闻)。关闭后,导航项和首页对应区块自动消失——因为不是每支队伍都有奖牌。

---

## 数据模型(草案,Stage 0 负责细化并交用户确认)

### `content/site.yaml` — 全站配置
- 基本信息:`name`、`shortName`、`tagline`、`org`(所属学校 / 机构)、`founded`、`description`
- 品牌:`logo`(图片路径)、`colors.primary`、`colors.accent`
- 联系:`email`;`socials[]`:`{ platform, url }`,`platform` 限定在已有图标的列表内(instagram / facebook / x / tiktok / youtube / whatsapp / website)
- 首页:`hero` 图片;`stats[]`:`{ label, value }` 或 `{ label, auto: people | honours | seasons }`(自动计算)
- 模块开关:`modules: { honours: true, news: true }`
- 荣誉配置(让不同运动通用的关键):
  - `honours.facets[]`:筛选维度,每项 `{ key, label, options[] }`。例:飞盘队用 级别 / 室内外 / 性别类别;足球队可能只用 赛事级别。
  - `honours.results[]`:名次定义,每项 `{ key, label, emoji, rank }`。例:飞盘队用金银铜;足球队可用 冠军 / 亚军 / 四强。

### `content/people.yaml` — 成员
- `name`、`role`、`group`(如 committee / coach / captain,用于分组显示)、`season`、`photo?`、`bio?`、`order?`

### `content/honours.yaml` — 荣誉
- `season`、`competition`、`team`、`result`(引用 `results.key`)、`tags`(`{ facetKey: option }`)、`captains[]`、`roster[]`(人名字符串)、`photo?`、`links[]`:`{ label, url }`
- **成员荣誉排行榜由 `roster` 推导**:按人名聚合,按名次加权排序。
- **已知风险**:同一个人名字写法不一致(如 "Josh Smith" 与 "Joshua Smith")会被当成两个人。Stage 0 需提出处理方案(例如构建时检测相似名字并给出警告),交用户决定。

### `content/news/*.md` — 新闻
- frontmatter:`title`、`date`、`summary`、`cover?`;正文为 Markdown。文件名即 URL slug。

### `content/pages/about.md` — 关于页
- 自由 Markdown。

### 图片
- 目标:所有用户可替换的图片也放在 `content/` 下,按用途分子目录。Stage 0 需论证具体放法(结合 Astro 的图片处理方式与 base 路径)。
- 缺图时显示占位,**不得构建失败或页面崩溃**。

---

## 分阶段计划

**每个阶段的流程**:在独立分支 `stage-N-<简称>` 上完成 → 推送 → **停下来**,用中文向用户汇报:改了什么、为什么、用户该怎么验收、有哪些需要用户拍板的问题 → 用户确认后再合并到 `main`。

**不得跨阶段提前实现任何东西。**

### Stage 0 — 数据模型(只设计,不写网站代码)
- `docs/data-model.md`:每个文件、每个字段的名称、类型、是否必填、含义、示例
- `content/` 下全套**虚构**示例数据(一支虚构飞盘队,约 15 名成员、8–10 条荣誉、3 条新闻)
- `docs/content-guide.md`:给非程序员的中文填写指南
- **不初始化 Astro,不写任何页面**

### Stage 1 — 骨架与部署
- 初始化 Astro;用 schema 校验 Stage 0 的内容;配置 `site` 与 `base`
- GitHub Actions 部署;上线一个只显示队名的空页面
- 验收标准:Pages 链接能打开;故意把某个字段填错时,构建失败且报错能看懂

### Stage 2 — 布局与静态页面
- 主题色注入、导航栏、页脚、移动端菜单
- 首页、关于、成员、新闻列表与详情、联系页

### Stage 3 — 荣誉模块
- 荣誉总表(按赛季 × 可配置维度)、筛选器、成员荣誉排行榜
- 首页统计条自动计算
- 同名检测

### Stage 4 — 模板化验收
- 用一支完全不同的虚构队伍(例如足球队,关闭荣誉模块)替换 `content/`,确认不改 `src/` 也能跑通
- 写面向非程序员的 `README.md`:如何用 "Use this template" 复制、改哪些文件、多久能看到更新
- 手机端与基础无障碍检查(图片 alt、颜色对比度、键盘可操作)

---

## 工作方式

- 用**中文**与用户沟通;代码、文件名、代码注释用英文。
- 用户编程能力有限,但擅长架构设计:汇报时讲清"做了什么、为什么、怎么验证",不要大段贴代码。
- 遇到本文件没有覆盖的设计决定:先列出选项和取舍,问用户,不要自作主张。
- 每次提交的 commit message 清楚说明改动。
- 不添加未要求的功能。
