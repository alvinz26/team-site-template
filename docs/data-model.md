# 数据模型（Stage 0）

> 这份文档列出 `content/` 下每个文件、每个字段的名称、类型、是否必填、含义和示例。
> Stage 1 的 schema 校验会严格按这里实现。所有决定的来由见 [DECISIONS.md](../DECISIONS.md)。
> 面向填写者的中文操作说明见 [content-guide.md](content-guide.md)。

## 0. 总体规则

| 规则 | 说明 |
|---|---|
| 文件格式 | 结构化数据用 YAML（`.yaml`），长文本用 Markdown（`.md`）。编码为 UTF-8，带 BOM 也能读。 |
| 不写 id | 你不需要给任何条目编号。系统会自动生成 id，报错时用"赛季 + 名字"这类看得懂的方式指出是哪一条。 |
| 图片路径 | **一律写成从 `content/` 开始的相对路径**，例如 `images/people/maya-okafor.jpg`。不管写在哪个文件里，写法都一样。不能以 `/` 开头，也不能是网址。 |
| 图片格式 | `jpg` / `jpeg` / `png` / `webp` / `gif` / `svg`。照片建议用 jpg，宽度 2000px 以内。 |
| 缺图 | 图片字段**不填** → 显示占位图。**填了但文件不存在** → 构建失败，报错会指出找不到的路径（决定见 DECISIONS D2）。 |
| 赛季 | 自由文本，但**必须包含一个 4 位年份**（如 `2026/27`、`2026`、`2026-2027`）。排序按第一个 4 位年份。同一个站点里请保持同一种写法。 |
| 未知字段 | 写了文档里没有的字段 → 构建失败并提示，防止拼写错误被悄悄忽略（例如把 `photo` 写成 `phot`）。 |
| 颜色 | 十六进制颜色，如 `"#0f5c6e"`，**必须加引号**，否则 YAML 会把 `#` 后面当成注释。 |

### 文件一览

```
content/
├── site.yaml            全站配置（必需）
├── people.yaml          成员（必需，可以是空列表 [] ）
├── honours.yaml         荣誉（荣誉模块开启时必需）
├── news/*.md            新闻，每篇一个文件（新闻模块开启时至少 0 篇）
├── pages/about.md       关于页（必需）
└── images/              所有图片，按用途分目录
    ├── brand/           logo
    ├── home/            首页主图
    ├── people/          成员照片
    ├── honours/         荣誉合影
    ├── news/            新闻封面
    └── about/           关于页正文里的图片
```

图片子目录只是推荐的整理方式，系统不强制。路径写对就能用。

---

## 1. `content/site.yaml` — 全站配置

### 1.1 基本信息

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `name` | 文本 | ✅ | 队伍全名。显示在首页大标题和浏览器标签页上 | `Northvale University Ultimate Frisbee Club` |
| `shortName` | 文本 | ✅ | 简称。显示在导航栏，没有 logo 时代替 logo | `Northvale Ultimate` |
| `tagline` | 文本 | ✅ | 首页标题下的一句话标语 | `Fast feet, big hucks, better spirit.` |
| `org` | 文本 | — | 所属学校或机构 | `Northvale University` |
| `founded` | 整数（年份） | — | 成立年份。使用 `auto: seasons` 统计项时必填 | `2004` |
| `description` | 文本 | ✅ | 2–3 句简介。显示在首页，也会作为搜索引擎摘要 | 见示例文件 |

### 1.2 品牌

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `logo` | 图片路径 | — | 不填时用 `shortName` 文字代替 | `images/brand/logo.svg` |
| `colors.primary` | 颜色 | ✅ | 主色：导航栏、标题 | `"#0f5c6e"` |
| `colors.accent` | 颜色 | ✅ | 强调色：按钮、链接、高亮 | `"#f4b942"` |

> Stage 4 会人工检查示例配色的对比度，并在填写指南里提醒怎么选颜色。系统不会自动检查。

### 1.3 联系方式

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `email` | 邮箱 | — | 显示在联系页，点击会打开用户自己的邮件程序 | `hello@example.com` |
| `socials` | 列表 | — | 社交链接，显示在页脚和联系页，新窗口打开 | 见下 |
| `socials[].platform` | 固定选项 | ✅ | `instagram` / `facebook` / `x` / `tiktok` / `youtube` / `whatsapp` / `website` 之一，决定显示哪个图标 | `instagram` |
| `socials[].url` | 网址 | ✅ | 必须以 `https://` 或 `http://` 开头 | `https://instagram.com/yourclub` |

