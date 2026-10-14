// 标签目录：用于插入面板和 {% 自动补全。语法取自各标签源码头部注释与 docs/knowledge/04-标签插件。
// snippet 使用 CodeMirror 片段语法：${名称} 为可 Tab 跳转的占位。

export type TagGroup = '文本' | '容器' | '媒体' | '数据' | '阅读'

export interface TagSnippet {
  name: string
  label: string
  group: TagGroup
  syntax: string
  snippet: string
  block?: boolean
}

export const COLORS = ['red', 'orange', 'amber', 'yellow', 'green', 'cyan', 'blue', 'purple', 'light', 'dark', 'warning', 'error']

export const TAG_CATALOG: TagSnippet[] = [
  // 文本
  { name: 'mark', label: '高亮标记', group: '文本', syntax: '{% mark text [color:color] [tip:tip] %}', snippet: '{% mark ${文字} color:${blue} %}' },
  { name: 'tip', label: '悬停注解', group: '文本', syntax: '{% tip 词句 pop:注解内容 %}', snippet: '{% tip ${词句} pop:${注解内容} %}' },
  { name: 'hashtag', label: '话题标签', group: '文本', syntax: '{% hashtag text href [color:color] %}', snippet: '{% hashtag ${话题} ${/tags/} %}' },
  { name: 'icon', label: '图标', group: '文本', syntax: '{% icon key [color:color] [style:css] %}', snippet: '{% icon ${default:rss} %}' },
  { name: 'emoji', label: '表情', group: '文本', syntax: '{% emoji [source] name [height:1.75em] %}', snippet: '{% emoji ${blobcat} ${blobcatheart} %}' },
  { name: 'kbd', label: '按键', group: '文本', syntax: '{% kbd 文本 %}', snippet: '{% kbd ${⌘} %}' },
  { name: 'u', label: '下划线', group: '文本', syntax: '{% u 文本 %}', snippet: '{% u ${文本} %}' },
  { name: 'emp', label: '着重号', group: '文本', syntax: '{% emp 文本 %}', snippet: '{% emp ${文本} %}' },
  { name: 'wavy', label: '波浪线', group: '文本', syntax: '{% wavy 文本 %}', snippet: '{% wavy ${文本} %}' },
  { name: 'del', label: '删除线', group: '文本', syntax: '{% del 文本 %}', snippet: '{% del ${文本} %}' },
  { name: 'psw', label: '密码遮挡', group: '文本', syntax: '{% psw 文本 %}', snippet: '{% psw ${文本} %}' },
  { name: 'blur', label: '模糊', group: '文本', syntax: '{% blur 文本 %}', snippet: '{% blur ${文本} %}' },
  { name: 'sup', label: '上标', group: '文本', syntax: '{% sup text [color:color] %}', snippet: '{% sup ${[1]} color:${red} %}' },
  { name: 'sub', label: '下标', group: '文本', syntax: '{% sub text [color:color] %}', snippet: '{% sub ${2} %}' },
  { name: 'quot', label: '引号强调', group: '文本', syntax: '{% quot [el:h2] [icon:variant/key] text %}', snippet: '{% quot ${一句值得被记住的话} %}' },
  { name: 'button', label: '按钮', group: '文本', syntax: '{% button [color:color] text url [icon:key] [size:xs] %}', snippet: '{% button ${按钮文字} ${https://} %}' },
  { name: 'copy', label: '复制框', group: '文本', syntax: '{% copy [git:https/ssh/gh] [prefix:$] text %}', snippet: '{% copy prefix:$ ${npm i hexo-theme-stellar} %}' },
  { name: 'checkbox', label: '复选框', group: '文本', syntax: '{% checkbox [checked:false] [color:cyan] [symbol:plus/minus/times] text %}', snippet: '{% checkbox checked:${true} ${待办事项} %}' },
  { name: 'radio', label: '单选框', group: '文本', syntax: '{% radio [checked:false] [color:cyan] text %}', snippet: '{% radio checked:${true} ${选项} %}' },
  { name: 'link', label: '链接卡片', group: '文本', syntax: '{% link url [title] [desc:true/false] [icon:src] %}', snippet: '{% link ${https://xaoxuu.com/wiki/stellar/} ${Stellar 文档} %}' },
  { name: 'navbar', label: '导航栏', group: '文本', syntax: '{% navbar [active:url] [markdown-link] ... %}', snippet: '{% navbar active:${/} [首页](/) [关于](/about/) %}' },
  // 容器
  { name: 'note', label: '提示块', group: '容器', syntax: '{% note [color:color] [title] content %}', snippet: '{% note color:${blue} ${标题} ${正文内容} %}' },
  { name: 'box', label: '盒子', group: '容器', syntax: '{% box [color:color] [child:codeblock/tabs] title %}…{% endbox %}', snippet: '{% box color:${cyan} ${标题} %}\n${正文}\n{% endbox %}', block: true },
  { name: 'folding', label: '折叠块', group: '容器', syntax: '{% folding [color:yellow] [child:codeblock] [open:false] title %}…{% endfolding %}', snippet: '{% folding ${点击展开} %}\n${折叠内容}\n{% endfolding %}', block: true },
  { name: 'folders', label: '折叠组', group: '容器', syntax: '{% folders %}<!-- folder 标题 -->…{% endfolders %}', snippet: '{% folders %}\n<!-- folder ${问题一} -->\n${回答一}\n<!-- folder 问题二 -->\n回答二\n{% endfolders %}', block: true },
  { name: 'tabs', label: '标签页', group: '容器', syntax: '{% tabs [active:1] [align:center] %}<!-- tab 名称 -->…{% endtabs %}', snippet: '{% tabs %}\n<!-- tab ${macOS} -->\n${内容一}\n<!-- tab Windows -->\n内容二\n{% endtabs %}', block: true },
  { name: 'grid', label: '网格', group: '容器', syntax: '{% grid [bg:box/card] [w:240px] [c:2] [gap:16px] %}<!-- cell -->…{% endgrid %}', snippet: '{% grid c:2 bg:${box} %}\n<!-- cell -->\n${左侧}\n<!-- cell -->\n右侧\n{% endgrid %}', block: true },
  { name: 'dropdown', label: '下拉菜单', group: '容器', syntax: '{% dropdown [direction:up/down] [align:left/right] title %}- [title](url){% enddropdown %}', snippet: '{% dropdown ${更多} %}\n- [${文档}](https://xaoxuu.com/wiki/stellar/)\n{% enddropdown %}', block: true },
  { name: 'table', label: '表格容器', group: '容器', syntax: '{% table [style:scroll|wrap|compact] %}…{% endtable %}', snippet: '{% table style:${wrap} %}\n| 列1 | 列2 |\n| --- | --- |\n| a | b |\n{% endtable %}', block: true },
  { name: 'blockquote', label: '引用块', group: '容器', syntax: '{% blockquote [indent:true/false] %}…{% endblockquote %}', snippet: '{% blockquote %}\n${引用内容}\n{% endblockquote %}', block: true },
  { name: 'timeline', label: '时间线', group: '容器', syntax: '{% timeline %}<!-- node 标题 -->…{% endtimeline %}', snippet: '{% timeline %}\n<!-- node ${2026 年 10 月} -->\n${发生了什么}\n<!-- node 2026 年 9 月 -->\n更早的事\n{% endtimeline %}', block: true },
  { name: 'okr', label: 'OKR', group: '容器', syntax: '{% okr o1 percent:50 status:in_track %}…{% endokr %}', snippet: '{% okr o1 percent:${60} status:in_track %}\n${目标标题}\n<!-- okr kr1 percent:100 status:finished -->\n关键结果一\n<!-- okr kr2 percent:20 status:at_risk -->\n关键结果二\n{% endokr %}', block: true },
  { name: 'banner', label: '横幅', group: '容器', syntax: '{% banner title [subtitle] [bg:src] [avatar:src] [link] %}…{% endbanner %}', snippet: '{% banner ${标题} ${副标题} bg:${https://} %}\n{% endbanner %}', block: true },
  // 媒体
  { name: 'image', label: '图片', group: '媒体', syntax: '{% image src [alt] [width:400px] [bg:#eee] [download:true] %}', snippet: '{% image ${https://} ${图片说明} %}' },
  { name: 'gallery', label: '相册', group: '媒体', syntax: '{% gallery [layout:grid/flow] [size:mix/s/m/l/xl] %}![](src){% endgallery %}', snippet: '{% gallery %}\n![${说明}](${https://})\n{% endgallery %}', block: true },
  { name: 'swiper', label: '轮播', group: '媒体', syntax: '{% swiper [width:max] [effect:cards] %}![](src){% endswiper %}', snippet: '{% swiper %}\n![${说明}](${https://})\n{% endswiper %}', block: true },
  { name: 'audio', label: '音频', group: '媒体', syntax: '{% audio src %}', snippet: '{% audio ${https://} %}' },
  { name: 'video', label: '视频', group: '媒体', syntax: '{% video src %}', snippet: '{% video ${https://} %}' },
  { name: 'frame', label: '设备框', group: '媒体', syntax: '{% frame iphone11 [img:src] [video:url] [focus:top/bottom] %}', snippet: '{% frame iphone11 img:${https://} %}' },
  // 数据
  { name: 'ghcard', label: 'GitHub 卡片', group: '数据', syntax: '{% ghcard user/repo [theme:xxx] %}', snippet: '{% ghcard ${xaoxuu/hexo-theme-stellar} %}' },
  { name: 'friends', label: '友链', group: '数据', syntax: '{% friends [group] [repo:owner/repo] [api:http] %}', snippet: '{% friends ${group} %}' },
  { name: 'sites', label: '网站卡片', group: '数据', syntax: '{% sites [group] [repo:owner/repo] [api:http] %}', snippet: '{% sites ${group} %}' },
  { name: 'albums', label: '专辑', group: '数据', syntax: '{% albums [group] [repo:owner/repo] [size:s/m/l/xl/mix] %}', snippet: '{% albums ${group} %}' },
  { name: 'posters', label: '海报', group: '数据', syntax: '{% posters [group] [repo:owner/repo] [size:s/m/l/xl/mix] %}', snippet: '{% posters ${group} %}' },
  { name: 'gist', label: 'Gist', group: '数据', syntax: '{% gist owner/id [file:name] %}', snippet: '{% gist ${owner/id} %}' },
  { name: 'md', label: '远程 Markdown', group: '数据', syntax: '{% md src [wrap:true|false] %}', snippet: '{% md ${https://raw.githubusercontent.com/} %}' },
  { name: 'rating', label: '评分', group: '数据', syntax: '{% rating id %}', snippet: '{% rating ${id} %}' },
  { name: 'vote', label: '投票', group: '数据', syntax: '{% vote id %}', snippet: '{% vote ${id} %}' },
  { name: 'mbti', label: 'MBTI', group: '数据', syntax: '{% mbti INTJ-T 93-72-78-83-51 [url:] [image:] %}', snippet: '{% mbti ${INTJ-T} ${93-72-78-83-51} %}' },
  { name: 'chat', label: '聊天记录', group: '数据', syntax: '{% chat device [style:wechat/qq] [title:] %}…{% endchat %}', snippet: '{% chat ${phone} style:wechat title:${群聊} me:me %}\nme:\n  name: 我\n  avatar: https://gcore.jsdelivr.net/gh/cdn-x/placeholder@1.0.12/avatar/round/3442075.svg\nfriend:\n  name: 朋友\n  avatar: https://gcore.jsdelivr.net/gh/cdn-x/placeholder@1.0.12/avatar/round/3442075.svg\n<!-- chatcell user:friend md:今晚吃什么？ -->\n<!-- chatcell user:me md:${火锅} -->\n{% endchat %}', block: true },
  // 阅读
  { name: 'poetry', label: '诗词', group: '阅读', syntax: '{% poetry [title] [author:作者] [date:日期] [footer:] %}…{% endpoetry %}', snippet: '{% poetry ${静夜思} author:${李白} %}\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。\n{% endpoetry %}', block: true },
  { name: 'reel', label: '卷轴', group: '阅读', syntax: '{% reel [title] [author:作者] [date:日期] %}…{% endreel %}', snippet: '{% reel ${标题} author:${作者} %}\n${正文}\n{% endreel %}', block: true },
  { name: 'paper', label: '信笺', group: '阅读', syntax: '{% paper [style:underline] [title:] [author:] %}…{% endpaper %}', snippet: '{% paper style:underline title:${标题} %}\n<!-- section 第一节 -->\n${内容}\n{% endpaper %}', block: true },
]

export const TAG_GROUPS: TagGroup[] = ['文本', '容器', '媒体', '数据', '阅读']
