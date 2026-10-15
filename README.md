# Stellar Writing

为 [Hexo Stellar](https://github.com/xaoxuu/hexo-theme-stellar) 主题打造的实时预览博客编辑器：左边写 Markdown 和 Stellar 标签，右边立刻看到文章在博客里的样子。

## 快速开始

```bash
bun install
bun run dev
```

打开 http://localhost:3000 即可使用。草稿自动保存在浏览器本地，可随时导出为 `.md` 文件放进 Hexo 的 `source/_posts/`。

## 功能

- **原版渲染**：预览直接运行 Stellar 自己的标签插件源码（45 个块级与行内标签），样式由主题原版 Stylus 编译而来，结构与 Hexo 生成的文章页一致。
- **Front Matter**：与 Stellar 相同的字段规则——`title`、`date`、`updated`、`categories`、`tags`、`cover`、`banner.enabled/background/avatar/headline/tagline`、`article.ai_label`、`article.style`、`render.math`（`false`/`katex`/`mathjax`）、`render.diagrams`（`false`/`mermaid`/参数对象）。`description` 只用于博客列表简介和 SEO，文章页不显示。
- **标签库**：顶栏「插入标签」或 `⌘/` 打开，可搜索、预览语法，回车插入片段，Tab 在占位之间跳转。
- **自动补全**：在编辑器里输入 `{%` 弹出标签列表。
- **语法着色**：标签名、`key:` 参数、`<!-- tab -->` 等分隔注释单独着色。
- **错误提示**：未知标签、缺少 `{% endxxx %}`、Front Matter 格式错误会在预览和状态栏标出。
- **视图**：写作 / 对照 / 预览三种视图，对照模式可拖动分栏、滚动同步；预览可切换深浅色。
- **文件**：打开本地 `.md`、导出 `.md`、复制文章 HTML。

## 与主题同步

`src/lib/stellar/vendor`、`src/lib/stellar/generated` 与 `public/stellar/stellar.css` 由脚本从同级目录的 `hexo-theme-stellar` 生成。主题升级后运行：

```bash
bun run sync:stellar
```

预览使用的站点配置写在 `_config.stellar.yml`，写法与博客根目录的同名文件相同（目前覆盖了正文与代码字体）。把博客的 `_config.stellar.yml` 内容复制过来再运行同步，预览就会按你的博客配置渲染。

主题目录不在 `../hexo-theme-stellar` 时，用 `STELLAR_THEME_DIR=/path/to/theme bun run sync:stellar` 指定。

## 渲染流程

与 Hexo 的文章渲染顺序一致（`src/lib/stellar/render.ts`）：

1. 围栏代码块先高亮（复刻 hexo-util 的 `figure.highlight` 表格结构）并替换为占位；
2. `{% 标签 %}` 替换为 `<!--￼n-->` 占位，正文交给 marked（`gfm`、`breaks` 与 hexo-renderer-marked 默认一致）；
3. 块级标签先展开内部嵌套标签，再调用原版标签函数；
4. 回填占位，并给普通表格包上 `.md-table-scroll`。

## 已知限制

- 友链、GitHub 卡片、远程 Markdown、评分投票等需要站点运行时请求数据的标签，预览中只显示占位说明。
- KaTeX 在编辑器里直接渲染，相当于博客使用支持 KaTeX 的 Markdown 渲染器；Stellar 本身只负责加载 KaTeX 样式。Mermaid 预览会把 ```mermaid 代码块转成 `<pre class="mermaid">`，博客端需要在 Hexo 的 `highlight.exclude_languages` 里排除 mermaid，或直接写 `<pre class="mermaid">`。
- `{% toc wiki:xxx %}` 依赖站点的 Wiki 数据，单篇文章编辑器中无法渲染。

## Docker 部署

推送到 GitHub 的 `main`/`master` 分支（或打 `v*` 标签）后，仓库里的 `.github/workflows/docker.yml` 会构建镜像并发布到 GitHub Container Registry，标签为 `latest`、提交短 SHA，以及版本标签对应的 `x.y.z`、`x.y`。镜像同时提供 amd64 与 arm64。

```bash
docker run -d --name stellar-writing -p 3000:3000 ghcr.io/<你的 GitHub 用户名>/<仓库名>:latest
```

镜像基于 Next.js 的 standalone 输出，运行时只有 Node 与构建产物。首次发布后，GHCR 上的包默认是私有的，可以在 GitHub 的 Packages 设置里改成公开，或者在服务器上用 `docker login ghcr.io` 登录后再拉取。