`email` 和 `socials` 都没填时，联系页会显示一句"暂无联系方式"，不会出错。

### 1.4 首页

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `hero.image` | 图片路径 | — | 首页顶部大图。不填时用主色色块 | `images/home/hero.svg` |
| `hero.alt` | 文本 | 填了 `hero.image` 就必填 | 用一句话描述图片内容，给读屏软件用 | `Players stretching out for a disc` |
| `stats` | 列表 | — | 首页统计条，建议 2–4 项 | 见下 |
| `stats[].label` | 文本 | ✅ | 数字下面的说明文字 | `Honours won` |
| `stats[].value` | 文本或数字 | 二选一 | 手写的值，原样显示 | `80+` |
| `stats[].auto` | 固定选项 | 二选一 | 自动计算：`people` / `honours` / `seasons` | `honours` |

`value` 和 `auto` **必须且只能填一个**。

**自动统计的计算方式**（已确认，见 D13）：

| `auto` | 默认算法 | 例子里的结果 |
|---|---|---|
| `honours` | `honours.yaml` 的条目总数，包括 Spirit Award 这类非名次荣誉 | 9 |
| `seasons` | 最新赛季的年份 − `founded` + 1。最新赛季取 `people.yaml` 和 `honours.yaml` 里出现过的最大年份，**不读系统时钟**，所以同样的内容每次构建结果都一样 | 2026 − 2004 + 1 = 23 |
| `people` | 当前赛季（最新赛季）`people.yaml` 里的人数 | 13 |

如果荣誉模块已关闭却用了 `auto: honours`，构建会失败并提示改掉（决定见 D15）。

### 1.5 模块开关

| 字段 | 类型 | 必填 | 默认 | 含义 |
|---|---|---|---|---|
| `modules.honours` | true/false | — | `true` | `false` 时隐藏荣誉页、导航项、首页最新荣誉。此时 `honours.yaml` 和 `honours` 配置可以不存在 |
| `modules.news` | true/false | — | `true` | `false` 时隐藏新闻页、导航项、首页最新新闻 |

关于、成员、联系三页是固定的，不能关闭。

### 1.6 成员页分组 `people`

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `people.groups` | 列表 | ✅ | 成员页的分区，**列出的顺序就是显示顺序** | |
| `people.groups[].key` | 简短英文代号 | ✅ | 给 `people.yaml` 的 `group` 字段引用，只能用小写字母、数字和 `-` | `committee` |
| `people.groups[].label` | 文本 | ✅ | 页面上显示的分区标题 | `Committee` |

首页的"委员会预览"显示**第一个分组**在最新赛季的成员（决定见 D8）。

### 1.7 荣誉配置 `honours`（荣誉模块开启时必填）

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `honours.facets` | 列表 | ✅（可以为空 `[]`） | 荣誉页的筛选维度，每支队伍可以自己定义 | |
| `facets[].key` | 简短英文代号 | ✅ | 给 `honours.yaml` 的 `tags` 引用 | `surface` |
| `facets[].label` | 文本 | ✅ | 筛选器标题 | `Indoor / Outdoor` |
| `facets[].options` | 文本列表 | ✅ | 可选值。`tags` 里只能填这里列出的值，大小写也要一致 | `[Indoor, Outdoor, Beach]` |
| `honours.results` | 列表 | ✅ | 可能的结果（名次或奖项） | |
| `results[].key` | 简短英文代号 | ✅ | 给 `honours.yaml` 的 `result` 引用 | `gold` |
| `results[].label` | 文本 | ✅ | 显示名 | `Gold` |
| `results[].emoji` | 文本 | — | 显示在名称前面的图标 | `"🥇"` |
| `results[].rank` | 正整数 | ✅ | 1 表示最好。用于排序和排行榜，可以并列（两个结果都写 3） | `1` |
| `honours.aliases` | 名字 → 名字列表 | — | 同一个人的不同写法，统计排行榜前先合并。见第 7 节 | `Joshua Carter: [Josh Carter]` |

> 足球队的写法示例：`results` 可以设为 冠军 / 亚军 / 四强（rank 1 / 2 / 3）；`facets` 只保留一个"赛事级别"。

### 1.8 界面文字 `labels`

整个 `labels` 都可以不写，不写就用英文默认值。只需列出你想改的项，例如中文队伍可以写 `labels.nav.news: 新闻`。

