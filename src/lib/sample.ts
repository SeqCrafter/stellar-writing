export const SAMPLE_POST = `---
title: 用 Stellar 写一篇有温度的技术博客
date: 2026-10-14 21:30:00
updated: 2026-10-14 22:05:00
categories: [写作手记]
tags: [Stellar, Hexo, 写作]
description: 一边写，一边看见它在博客里的样子。
---

搭博客的第三年，我终于把写作流程从「写完再 \`hexo s\` 看效果」换成了实时预览。下面是一篇用到 Stellar 常用标签的示例文章，左边改一个字，右边立刻变。

## 为什么是 Stellar

Stellar 的标签插件让文章不只是一段段文字：{% mark 提示块 color:blue %}、{% mark 折叠块 color:amber %}、{% mark 时间线 color:green %}，都能直接写在 Markdown 里。快捷键 {% kbd ⌘ %} + {% kbd S %} 保存，{% psw 这一句被遮住了 %}，{% wavy 这里有波浪线 %}。

{% note color:cyan 写作建议 每一节只讲一件事，长代码放进折叠块，读者会感谢你。 %}

{% quot 好的工具让人忘记工具本身 %}

### 普通 Markdown 也照常工作

> 写作是思考的延伸。这一段是标准引用，**粗体**、*斜体*、~~删除线~~ 和 \`行内代码\` 都按 Stellar 的样式显示。

- 主题文档：[Stellar 官方文档](https://xaoxuu.com/wiki/stellar/)
- 站内链接：[归档页](/archives/)
- [x] 已完成的任务
- [ ] 还没开始的任务

1. 先写提纲
2. 再补细节

---

## 安装主题

{% tabs %}
<!-- tab npm -->
\`\`\`bash
npm i hexo-theme-stellar
\`\`\`
<!-- tab bun -->
\`\`\`bash
bun add hexo-theme-stellar
\`\`\`
{% endtabs %}

然后在站点配置里启用：

\`\`\`yaml _config.yml
theme: stellar
language: zh-CN
\`\`\`

{% copy prefix:$ hexo clean && hexo s %}

{% folding color:yellow 为什么要先 hexo clean？ %}
Hexo 会缓存渲染结果。更换主题或升级标签插件后，旧缓存可能让页面停留在旧样式，先清理一次最省心。
{% endfolding %}

## 这一年的博客

{% timeline %}
<!-- node 2026 年 10 月 -->
换上 Stellar v2，写了第一篇带时间线的文章。
<!-- node 2026 年 6 月 -->
把 38 篇旧文从 WordPress 迁到 Hexo。
<!-- node 2025 年 12 月 -->
注册域名，博客上线。
{% endtimeline %}

{% grid c:2 bg:box %}
<!-- cell -->
**写作**：每周两篇，平均 2,180 字。
<!-- cell -->
**阅读**：订阅了 17 个 RSS 源，周日集中读完。
{% endgrid %}

## 待办

{% checkbox checked:true 迁移评论系统 %}
{% checkbox color:green 给每篇文章补封面 %}
{% checkbox symbol:times color:red 放弃自建图床 %}

| 工具 | 用途 | 状态 |
| --- | --- | --- |
| Stellar | 主题 | 使用中 |
| Waline | 评论 | 迁移中 |

{% link https://xaoxuu.com/wiki/stellar/ Stellar 官方文档 %}

{% button 阅读下一篇 /blog/ icon:default:arrow-right %}

{% poetry 静夜思 author:李白 %}
床前明月光，疑是地上霜。
举头望明月，低头思故乡。
{% endpoetry %}
`
