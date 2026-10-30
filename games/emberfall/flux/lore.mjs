// Presentation vocabulary only. Stable gameplay IDs, formulas and saves are untouched.
const table=source=>Object.fromEntries(source.trim().split('\n').map(row=>{const [id,name,...description]=row.split('|');return [id,{name,desc:description.join('|')}];}));
export const LORE={
 characters:table(`
tracer|守灯人|提灯穿林 · 越行越勇
walker|铁卫|铁誓不退 · 以甲还击
gunner|逐风者|逐风挽弓 · 站定蓄势
cryomancer|霜语者|霜语成咒 · 碎冰伤敌
biohazard|毒枝术士|荆枝染毒 · 以毒回春
berserker|破晓狂刃|燃血挥刃 · 残灯破晓
arcane|星纱法师|星火织咒 · 五灵合鸣
engineer|符文工匠|巧手铭灯 · 三灯守阵
assassin|暮影刺客|暮影藏锋 · 疾步猎夜
`),
 weapons:table(`
flux_bolt|引路烛|放出追寻敌人的烛火，轻微修正飞行方向。
chain_spark|跃枝雷|雷光击中敌人后，跃向附近的下一名敌人。
pulse_ring|晨钟波|敲响无形的晨钟，向四周推开一圈伤害波纹。
radiation_field|守夜灯阵|灯阵环绕自身，持续灼伤近处的敌人。
soul_drain|牵魂灯|牵住生命最微弱的敌人，持续汲取生命。
shadow_clone|暮影随行|唤出一道暮影，复制你的攻击。
plasma_arc|弦月火刃|掷出炽热的弦月，穿透沿途的敌人。
napalm|余烬陶罐|抛出盛满余烬的陶罐，在落点留下一片火池。
rocket_swarm|逐星焰|放出数簇逐敌而行的星焰。
ice_shard|霜棘|冰棘穿过敌阵，使命中的敌人减速。
glacial_nova|寒潭回响|迸发寒气，冻结周围的敌人。
frozen_orb|绕月冰轮|冰轮旋转巡游，不断射出冰锥。
toxin_spray|腐枝吐息|向前散出扇形毒雾，持续侵蚀敌人。
acid_pool|蚀根沼|在地面留下腐蚀敌人的毒沼。
venom_sting|荆毒针|以淬毒的荆刺叠加敌人的中毒层数。
boomerang|归途骨镖|骨镖穿过敌群后沿原路返回，往返均可命中。
chain_drill|棘轮刃|在身前转动带刺的刃轮，持续切割近敌。
holy_water|净火圣瓶|圣瓶落地碎裂，留下灼伤并减速敌人的净火。
phase_blade|渡影刀|向身前挥出弧形斩击，伤及范围内的敌人。
gravity_cannon|坠星石|在目标处结出引力涡流，聚拢敌人后引爆。
nano_swarm|蚀骨萤群|唤来环绕自身的毒萤，持续为敌人施毒。
fusion_orbital_cannon|黎明天罚|唤下贯穿敌阵的天光，对范围内敌人造成伤害。
fusion_absolute_zero|霜腐幽潭|展开寒毒交织的幽潭，同时冻结并腐蚀敌人。
fusion_singularity|吞星之瞳|放出缓慢前行的暗涡，牵引并绞伤敌人。
void_singularity|无光深井|灯阵化为深井，聚拢敌人并汲取生命。
singularity_cannon|陨星深渊|掷出凝聚的暗星，以更大的引力吞没敌阵。
blood_boomerang|饮血归途|骨镖不再受穿透数量限制，命中时汲取生命。
blood_ripper|猩红棘轮|刃轮的切割范围扩大，击杀敌人时恢复生命。
holy_fire_zone|圣焰审判|净火蔓延成更大的审判区域，灼烧并拖慢敌群。
phantom_blade|夜渡长锋|斩击放出暗影波，伤敌的同时汲取生命。
nano_plague|万萤腐夜|毒萤扩散至整片战场，持续侵蚀敌群。
fusion_meat_grinder|血棘龙卷|刃轮与回旋之力合流，向四周掀起近战风暴。
fusion_cryo_toxic|寒毒结界|以霜与毒笼罩周围，让敌人同时承受冻结与中毒。
fusion_doom_storm|终夜焰风|爆裂的回旋焰席卷战场，覆盖大范围敌人。
`),
 passives:table(`
overclocker|急咏符|武器冷却时间减少 6%。
nano_repair|回春苔|每秒恢复 0.3 生命。
energy_amp|长明烛芯|攻击范围增加 10%。
spinach|赤心护符|伤害增加 10%。
bracer|疾风腕带|投射物飞行速度增加 10%。
duplicator|双生羽|投射物数量增加 1。
armor|旧铁甲片|护甲增加 1。
wings|轻羽靴|移动速度增加 10%。
attractorb|归烬铃|拾取范围增加 20%。
cryo_core|不融霜心|冻结持续时间增加 15%。
frost_armor|霜织披肩|受伤时，以寒霜冻结攻击者。
chill_aura|寒枝环|令身边的敌人减速。
toxic_sac|苦荆囊|毒素伤害增加 20%。
corrosion|蚀骨露|对中毒敌人的伤害增加 10%。
plague_spread|蔓毒种|中毒的敌人死亡后，将毒素传给附近敌人。
lucky_shot|幸存者之签|攻击有 5% 几率造成双倍伤害。
void_core|幽井石|每次击杀恢复 1 生命。
shadow_step|暮行履|受伤时有几率短暂免受伤害。
soul_harvest|收魂结|每次击杀使伤害增加 2%，最多增加 50%。
thermal_core|炉心余炭|燃烧伤害增加 25%。
explosive_rounds|爆焰符|攻击附带爆炸效果。
overheat|不熄战意|持续攻击时，伤害逐渐提升。
xp_magnet|拾光袋|获得的经验增加 15%。
critical_eye|夜枭之眼|暴击伤害增加 50%。
second_wind|末火誓言|生命垂危时，伤害增加 30%。
hunter_instinct|猎夜纹|对精英与首领的伤害增加 12%。
`),
 evolution:table(`
flux_bolt|长明天光|烛火连成不间断的贯穿光束。
chain_spark|万枝雷网|雷光可弹射 8 次，并在弹射时分裂。
pulse_ring|破晓雷鸣|晨钟唤来雷链，扫过整片战场。
radiation_field|无光深井|灯阵化为引力深井，聚敌并汲取生命。
soul_drain|五灯引魂|同时牵住 5 名敌人，持续汲取生命。
shadow_clone|暮影成军|唤出 3 道可独立攻击的暮影。
plasma_arc|赤月旋焰|火刃向 360° 旋转展开，形成环形火浪。
napalm|不熄火原|火池面积变为 3 倍，燃烧更持久。
rocket_swarm|流星焰雨|星焰在战场各处落下，轰击敌群。
ice_shard|万物霜寂|冰棘获得 12 次穿透，并以爆裂寒霜冻结敌人。
glacial_nova|永夜冰庭|寒潭回响化为持续冻结周围敌人的领域。
frozen_orb|满城飞雪|冰轮唤来覆盖战场的暴风雪。
toxin_spray|蔓雾之海|毒雾蔓延至整片战场。
acid_pool|腐雨长夜|腐蚀之雨落遍战场。
venom_sting|千荆疫种|中毒敌人死亡时引发传染与毒爆。
boomerang|饮血归途|骨镖获得无限穿透，并在命中时汲取生命。
chain_drill|猩红棘轮|刃轮范围扩大为 2 倍，击杀时恢复生命。
holy_water|圣焰审判|火焰区域扩大为 3 倍，同时灼烧并减速敌人。
phase_blade|夜渡长锋|斩击放出暗影波，并汲取敌人的生命。
gravity_cannon|陨星深渊|引力吸附范围扩大为 2 倍，引爆伤害变为 3 倍。
nano_swarm|万萤腐夜|毒萤飞遍战场，持续腐蚀敌群。
`),
 skills:table(`
tracer|提灯疾行|提起灯火穿过敌阵：持续 1.5 秒，额外移动速度 +200%，期间免受伤害。
walker|不退之誓|立下守夜誓言：持续 5 秒，护甲 +15，反伤比例增加 50 个百分点。
gunner|一箭破晓|凝神瞄准暗处的敌人：持续 6 秒，伤害加成增加 100 个百分点。
cryomancer|霜月临世|唤起寒霜，冻结非首领敌人 4 秒。
biohazard|千枝染毒|让半径 300 范围内的非首领敌人染上 8 秒剧毒，并叠加 10 层中毒。
berserker|燃血誓刃|以血燃刃：持续 8 秒，移动速度 +30%，伤害加成 +60%。
arcane|星火回潮|立即重置武器冷却，并在 6 秒内增加 50 个百分点的冷却缩减。
engineer|三灯守阵|在身边立起 3 座符灯，自动攻击敌人，持续 20 秒。
assassin|暮影折返|瞬移到最近的非首领敌人身旁，对半径 100 内的非首领敌人造成 80 × 伤害倍率的伤害。
`),
 pets:table(`
dog|寻烬灵犬|替你寻找散落在战场上的经验与余烬。
medic|回春萤灵|每 60 秒提供一次护盾或治疗。
drone|猎夜灯灵|自动攻击附近的精英与首领。
`),
 auras:table(`
cyber_ring|古誓灯环|旧誓化作缓缓流转的脚下灯纹。
crimson_aegis|绯月庇护|血月之光留下一道护佑的残影。
aurora_trail|流萤足迹|行过之处，星尘随步浮起。
void_phantom|幽夜随影|一缕幽影随行，隐入夜色。
crown_of_kings|晨王之冕|以晨光为冠，承接守夜者的誓言。
`),
 relics:table(`
antimatter_engine|烬行足印|移动时，对路径上的敌人造成伤害。
time_shard|停钟残片|静止 2 秒后，攻击速度变为 3 倍。
overload_core|燃命灯芯|伤害变为 2 倍，代价是无法恢复生命。
revival_node|还魂灯盏|死亡时以 30% 生命复起，每局一次。
mirror_chip|双面古镜|获得被动时，有 15% 几率再复制一份。
critical_mass|惊雷石|暴击时，对附近敌人造成范围伤害。
void_contract|幽井契书|每击杀 100 名敌人，获得一件随机遗物。
limit_break|残火不灭|生命低于 10% 时，获得 3 秒无敌，每局一次。
quantum_dice|五岔命签|升级时，从 5 个选项中选择 1 个。
greed_protocol|贪烬誓约|余烬掉落变为 2 倍，最大生命降低 30%。
echo_chip|回响贝|每次攻击有 20% 几率再攻击一次。
bloodrage|血誓护符|生命越低，伤害越高，最高变为 2.5 倍。
elemental_core|五灵结晶|元素武器伤害增加 30%。
frenzy_module|连战旌旗|连击持续时，伤害逐渐提升。
lucky_coin|幸存铜钱|暴击率增加 15%。
magnet_core|百烬归铃|拾取范围增加 100%。
time_dilation|迟暮沙漏|受伤时，短暂减缓附近敌人的动作。
explosive_blood|烫血荆冠|受伤时，对附近敌人造成伤害。
shield_gen|守灯石|每 30 秒获得一次临时护盾。
tiny_wings|燕尾羽|移动速度增加 20%。
regen_drone|回春灯灵|每秒恢复 1 生命。
xp_boost|旧旅手札|获得的经验增加 25%。
phase_shield|渡影披风|每次受击后，获得 1.5 秒无敌。
bullet_matrix|八方灯阵|每 20 秒向 8 个方向发出一轮攻击。
vampire_pact|饮血古契|每击杀 5 名敌人，恢复 1 生命。
resonance_core|合鸣石|持有至少 3 种武器时，伤害增加 20%。
scrap_recycle|弃物拾烬|放逐一个强化选项时，获得 10 余烬。
`),
 enemies:table(`
Bat|暮蝠|轻盈的夜行群兽。生命较低，常从四周逼近。
Skeleton|枯骨兵|被黑潮唤醒的旧兵，以近战追逐守夜者。
Ghost|游魂|沿直线追索生者的气息，持续逼近。
DataWorm|腐根巨蠕|从林地深处钻出的巨蠕。行动较慢，却十分耐打。
SwarmDrone|噬烬蜂群|成群涌来的食火蜂，善于以速度围住目标。
Hornet|刺冠蜂|更凶猛的蜂群猎手，接近时应及时拉开距离。
FireFly|爆焰萤|腹中藏着不稳的火种，接触时会爆裂。
Crawler|苔爪虫|贴地爬行的群虫，数量多时宜用范围攻击清理。
WarpMite|折影螨|以短距离瞬移接近猎物，留心身边突然出现的暗影。
Turret|诅咒弩座|固守远处、连续射击的旧弩座。
LaserDrone|烬眼浮灵|与守夜者保持距离，持续放出伤人的光线。
ScatterGun|碎骨弩手|向前方散射骨矢，近处更难避开。
SpiralCaster|旋咒巫灵|放出旋转扩散的咒弹，留出横移的空间。
MortarDrone|抛焰灯鬼|向远处抛射火焰，地面落点会提前示警。
ChainGunner|连弩尸卫|连续射出密集骨矢，宜尽早处理。
FrostWisp|寒灯幽魂|触碰时施加冻结，避免被它近身困住。
SlimeGlob|腐沼黏团|黏液会拖慢脚步，多只接近时尤其危险。
CyberSpider|铜骨蛛|被旧符文驱动的蛛兽，死后会散出幼蛛。
GlitchEntity|裂影怪|身形在暗处闪烁，让接近路线难以判断。
FrostTitan|霜岩巨兽|巨大的霜石生命，带着危险的寒气领域。
PlagueSource|疫根母株|持续向周围散出毒云，不宜在它身边停留。
IronGolem|古铁傀儡|沉重而缓慢的守卫，需要持续攻击才能击倒。
RoyalSlime|腐沼君王|庞大的黏液生命，以厚重身躯挤压战场。
VoidLeech|噬魂蛭|伤及守夜者时会恢复自身生命，应尽快击杀。
Assassin|潜夜猎手|藏身暗处、伺机接近的刺客。
Bomber|抱火亡徒|抱着火种逼近目标，保持距离处理。
ShieldBearer|持盾枯卫|举着旧盾前行的亡者，正面较难突破。
Charger|奔角兽|沿着目标方向猛冲，留心冲锋前的空当。
MiniSpider|铜骨幼蛛|从母蛛残骸中爬出的小型追猎者。
ToxicBlob|毒沼泡|携带腐毒的黏团，避免与其接触。
Healer|续魂祭司|为同伴续命的黑潮祭司，应优先清除。
ShieldPriest|护咒祭司|以护咒庇佑周围同伴，先打破敌群的保护。
LootGoblin|窃烬小妖|携带战利品逃窜的小妖，追上它可获得补给。
Splitter|裂生怪|死亡时分出更小的个体，留意后续追兵。
Phantom|无面影|在夜色中游移的残影，持续威胁近处目标。
`)
};

