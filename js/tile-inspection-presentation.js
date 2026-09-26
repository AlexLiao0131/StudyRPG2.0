export const TileInspectionPresentation=(()=>{
  const ENV={NONE:"一般",GRASS:"草木",WATER:"水",STONE:"石質"},WEATHER={CLEAR:"晴朗",FOG:"迷霧",RAIN:"雨",HEAVY_RAIN:"豪大雨",THUNDERSTORM:"雷雨",SNOW:"降雪",BLIZZARD:"暴風雪"};
  const EFFECT={TORNADO:"龍捲風",BURNING:"燃燒",BOILING:"沸騰",STEAM:"蒸氣",FRAGMENTS:"岩石破片",FIRE_TORNADO:"火龍捲",ELECTRIFIED:"帶電",SNOW:"積雪",ICE:"結冰",CURRENT:"急流"};
  const fmt=n=>Math.round(Number(n||0)*100)/100;
  function create({map,environmentState,tile}){
    if(!map||!tile)return null;
    const terrain=TERRAINS[tile.terrain]||{},material=EnvironmentEngine.environmentAt(map,tile.x,tile.y),effects=environmentState?EnvironmentEngine.effectAt(environmentState,tile.x,tile.y):[],depth=HydrologyEngine.waterDepth(tile),surface=HydrologyEngine.waterSurfaceZ(tile),moisture=HydrologyEngine.soilMoisture?.(tile)||0,snow=Number(tile.snowDepth||0),ice=Number(tile.iceThickness||0),flow=Number(tile.flowSpeed||0),ground=Number(tile.elevation||0),move=terrain.passable===false?"×":terrain.moveCost??"-",eva=`${Number(terrain.evasion||0)>=0?"+":""}${Number(terrain.evasion||0)}`;
    const objects=window.EnvironmentObjectEngine?.activeObjectsAt?.(map,tile.x,tile.y)||(map.objects||[]).filter(o=>!o.destroyed&&o.x===tile.x&&o.y===tile.y);
    const rootStrength=Number(window.EnvironmentObjectEngine?.rootStrengthAt?.(map,tile)||0),slope=Number(tile.slopeStability??window.EnvironmentResolver?.stability?.(environmentState,tile,map)??0);
    const title=depth>0?`${terrain.name||tile.terrain}｜地面 H${fmt(ground)}｜水面 H${fmt(surface)}`:`${terrain.name||tile.terrain}｜H${fmt(ground)}`,meta=depth>0?`水深 ${fmt(depth)}｜MOVE ${move}｜EVA ${eva}`:`MOVE ${move}｜EVA ${eva}`,summary={title,meta,status:effects.map(e=>EFFECT[e.type]||e.type).join("・")};
    const details=[`地圖格 (${tile.x},${tile.y})`,`地形：${terrain.name||tile.terrain}｜地面 H${fmt(ground)}`,`環境材質：${ENV[material]||material}｜天候：${WEATHER[environmentState?.weather]||environmentState?.weather||"晴朗"}`];
    if(depth>0)details.push(`水深：${fmt(depth)}｜水面 H${fmt(surface)}｜Surface Water ${fmt(depth)}`);
    if(tile.terrain==="MUD")details.push(`土壤含水：${fmt(moisture)}/${fmt(HydrologyEngine.soilCapacity?.(tile)||HydrologyEngine.SOIL_SATURATION_CAPACITY||1)}｜泥濘飽和後才形成地表積水。`);
    if(tile.terrain==="SAND")details.push(`沙地含水：${fmt(moisture)}/${fmt(HydrologyEngine.soilCapacity?.(tile)||1)}｜高滲透、低黏著，較容易被侵蝕。`);
    if(rootStrength>0||tile.terrain==="FOREST")details.push(`水土保持：根系 ${fmt(rootStrength)}｜坡面穩定 ${fmt(slope)}。`);
    if(snow>0)details.push(`積雪深度：${fmt(snow)}｜深雪會增加移動成本。`);
    if(ice>0)details.push(`冰厚：${fmt(ice)}｜重量越大需要越厚冰面；踩裂後重新進入水域判定。`);
    if(tile.river)details.push(`河流：流速 ${fmt(flow)}｜流量 ${fmt(tile.discharge||0)}${tile.ford?"｜此格為淺灘／渡口":""}`);
    if(objects.length)details.push(`物件：${objects.map(o=>`${o.name||o.type||o.id}${o.destructible?`｜耐久 ${Math.round(Number(o.durability??o.maxDurability??0))}/${Math.round(Number(o.maxDurability??o.durability??0))}`:""}`).join("、")}`);
    details.push(`效果：${effects.length?effects.map(e=>`${EFFECT[e.type]||e.type}${e.duration==null?"":` ${e.duration}回合`}${e.type==="BOILING"?`｜Heat ${e.heat||1}`:""}`).join("、"):"無"}`);
    if(material==="WATER")details.push("互動：水體可導電；高熱先沸騰再蒸發；低溫可結冰。河道在豪雨／雷雨時會增強流速並可能沖走單位。");
    else if(material==="GRASS")details.push(EnvironmentEngine.isRain(environmentState)?"互動：雨勢抑制草木持續燃燒；樹木與灌木提供根系固土。":"互動：草木可被火焰點燃；樹木與灌木提供根系固土，燒毀後坡面穩定會下降。");
    else if(material==="STONE")details.push("互動：爆炸可與石質物件／破片作用；高山積雪受到爆炸／衝擊可觸發雪崩。");
    if(tile.terrain==="MUD")details.push("互動：泥濘提高一般移動成本；泥地本身不是水體導體。");
    if(tile.terrain==="SAND")details.push("互動：沙地移動較慢、保水量低、乾燥較快；土石流侵蝕係數較高。");
    return{summary,details:details.join("\n")};
  }
  return Object.freeze({create});
})();
globalThis.TileInspectionPresentation=TileInspectionPresentation;
