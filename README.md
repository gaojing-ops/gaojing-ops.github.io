# 五人远征与长夜余烬

个人 GitHub Pages 首页：https://gaojing-ops.github.io/

两个游戏共用站点，通过页面上方的游戏导航切换：

- [长夜余烬 · EMBERFALL](https://gaojing-ops.github.io/games/emberfall/)：20 分钟、5 章生存肉鸽，使用作者 FluxMusou 小程序的原战斗与成长规则，含武器进化、元素协同、角色技能、芯片与天赋。首页 `/` 默认进入长夜余烬；原三分钟试炼保留在 `/games/emberfall/trial.html`。
- [五人远征 · KEYSTONE](https://gaojing-ops.github.io/games/keystone/)：五人自动秘境，选择队伍、刷本、收集装备并挑战更高钥石。

无需构建，直接静态托管。本地运行 `python -m http.server 9876`。

两款游戏分别保存本机浏览器战绩，不在设备之间同步。长夜余烬的新成长使用独立存储前缀；原试炼沿用旧战绩键。进行中的远征不跨刷新恢复。微信好友/全服排行榜不在网页接入。

代码与测试说明见 [五人远征说明](games/keystone/README.md) 和 [长夜余烬说明](games/emberfall/README.md)。地图来源、处理方式与数据边界见 [地图资料](games/keystone/maps/README.md)。
