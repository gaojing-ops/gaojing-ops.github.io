# 地图资料与处理方式

本项目通过 Mythic Dungeon Tools 的公开地图贴图与敌人/首领坐标参考《魔兽世界》游戏内副本地图，替换上一版所有副本共用的蛇形节点。地图坐标采用 MDT 1000 × 666.6667 平面，源数据 y 轴翻转。

- 来源：https://github.com/Nnoggie/MythicDungeonTools
- 固定参考提交：04e5b122918ebf1cf1c2459677a01f55c13c2f07
- 来源文件：`Midnight/*.lua` 与 `Midnight/Textures/{Dungeon}/1_*.png`
- 本地保留原始坐标来源：`../vendor/mdt-source/`；MDT 的 GPL-2.0 许可全文在 `../vendor/MDT-LICENSE.txt` 与仓库根 `LICENSE`。
- 游戏地图图像版权属于 Blizzard Entertainment；本项目的图集由来源中的 15 × 10 瓦片拼接、缩放成 WebP，于 2026-10-30 处理。未使用受限玩家路线、回放或付费数据。

`source.json` 记录来源提交、入口、首领和怪群坐标。`../maps.js` 的路线为本作依据底图和坐标人工编排，选择 12—16 处遭遇并设置走廊转折，并非还原全部怪群或官方最佳路线。首领使用实际名称和位置，四首领副本保留四场首领战；战斗、掉落与数值仍为休闲改编。

刷新参考素材：`python scripts/import-keystone-maps.py`；重建本作路线：`python scripts/build-keystone-routes.py`。源码公开，可从 Git 历史恢复已移除的旧项目。不会修改其他本地工作目录中的未提交文件。