| 键 | 默认值 |
|---|---|
| `nav.home` | Home |
| `nav.about` | About |
| `nav.people` | People |
| `nav.honours` | Honours |
| `nav.news` | News |
| `nav.contact` | Contact |

Stage 2、Stage 3 做页面时还会增加键（如 "Read more"、"Latest news"、筛选器上的 "All"），每个新键都会有默认值，并补充到这张表里。写了不存在的键会报错，防止拼写错误。

---

## 2. `content/people.yaml` — 成员

文件内容是一个列表，**每人每个赛季写一条**。同一个人连任两年就写两条。

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `name` | 文本 | ✅ | 姓名 | `Maya Okafor` |
| `role` | 文本 | ✅ | 职务 | `President` |
| `group` | 代号 | ✅ | 必须是 `site.yaml → people.groups` 里的某个 `key` | `committee` |
| `season` | 赛季 | ✅ | 见总体规则 | `2026/27` |
| `photo` | 图片路径 | — | 不填时显示姓名首字母头像 | `images/people/maya-okafor.jpg` |
| `bio` | 文本 | — | 一两句介绍 | |
| `order` | 整数 | — | 组内排序，数字小的在前。不填的人按文件里的顺序排在有 `order` 的人后面 | `1` |

- **成员页**只显示最新赛季，按分组展示。往届数据保留在文件里，Stage 2 只展示最新赛季（是否做往届浏览不在第一版范围内）。
- 照片的替代文字自动用姓名，不需要填写。

---

## 3. `content/honours.yaml` — 荣誉

文件内容是一个列表，每条荣誉一项，顺序不限，页面会按赛季从新到旧排列。

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `season` | 赛季 | ✅ | | `2025/26` |
| `competition` | 文本 | ✅ | 赛事名称 | `Student Outdoor Nationals` |
| `team` | 文本 | ✅ | 哪支队伍参赛（一个俱乐部可能有多支队） | `Open Firsts` |
| `result` | 代号 | ✅ | 必须是 `site.yaml → honours.results` 里的某个 `key` | `bronze` |
| `tags` | 维度 → 选项 | — | 每个键必须是某个 facet 的 `key`，值必须是它的 `options` 之一。缺某个维度可以，但筛选该维度时这条不会出现 | `surface: Outdoor` |
| `captains` | 名字列表 | — | 队长 | `[Oliver Grant]` |
| `roster` | 名字列表 | — | 参赛名单。**排行榜根据它计算**，不填则这条不计入排行榜 | |
| `photo` | 图片路径 | — | 合影。替代文字自动生成为 "{team} at {competition} {season}" | |
| `links` | 列表 | — | 相关链接，新窗口打开 | |
| `links[].label` | 文本 | ✅ | 链接文字 | `Match report` |
| `links[].url` | 网址 | ✅ | | `https://...` |

### 排行榜规则（Stage 3 实现，决定见 D11、D12）

1. 每条荣誉的参与者 = `roster` ∪ `captains`。队长忘了写进名单也会被计入。
2. 先按 `aliases` 合并不同写法，再按姓名聚合。
3. 排序采用**奖牌榜规则**：先比 rank 1 的数量，相同再比 rank 2，依此类推。所以不需要另外配置"积分"。
4. 每个结果类型单独一列，例如 🥇 🥈 🥉 🕊️。

---

## 4. `content/news/*.md` — 新闻

每篇新闻一个 `.md` 文件。**文件名就是网址**，建议写成 `年-月-日-简短英文标题.md`，例如 `2026-10-05-northvale-classic-silver.md` 对应网址 `/news/2026-10-05-northvale-classic-silver/`。文件名请用小写字母、数字和 `-`；空格和大写会被自动转换，但网址会变得难看。

文件开头 `---` 之间的部分（frontmatter）：

| 字段 | 类型 | 必填 | 含义 | 示例 |
|---|---|---|---|---|
| `title` | 文本 | ✅ | 标题 | `Mixed take silver at the Northvale Classic` |
| `date` | 日期 `YYYY-MM-DD` | ✅ | 发布日期，用于排序（新的在前） | `2026-10-05` |
| `summary` | 文本 | ✅ | 一两句摘要，显示在新闻列表和首页卡片上 | |
| `cover` | 图片路径 | — | 封面图。不填时显示主色占位块。替代文字为空（视为装饰图，因为标题已经说明了内容） | `images/news/northvale-classic.svg` |

