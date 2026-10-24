# QQ宠物社区补档

这三份 SWF 是为原生网页迁移保留的固定对照版本，按原字节存储，使用独立 Ruffle 播放页。原生 HTML / Canvas / JavaScript 版本另见 [QPetGamesWeb](https://qpetlover.cn/QPetGamesWeb/)。

文件来自 [xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation/tree/main/qq-pet-macos/src/assets/game)，地下城和 QQ堂也在 [whnbd/QQPet](https://github.com/whnbd/QQPet/tree/main/resources/assets/game) 找到同字节副本。固定 SHA 说明本次使用的具体版本，不证明社区文件与历史官方发布逐字节一致。素材权利仍属于原作者。

| 对照页 | 文件 | 字节数 | SHA-256 |
| --- | --- | ---: | --- |
| [宠爱森林](https://qpetlover.cn/QPetGames/#/play/happy-forest) | `swf/forest.swf` | 1044839 | `cfc82b0fda9e38bf48151af64422d89e904b32a772c7863fc048ca88c5fe1e1b` |
| [宠爱QQ堂](https://qpetlover.cn/QPetGames/#/play/happy-qqtang) | `swf/qqtang.swf` | 981342 | `c8b38507e58d1d0b9aedcdd356c91b5638333253654c6508ab505161e5c9630a` |
| [地下城与勇士 · Q宠版](https://qpetlover.cn/QPetGames/#/play/happy-dungeon) | `swf/dungeon.swf` | 2689767 | `b6f281f708ebf6342840141b6d3785dedfc26be80d59ef09fcfe0fea596cef48` |

森林固定件于 2026-10-22 取得，QQ堂与地下城于 2026-10-23 取得。封面从各自 SWF 的菜单帧静态导出。SWF 由 Git LFS 保存，构建会核验实际内容、字节数与哈希。

QQ堂原宿主通过 FlashVars 提供 `sex`，本页传入 `sex=2`，使用 QMM；这不修改游戏文件。未提供该字段的裸 SWF 会出现不同的角色初始化，不能作为正常宿主对照。

地下城的社区文件名为“QQ地下城与勇士之Q宠版”；历史官方名称是否为“宠爱地下城”、是否属于欢乐谷以及社区修改情况尚未确证。本站采用文件内部标题，单独标注社区版本，不把推测写成归属结论。

旧客户端账号、积分、榜单、兑换和导航服务可能已经失效；能运行本地玩法不代表这些外部服务恢复。本站使用自托管 Ruffle 0.5.0，模拟器行为也需与原脚本证据分别理解。