LORE.meta=table(`
meta_hp|厚生之誓|每阶使最大生命增加 10。
meta_might|磨刃之誓|每阶使伤害增加 2%。
meta_speed|疾行之誓|每阶使移动速度增加 3%。
meta_pickup|归烬之誓|每阶使拾取范围增加 10%。
meta_cdr|急咏之誓|每阶使武器冷却减少 3%。
meta_regen|回春之誓|每阶使每秒生命恢复增加 0.2。
meta_reroll|再问命途|每阶使每局重抽强化的次数增加 1。
meta_skip|暂辞馈赠|每阶使每局跳过强化的次数增加 1。
meta_banish|断舍之签|每阶使每局放逐强化的次数增加 1。
meta_mastery|致命之誓|每阶使暴击率增加 5%。
`);
LORE.events=table(`
gem_rain|流萤坠星|经验结晶从夜空中散落，趁此收集成长的力量。
heal_shrine|回春古灯|古灯赐福，恢复 50% 生命。
treasure_zone|林间藏烬|在发光区域停留 3 秒，获得大量经验。
weapon_surge|焰盛之刻|所有武器伤害增加 30%，持续 20 秒。
speed_burst|疾风借步|移动速度增加 50%，持续 15 秒。
xp_surge|顿悟之夜|获得的经验变为 4 倍，持续 15 秒。
magnet_pull|百烬归途|战场上的经验结晶立即向你汇聚。
cooldown_reset|再咏之刻|所有武器的冷却立即重置。
armor_boost|坚壁赐福|护甲增加 15，持续 30 秒。
weapon_upgrade_free|磨刃之赠|随机一件武器立即提升 1 级。
elite_challenge|林中悍影|一名强化精英逼近，击败它可获得大量经验。
time_rift|急潮之隙|敌人移动速度变为 2 倍，经验变为 3 倍，持续 10 秒。
monster_nest|群兽巢穴|在 30 秒内击败 20 名敌人，获得一次强化机会。
density_surge|万兽入林|敌人数量变为 3 倍，经验变为 2 倍，持续 20 秒。
survival_test|不沾尘誓|坚持 15 秒不受伤，成功后恢复全部生命。
boss_vanguard|首影先行|一名首领先锋逼近，击败它可额外获得余烬。
weapon_seal|暂封一器|随机封印一件武器 25 秒，期间经验变为 3 倍。
cursed_speed|催命夜风|敌人速度变为 2 倍，持续 20 秒，换得战场上的全部经验结晶。
void_hunt|幽夜追猎|一名幽夜猎手正在追索你的灯火，击败它可获得稀有强化。
drain_field|燃命余焰|持续失去生命，换来 50% 伤害加成，持续 30 秒。
`);
export const TRAITS={
 tracer:'轻装赶路，移动速度加成 +25%。持续移动时，伤害加成每秒积累 2.5%，最多 +50%；停步后逐渐消退。',
 walker:'以重甲守住灯火：护甲 +3，受到伤害时反弹其中的 25%。',
 gunner:'拉开长弓，攻击范围 +40%。站定至少 1 秒后，额外获得 35% 伤害加成。',
 cryomancer:'寒霜更难消散，冻结持续时间 +60%。被冻结的敌人死亡时，会引发碎冰爆炸。',
 biohazard:'荆毒伤害 +80%。击败中毒的敌人时，恢复 3 生命。',
 berserker:'生命越低，战意越盛。生命不高于 30% 时，额外伤害加成 +50%，冷却缩减增加 20 个百分点。',
 arcane:'调和五灵，伤害加成 +15%，元素协同伤害 +50%。',
 engineer:'投射物数量 +2，冷却缩减增加 15 个百分点。每 15 秒立起一座自动攻击的符灯。',
 assassin:'踏影而行，移动速度加成 +40%，暴击率 +10%，暴击伤害加成 +100%。'
};
LORE.curses=table(`
curse_enemy_speed|疾行黑潮|敌人移动速度增加 25%。
curse_half_hp|半盏残灯|以一半生命启程。
curse_fog|沉雾长夜|浓雾收紧视野，可见范围大幅缩小。
curse_enemy_hp|厚壳黑潮|敌人生命增加 50%。
curse_no_heal|枯竭之誓|本次远征无法恢复生命。
curse_boss_rage|怒潮催命|首领出现间隔缩短 30 秒。
curse_elite_surge|群英入夜|精英生成率变为 5 倍。
curse_debuff_xp|迟悟之途|获得的经验减少 40%。
curse_double_boss|双影临门|每次同时出现 2 名首领。
curse_enemy_damage|利爪黑潮|敌人伤害增加 50%。
curse_spawn_rate|万兽奔林|敌人生成速度变为 2 倍。
curse_no_pickup|空手渡夜|无法拾取战场上的补给道具。
curse_health_decay|漏火之灯|每秒损失 1 生命。
curse_armor_break|碎甲之誓|护甲效果降低 50%。
curse_might_down|钝刃前行|伤害降低 20%。
curse_speed_down|沉石缚足|移动速度降低 20%。
curse_single_weapon|一器守夜|只能使用初始武器，无法获得新武器。
curse_limited_time|五分残烛|本次存活时间上限为 5 分钟。
`);
LORE.builds=table(`
firepower|赤焰焚林|以三件火焰武器起步，额外获得 20% 伤害加成。
frostControl|霜庭守望|以三件寒霜武器起步，额外获得 20% 冷却缩减。
poisonDot|荆毒蔓生|以三件荆毒武器起步，额外获得 15% 伤害加成。
critAssassin|暮刃猎夜|以爆发与汲取生命的武器起步，伤害 +30%，冷却缩减 +10%。
custom1|旧途行装|保存并沿用你在远征中收集的武器与护符。
`);
const talentNames={
 power:['磨刃','赤心','锐锋','长烛','双生火','燎原','断铁','火原','合鸣','战鼓','疾矢','习刃','破阵','烈火','穿林','焚夜之誓'],
 skill:['初咏','再咏','踏风','飞羽','疾步','急咏','追风','流咏','明目','远矢','风护','游林','穿云','无歇','归铃','流时之誓'],
 survival:['厚生','锻甲','深息','铁心','久守','坚壁','微光','不屈','春芽','涌泉','回春','拾光','百烬','丰生','磐石','不灭之誓']
};
LORE.talents={};
LORE.skins={};
const skinNames=['原誓灯色','晨金余焰','幽夜微光','赤月烛焰','原誓灯色','霜庭守誓','古铁寒辉','血月旧誓','原誓灯色','苔林隐衣','雷枝曳光','黑曜夜色','原誓灯色','不融霜心','暮霜薄纱','极夜流光','原誓灯色','疫根旧梦','紫荆暮色','腐烬余光','原誓灯色','燎原战魂','暗夜狂刃','深渊血誓','原誓灯色','漫天星火','翡翠秘纹','上古星咒','原誓灯色','古铜灯芯','月银铭纹','蔷薇灯色','原誓灯色','无声游魂','绯刃薄暮','深夜独行'];
export function enrichLore(catalogs){
 for(const branch of catalogs.talents?.TALENT_BRANCHES||[])branch.nodes.forEach((node,i)=>{LORE.talents[node.id]={name:talentNames[branch.id][i],desc:`铭刻后，${node.desc.replace(/HP/g,'生命').replace(/\s*生命\s*/g,'生命').replace('回血','生命恢复')}。`};});
 Object.values(catalogs.skins||{}).flat().forEach((skin,i)=>{LORE.skins[skin.id]={name:skinNames[i]||'旅人灯色',desc:skin.cost===0?'守夜者启程时携带的本色。':'为守夜者的灯焰与衣装染上新的衬色。'};});
 const names=['第一簇火','百兽止步','五百归烬','五分未熄','十分长明','二十连斩','初露锋芒','斩破首影','四器随身','迎接黎明','初雪凝锋','霜拥长夜','寒灯破晓','三霜斩首','百次霜落','初荆染血','毒蔓长夜','荆枝破晓','三毒斩首','百次毒蔓','霜毒相生','三器觉醒','夜路未尽','五潮守望','十潮守望','千魂归夜','提灯破晓','铁誓破晓','逐风破晓','狂刃破晓','星纱破晓','巧手破晓','暮影破晓','六器成阵','五符相随','一器登峰','三影俱灭','五影俱灭','星蚀止息','古铜坠地','十万锋芒','百万余焰','五百回春','千回不灭','五十连斩','百斩不停','十五分未熄','残灯见晓','五器觉醒','五灵相随','初刻十誓','三十誓成','诸誓皆明','二十次咏誓','百次咏誓','十首皆破','五章归途','十五潮不退','二十潮长明'];
 LORE.achievements={};
 (catalogs.achievements||[]).forEach((a,i)=>{LORE.achievements[a.id]={name:names[i]||text(a.name),desc:text(a.desc).replace(/单局/g,'一次远征中').replace(/击杀/g,'击败').replace(/达成/g,'完成').replace(/存活/g,'坚持').replace(/通关/g,'迎来黎明').replace(/使用/g,'以').replace(/[。]+$/,'')+'。'};});
}

