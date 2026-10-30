# 长夜余烬 · EMBERFALL

默认入口 `/games/emberfall/` 使用作者的 FluxMusou / gecao 微信小游戏原玩法：20 分钟、5 个章节，每章 240 秒。未按旧网页的三分钟节奏压缩数值。

当前导入源码包含 34 种武器、26 种被动、9 个角色及 10 种 Boss 定义，以及武器进化、元素协同、诅咒、事件、遗物、宠物、天赋、芯片成长、章节奖励、每日挑战、首领连战、速通与无尽模式。以实际代码为准，不沿用旧交接文档中的过期数量或数值。

- 默认原玩法：`index.html`、`flux.css`、`flux/browser.mjs`、`flux/bundle.mjs`。
- 原三分钟试炼：`trial.html`、`app.js`、`game.js`、`styles.css`、`touch-controls.js`；保留原浏览器战绩。
- 移植细节、原规则和验证范围：[开发说明](../../docs/GECAO_INTEGRATION.md)。

## 操作与存档

电脑：WASD / 方向键移动，空格闪避，E 技能，P / Esc 暂停，数字 1–5 选择升级。手机：拖动战斗画面移动，点击画面中的闪避与技能按钮。界面同时提供可键盘操作的选角、开局、升级与章节奖励按钮。

失焦、隐藏页面时暂停；返回后手动继续。局外成长和战绩保存在当前浏览器，不接微信存档与好友排行榜。新成长前缀为 `gaojing-emberfall-flux-v1:`，不覆盖旧试炼的 `gaojing-emberfall-v1`。进行中的远征不跨刷新恢复。

## 开发

仓库根目录执行 `python -m http.server 9876`，访问 `/games/emberfall/`。GitHub Pages 直接托管已生成的静态文件。

修改导入模块后执行 `node scripts/build-gecao.mjs`，确定性生成浏览器模块包。仅使用 Node 标准库，无需安装依赖。不要直接编辑生成的 `flux/bundle.mjs`。

测试：`node --test tests/gecao.test.mjs tests/gecao-browser.test.mjs`。旧试炼测试继续保留。