第二个 `---` 之后是正文，使用 Markdown。支持标题、列表、加粗、引用、表格和图片。

---

## 5. `content/pages/about.md` — 关于页

纯 Markdown，不需要 frontmatter。页面标题来自 `labels.nav.about`。

正文图片写法：`![图片描述](images/about/team-2019.jpg)`。路径规则和其他地方一样，从 `content/` 开始写。

> 【假设】正文里的图片和 frontmatter 里的图片走不同的处理流程。Stage 0 已验证 frontmatter 图片可以统一写成 `images/...`；正文图片的统一写法要在 Stage 2 加一个小插件，届时验证。

---

## 6. 图片放置方案及理由

**方案：所有图片都放在 `content/images/<用途>/`，所有文件里都按"从 `content/` 开始"的路径书写。**

理由（下面三条均已在 Astro 7.3.8 上实际测试，见 D5）：
1. **base 路径自动处理**。图片通过 Astro 的 `image()` 校验和处理后，输出路径自动带上 `/team-site-template/` 前缀。填写者永远不用考虑 base 路径。
2. **构建时检查文件是否存在**。路径写错时构建直接失败并报出路径，不会上线一个破图。
3. **自动优化**。图片会被压缩并附上尺寸信息，手机加载更快。

备选方案及不推荐的原因：

| 备选 | 问题 |
|---|---|
| 放在 `public/` | 不压缩；路径写错时**不报错**，上线后才出现破图；路径要自己处理 base；和"内容都在 `content/`"的约束冲突 |
| 图片和条目放在一起（每篇新闻一个文件夹） | 对非程序员来说文件夹结构更复杂；成员和荣誉是 YAML 列表，没法这样放 |
| 每个文件按自己的位置写相对路径（新闻要写 `../images/...`） | 同样一张图在不同文件里写法不同，容易出错。已验证可以统一成 `images/...` |

---

## 7. 同名检测方案（已确认：A + B，见 D14）

**问题**：排行榜按名字字符串聚合，`Josh Carter` 和 `Joshua Carter` 会被当成两个人。

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A. 只警告 | 构建时找出相似的名字（忽略大小写、空格和重音后相同；或拼写只差 1–2 个字母，如 Fraser/Frazer；或姓相同且名字一个是另一个的前缀，如 Josh/Joshua），在构建日志里列出 | 不需要额外填写 | **构建日志非程序员基本看不到**，警告容易被忽略 |
| B. 别名表 | `site.yaml → honours.aliases` 写明"这些写法是同一个人"，统计前先合并 | 改一处即可修正，不用回头改历史记录 | 需要有人知道问题存在 |
| C. 严格名册 | 所有名字必须先在某个名册里登记，否则构建失败 | 最准确 | 往届校友也要全部登记，维护成本高，不适合学生社团 |
| **✅ 采用 A + B** | 检测到相似名字时在构建日志里发出警告，警告里直接给出要加的 `aliases` 写法；用户也可以不处理 | | |

不做"本地预览时在页面上显示警告"（超出 SPEC，已决定不做）。

示例数据里专门放了两个测试用例：
- `Josh Carter` / `Joshua Carter`：已用 `aliases` 合并 → 应该算一个人
- `Isla Frazer` / `Isla Fraser`：没有合并 → 应该触发警告

---

## 8. Stage 0 技术验证记录（Astro 7.3.8，临时目录实测，没有进入仓库）

| 测试 | 结果 |
|---|---|
| 从项目根目录的 `content/` 读取集合（不放在 `src/` 里） | ✅ 可以 |
| YAML 单个对象（`site.yaml`）作为集合 | ✅ 需要自定义解析器包一层，可以 |
| YAML 和 md 里写 `images/...` 引用图片 | ✅ 可以，输出路径自动带 base |
| 必填字段缺失 | ✅ 构建失败，但报错是 `people → 0 … role: Required`，用序号指出条目、行号显示 0:0，**普通人看不懂** → Stage 1 要包装报错 |
| 图片文件不存在 | ✅ 构建失败：`Could not find requested image images/people/typo.svg` |
| **YAML 语法错误（如缩进错）** | ❌ **构建成功**，只打印一行错误，然后该集合变为空，网站上成员页会是空的 → Stage 1 必须修复（D6） |
| YAML 文件带 BOM（Windows 记事本"UTF-8 with BOM"） | ❌ 解析失败 → Stage 1 解析前去掉 BOM（D6） |