const TERMS=table(`
芯片|余烬
核心破坏者|熔心破坏者
虚空巨人|虚渊巨人
等离子九头蛇|烬鳞九头蛇
冰霜泰坦|霜冠泰坦
腐蚀之源|腐根母巢
时空裂隙|星蚀裂隙
机械统帅|古铜统帅
金币|余烬
GOLD|余烬
XP|经验
LV.|等级
WARNING|强敌临近
LEVEL UP!|阶位晋升
进化核心|觉醒之石
进化|觉醒
修复|回春
超载|燃誓
智能|灵巧
电磁|雷鸣
科技|符文
数字|符纹
入侵|侵袭
扫描|探望
信号|灯讯
终端|古碑
防火墙|护火结界
核爆|焚天
主机|古树
主菜单|营地
自定义行装|自存行装
赛博|古誓
机械|古铜
火力|焰力
等离子|赤焰
纳米|灵萤
无人机|灯灵
机器人|符灵
僚机|旅伴
炮台|符灯
激光|天光
导弹|星焰
子弹|飞矢
数据|旧卷
协议|誓约
模块|护符
装甲|护甲
能量超载|赤心战意
伤害超载|赤心战意
紧急修复|回春赐福
应急修复|回春赐福
生命扩容|长生赐福
超速芯片|疾风赐福
数据暴雨|余烬骤雨
磁力|归烬
量子|命运
核武|焚夜
核辐射|腐烬
生化|腐枝
病毒|荆毒
系统通关|黎明已至
系统断线|灯火暂歇
系统|誓印
超频|急咏
能量|灵力
引擎|炉心
电场|雷域
电网|雷网
Boss Rush|首领连战
Boss|首领
Build|行装
AOE|范围
CDR|冷却缩减
CD|冷却
HP|生命
AUTO|随行
LEGENDARY|传说
FluxMusou|长夜余烬
CyberGrid|灰烬林地
ToxicSwamp|腐根沼泽
CryoRealm|霜裂遗迹
VoidNebula|虚渊墓境
Matrix|黎明圣城
Cryomancer|霜语者
Biohazard|毒枝术士
Tracer|守灯人
Walker|铁卫
Gunner|逐风者
Berserker|破晓狂刃
Arcane|星纱法师
Engineer|符文工匠
Assassin|暮影刺客
`);
const replacements=new Map(Object.entries(TERMS).map(([from,to])=>[from,to.name]));
let ordered=[],pattern=null,cache=new Map();
export function registerLore(catalogs){
 enrichLore(catalogs);
 for(const [kind,rows] of Object.entries(LORE))for(const [id,entry] of Object.entries(rows)){
  const collection=kind==='talents'?catalogs.talents?.NODE_MAP:kind==='builds'?catalogs.builds?.PRESET_BUILDS:kind==='skins'?Object.values(catalogs.skins||{}).flat():catalogs[kind];
  const source=Array.isArray(collection)?collection.find(row=>row.id===id):collection?.[id];
  if(source){if((source.name||source.resultName)!=='默认'&&(source.name||source.resultName))replacements.set(source.name||source.resultName,entry.name);if(!['talents','meta','achievements'].includes(kind)&&(source.desc||source.resultDesc))replacements.set(source.desc||source.resultDesc,entry.desc);if(id.includes('_'))replacements.set(id,entry.name);}
 }
 ordered=[...replacements].sort((a,b)=>b[0].length-a[0].length);pattern=null;cache.clear();
}
export function text(value=''){
 const raw=String(value);if(cache.has(raw))return cache.get(raw);
 let result=raw.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
 // Each source phrase is replaced once; replacement text is never translated again.
 if(!ordered.length)ordered=[...replacements].sort((a,b)=>b[0].length-a[0].length);
 if(!pattern)pattern=new RegExp(ordered.map(([from])=>from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 result=result.replace(pattern,match=>replacements.get(match));
 if(cache.size>1800)cache.clear();cache.set(raw,result);return result;
}
export function entry(kind,id,source={}){return LORE[kind]?.[id]||{name:text(source.name||source.resultName||id),desc:text(source.desc||source.resultDesc||'')};}
export const ELEMENT_NAMES={flux:'雷光',void:'幽影',plasma:'赤焰',cryo:'寒霜',toxic:'荆毒',kinetic:'骨刃',melee:'近战'};
