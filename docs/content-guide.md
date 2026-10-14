# 内容填写指南

这份指南写给**不会写代码**的维护者，比如每年新上任的社团宣传委员。

**你只需要改 `content/` 文件夹里的东西。** 其他文件夹（`src/` 等）是网站程序，不用打开。

---

## 一、在哪里改

最简单的方法是直接在 GitHub 网页上改，不用安装任何软件。

**改文字：**
1. 在仓库页面点进 `content/`，再点开要改的文件，比如 `people.yaml`
2. 点右上角的 ✏️（Edit this file）
3. 修改内容
4. 点绿色的 **Commit changes…**，在弹出框里用一句话写明改了什么（如 "Add 2027/28 committee"），再点 **Commit changes**

**上传图片：**
1. 进入对应的图片文件夹，比如 `content/images/people/`
2. 点 **Add file → Upload files**，把图片拖进去
3. 点 **Commit changes**
4. 回到对应的文件（如 `people.yaml`），把图片路径填进去

> 网站多久更新、改错了怎么看报错：Stage 1 完成部署后会补充到这里。

---

## 二、YAML 的六条规矩

`.yaml` 文件是网站的"表格"。格式很宽松，但下面六条必须遵守。

**1. 缩进只能用空格，不能用 Tab。** 同一层级要对齐，一般每层缩进 2 个空格。

```yaml
colors:
  primary: "#0f5c6e"     # ✅ 前面 2 个空格
  accent: "#f4b942"      # ✅ 和上一行对齐
```

**2. 冒号后面要有一个空格。** 要写成 `name: Maya`，不能写成 `name:Maya`。

**3. 列表的每一项以 `- ` 开头**（减号加空格）。

```yaml
roster:
  - Maya Okafor
  - Tom Whitfield
```

**4. `#` 后面是注释，网站会忽略。** 所以颜色**必须加引号**：

```yaml
primary: "#0f5c6e"   # ✅
primary: #0f5c6e     # ❌ 整个值被当成注释，等于没填
```

**5. 内容里有特殊符号时加引号。** 如果内容以 `#` `@` `*` `&` `!` `[` `{` `>` `|` 开头，或者内容中间出现"冒号 + 空格"，就用双引号括起来：

```yaml
tagline: "Motto: never stop running"   # 中间有 ": "，要加引号
emoji: "🥇"                             # emoji 也建议加引号
```

**6. 复制一整块最安全。** 要新增一个人或一条荣誉时，复制一个现有的块（从 `- name:` 或 `- season:` 那一行开始，到下一个 `-` 之前），粘贴后再改内容。这样缩进不会错。

---

## 三、图片路径怎么写

**所有地方都写成"从 `content/` 开始"的路径**，开头不要加 `/`：

```yaml
photo: images/people/maya-okafor.jpg
```

- 文件名建议用**小写英文和 `-`**，不要用空格和中文，例如 `maya-okafor.jpg`
- 照片用 jpg，宽度 2000 像素以内就够了
- **不想放图就整行删掉**，网站会显示占位图
- **路径写错**（文件不存在）时网站不会更新，会报错告诉你哪个路径找不到。改对之后再提交一次就好

---

## 四、常见任务

### 换成你们自己的队伍
打开 `content/site.yaml`，从上往下改：队名、标语、简介、颜色、邮箱、社交链接。每一行后面的英文注释说明了这一项的作用。

### 新学年换委员会
打开 `content/people.yaml`：
1. 复制当前赛季的块，把 `season` 改成新赛季（如 `2027/28`），再改名字和职务
2. **旧的块不要删**，它们是历史记录。成员页只会显示最新赛季

`group` 只能填 `site.yaml` 里 `people.groups` 列出的代号（示例里是 `committee`、`captains`、`coaches`）。想新增一个分组（如 "Alumni Officers"），先在 `site.yaml` 里加上。

### 添加一条荣誉
打开 `content/honours.yaml`，复制一个块再修改：
- `result` 只能填 `site.yaml` 里 `honours.results` 的代号（示例里是 `gold` / `silver` / `bronze` / `spirit`）
- `tags` 下的值只能填 `site.yaml` 里 `honours.facets` 列出的选项，**大小写要完全一致**（写 `Indoor`，不能写 `indoor`）
- **名字每次都要写得一模一样。** `Josh Carter` 和 `Joshua Carter` 会被当成两个人，排行榜会分开统计。如果历史记录里已经有不同写法，可以在 `site.yaml` 的 `honours.aliases` 里登记，不用回头改旧记录：

```yaml
aliases:
  Joshua Carter:      # 正式写法
    - Josh Carter     # 其他写法
```

### 发一条新闻
1. 进入 `content/news/`，点 **Add file → Create new file**
2. 文件名写成 `2026-11-02-indoor-season-starts.md`（日期-英文短标题.md）
3. 内容按下面的格式写：

```markdown
---
title: Indoor season starts
date: 2026-11-02
summary: Training moves indoors from next week.
cover: images/news/indoor.jpg
---

正文从这里开始。可以用 **加粗**、列表、## 小标题 等 Markdown 格式。
```

`cover` 可以不写。`date` 必须是 `年-月-日` 格式。

### 改"关于"页
直接编辑 `content/pages/about.md`，全部是正文，不需要开头的 `---` 部分。

### 关掉荣誉或新闻
在 `site.yaml` 里改：

```yaml
modules:
  honours: false
```

导航栏和首页上对应的部分会自动消失。

### 把导航栏改成中文或其他文字
在 `site.yaml` 末尾的 `labels` 里，只写你想改的项：

```yaml
labels:
  nav:
    home: 首页
    news: 新闻
```

没写的项保持英文默认值。可以改哪些项见 `docs/data-model.md` 第 1.8 节。

---

## 五、改坏了怎么办

- 网站只会在内容**全部正确**时才更新。改错了，线上网站会保持上一个正确的版本，不会坏掉
- GitHub 保存了每一次修改的记录，任何改动都能恢复
- 具体怎么看报错，等 Stage 1 完成部署后补充到这里
