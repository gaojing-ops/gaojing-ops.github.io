# 五人远征与长夜余烬

个人 GitHub Pages 首页：https://gaojing-ops.github.io/

两个游戏共用站点，通过页面上方的游戏导航切换：

- [五人远征 · KEYSTONE](https://gaojing-ops.github.io/games/keystone/)：五人自动秘境，选择队伍、刷本、收集装备并挑战更高钥石。首页 `/` 仍使用五人远征。
- [长夜余烬 · EMBERFALL](https://gaojing-ops.github.io/games/emberfall/)：俯视角生存肉鸽，自动攻击、五神赐福与浮动摇杆。恢复自已发布的稳定版本 `34ba545`。

无需构建，直接静态托管。本地运行 `python -m http.server 9876`。

两款游戏分别保存本机浏览器战绩，不在设备之间同步。长夜余烬沿用原有战绩键，稳定版不保存进行中的远征。

代码与测试说明见 [五人远征说明](games/keystone/README.md) 和 [长夜余烬说明](games/emberfall/README.md)。地图来源、处理方式与数据边界见 [地图资料](games/keystone/maps/README.md)。
