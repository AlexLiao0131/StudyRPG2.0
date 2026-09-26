export const MassFlowEngine=(()=>{
  "use strict";

  const MATERIAL=Object.freeze({SOIL:"SOIL",ROCK:"ROCK",DEBRIS:"DEBRIS",SNOW:"SNOW"});
  const CFG=Object.freeze({
    MAX_STEPS:12,
    MIN_DROP:.001,
    OBJECT_RESISTANCE_FACTOR:.18,
    SOIL:{pickup:.35,transport:.68,minTerrainMove:.55,maxTerrainMove:1.45},
    ROCK:{pickup:.18,transport:.78,minTerrainMove:.65,maxTerrainMove:1.8},
    DEBRIS:{pickup:.18,transport:.76,minTerrainMove:.60,maxTerrainMove:1.7},
    SNOW:{pickup:.30,transport:1,minTerrainMove:0,maxTerrainMove:0}
  });
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const key=(x,y)=>`${x},${y}`;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value||0)));
  const round=value=>Math.round(Number(value||0)*1000)/1000;
  const clean=value=>Math.max(0,round(value));
  const tileAt=(map,x,y)=>map?.tiles?.find(t=>t.x===x&&t.y===y)||null;
  const elevation=tile=>Number(tile?.elevation||0);
  const snow=tile=>Math.max(0,Number(tile?.snowDepth||0));
  const moisture=tile=>Math.max(0,Number(globalThis.HydrologyEngine?.soilMoisture?.(tile)||0));
  const rockMass=tile=>Math.max(0,Number(tile?.rockMass??((tile?.material==="ROCK"||tile?.terrain==="HIGH_GROUND")?Math.max(.5,elevation(tile)*.35):0)));
  const normalizedMaterial=value=>String(value||MATERIAL.SOIL).toUpperCase();

  function flowPassable(tile){return !!tile&&tile.terrain!=="WALL";}
  function pickupFor(tile,material){
    const cfg=CFG[material]||CFG.SOIL;
    if(material===MATERIAL.SNOW)return Math.min(.45,snow(tile)*cfg.pickup);
    if(material===MATERIAL.ROCK||material===MATERIAL.DEBRIS)return Math.min(.55,rockMass(tile)*cfg.pickup);
    const sandBonus=tile?.terrain==="SAND"?.12:0;
    return Math.min(.48,moisture(tile)*cfg.pickup+(tile?.terrain==="MUD"?.06:0)+sandBonus);
  }
  function downhill(map,tile,visited=new Set(),material=MATERIAL.SOIL){
    return DIRS.map(([dx,dy])=>tileAt(map,tile.x+dx,tile.y+dy))
      .filter(next=>flowPassable(next)&&!visited.has(key(next.x,next.y)))
      .map(next=>{
        const drop=elevation(tile)-elevation(next),resistance=Math.max(0,Number(globalThis.EnvironmentObjectEngine?.flowResistanceAt?.(map,next)||0));
        return{tile:next,drop,resistance,score:drop-resistance*CFG.OBJECT_RESISTANCE_FACTOR};
      })
      .filter(entry=>entry.drop>CFG.MIN_DROP&&entry.score>CFG.MIN_DROP)
      .sort((a,b)=>b.score-a.score||b.drop-a.drop||elevation(a.tile)-elevation(b.tile))[0]||null;
  }
  function trace(map,start,material,initialMass,{maxSteps=CFG.MAX_STEPS}={}){
    material=normalizedMaterial(material);
    if(!map||!start||!flowPassable(start))return null;
    const visited=new Set([key(start.x,start.y)]),path=[{x:start.x,y:start.y,elevation:elevation(start),drop:0,pickup:0,resistance:Number(globalThis.EnvironmentObjectEngine?.flowResistanceAt?.(map,start)||0)}],baseMass=Math.max(0,Number(initialMass||0));
    let current=start,carried=baseMass;
    for(let i=0;i<Math.max(1,Number(maxSteps||CFG.MAX_STEPS));i++){
      const next=downhill(map,current,visited,material);if(!next)break;
      current=next.tile;visited.add(key(current.x,current.y));
      const pickup=pickupFor(current,material);carried+=pickup;
      path.push({x:current.x,y:current.y,elevation:elevation(current),drop:next.drop,pickup:clean(pickup),resistance:clean(next.resistance)});
    }
    return{material,initialMass:clean(baseMass),mass:clean(carried),path,end:current};
  }

  function normalizedWeights(length,fn){
    const values=Array.from({length},(_,i)=>Math.max(0,Number(fn(i,length)||0))),sum=values.reduce((a,b)=>a+b,0);
    return sum>0?values.map(v=>v/sum):values;
  }
  function terrainMoveBudget(flow){
    const cfg=CFG[flow.material]||CFG.SOIL;if(!cfg.maxTerrainMove)return 0;
    return clamp(flow.mass*cfg.transport+Math.max(0,flow.path.length-2)*.035,cfg.minTerrainMove,cfg.maxTerrainMove);
  }
  function erosionFactor(map,tile,material){
    let susceptibility=1;
    if(tile?.terrain==="SAND")susceptibility=1.35;
    else if(tile?.terrain==="FOREST")susceptibility=.9;
    if(material===MATERIAL.ROCK||material===MATERIAL.DEBRIS)susceptibility*=1.08;
    const resistance=Math.max(0,Number(globalThis.EnvironmentObjectEngine?.erosionResistanceAt?.(map,tile)||0));
    return susceptibility*clamp(1-resistance,.35,1);
  }
  function markTerrainChange(tile,before,events,source,material){
    if(before===tile.terrain)return;
    events.push({type:"TERRAIN_CHANGED",x:tile.x,y:tile.y,from:before,to:tile.terrain,source,material});
  }
  function markElevation(tile,before,events,source,material,erosion,deposition){
    const after=elevation(tile);if(Math.abs(after-before)<=.0005)return;
    events.push({type:"ELEVATION_CHANGED",x:tile.x,y:tile.y,from:before,to:after,deltaElevation:round(after-before),source,material,erosion:clean(erosion),deposit:clean(deposition)});
  }
  function applySoilSurface(tile,erosion,deposition,events,source){
    const impact=erosion+deposition,before=tile.terrain;if(impact<=.025)return;
    if(tile.terrain==="WATER")tile.dryTerrain=deposition>=.14?"MUD":(tile.dryTerrain||"PLAIN");
    else if(tile.terrain==="PLAIN"||tile.terrain==="FOREST"){tile.terrain="MUD";if(before==="FOREST")tile.vegetation=0;}
    else if(tile.terrain==="SAND"&&deposition>=.18)tile.terrain="MUD";
    const capacity=Number(globalThis.HydrologyEngine?.soilCapacity?.(tile)??globalThis.HydrologyEngine?.SOIL_SATURATION_CAPACITY??.45);
    tile.soilMoisture=clean(Math.min(capacity,Math.max(0,moisture(tile)-erosion*.22+deposition*.32)));
    tile.massFlowResidue=clean(Number(tile.massFlowResidue||0)+impact);
    markTerrainChange(tile,before,events,source,MATERIAL.SOIL);
  }
  function applyRockSurface(tile,erosion,deposition,events,source,material){
    const impact=erosion+deposition;if(impact<=.025)return;
    const before=tile.terrain;
    tile.rockMass=clean(Math.max(0,rockMass(tile)-erosion*.55+deposition*.8));
    tile.debrisMass=clean(Number(tile.debrisMass||0)+deposition*.95+erosion*.15);
    if(tile.debrisMass>=.28)tile.material="ROCK";
    if(before==="FOREST"&&impact>=.18){tile.terrain="PLAIN";tile.vegetation=0;}
    if(tile.terrain!=="WATER"&&tile.terrain!=="WALL"&&deposition>=.22&&tile.debrisMass>=.35)tile.terrain="HIGH_GROUND";
    tile.massFlowResidue=clean(Number(tile.massFlowResidue||0)+impact);
    markTerrainChange(tile,before,events,source,material);
  }
  function evolveGround(map,flow,{events=[],source="MASS_FLOW"}={}){
    const tiles=flow.path.map(p=>tileAt(map,p.x,p.y)).filter(Boolean),length=tiles.length;if(length<2)return{changed:false,elevationChanges:0,terrainChanges:0};
    const budget=terrainMoveBudget(flow);
    const erosionWeights=normalizedWeights(length,(i,n)=>{const t=n<=1?0:i/(n-1);return t<=.72?Math.pow(1-t,1.35):0;});
    const depositWeights=normalizedWeights(length,(i,n)=>{const t=n<=1?1:i/(n-1);return t>=.30?Math.pow(t,1.8):0;});
    let elevationChanges=0,terrainChanges=0,totalErosion=0,totalDeposit=0;
    for(let i=0;i<length;i++){
      const tile=tiles[i],node=flow.path[i],baseErosion=budget*erosionWeights[i],erosion=baseErosion*erosionFactor(map,tile,flow.material),deposition=budget*depositWeights[i],beforeElevation=elevation(tile),beforeTerrain=tile.terrain;
      if(i>0&&Number(node?.pickup||0)>0){
        if(flow.material===MATERIAL.ROCK||flow.material===MATERIAL.DEBRIS)tile.rockMass=clean(Math.max(0,rockMass(tile)-Number(node.pickup)));
        else if(flow.material===MATERIAL.SOIL)tile.soilMoisture=clean(Math.max(0,moisture(tile)-Number(node.pickup)*.45));
      }
      const delta=deposition-erosion;
      if(Math.abs(delta)>.0005)tile.elevation=round(beforeElevation+delta);
      if(flow.material===MATERIAL.SOIL)applySoilSurface(tile,erosion,deposition,events,source);
      else applyRockSurface(tile,erosion,deposition,events,source,flow.material);
      markElevation(tile,beforeElevation,events,source,flow.material,erosion,deposition);
      if(Math.abs(elevation(tile)-beforeElevation)>.0005)elevationChanges++;
      if(tile.terrain!==beforeTerrain)terrainChanges++;
      totalErosion+=erosion;totalDeposit+=deposition;
      node.elevationBefore=beforeElevation;node.elevationAfter=elevation(tile);node.erosion=clean(erosion);node.deposit=clean(deposition);
    }
    events.push({type:"MASS_FLOW_TERRAIN_CHANGED",material:flow.material,source,tiles:length,elevationChanges,terrainChanges,totalErosion:clean(totalErosion),totalDeposit:clean(totalDeposit),path:flow.path.map(p=>({...p}))});
    return{changed:elevationChanges>0||terrainChanges>0,elevationChanges,terrainChanges,totalErosion:clean(totalErosion),totalDeposit:clean(totalDeposit)};
  }
  function evolveSnow(map,flow,{events=[],source="AVALANCHE"}={}){
    const tiles=flow.path.map(p=>tileAt(map,p.x,p.y)).filter(Boolean),length=tiles.length;if(length<2)return{changed:false,snowChanges:0};
    let carried=Math.min(snow(tiles[0]),flow.initialMass),snowChanges=0;
    const before=new Map(tiles.map(tile=>[key(tile.x,tile.y),snow(tile)]));
    tiles[0].snowDepth=clean(snow(tiles[0])-carried);
    for(let i=1;i<tiles.length;i++){
      const take=Math.min(snow(tiles[i]),Number(flow.path[i]?.pickup||0));tiles[i].snowDepth=clean(snow(tiles[i])-take);carried+=take;
    }
    const weights=normalizedWeights(length,(i,n)=>{const t=n<=1?1:i/(n-1);return t>=.55?Math.pow(t,2.2):0;});
    for(let i=0;i<length;i++)if(weights[i]>0)tiles[i].snowDepth=clean(snow(tiles[i])+carried*weights[i]);
    for(const tile of tiles){const from=Number(before.get(key(tile.x,tile.y))||0),to=snow(tile);if(Math.abs(to-from)>.0005){snowChanges++;events.push({type:"SNOW_DEPTH_CHANGED",x:tile.x,y:tile.y,from,to,source,material:MATERIAL.SNOW});}}
    flow.mass=clean(carried);
    events.push({type:"MASS_FLOW_SNOW_REDISTRIBUTED",material:MATERIAL.SNOW,source,tiles:length,snowChanges,mass:flow.mass,path:flow.path.map(p=>({...p}))});
    return{changed:snowChanges>0,snowChanges};
  }
  function apply(map,flow,{events=[],source="MASS_FLOW"}={}){
    if(!flow||flow.path?.length<2)return{changed:false};
    const terrain=flow.material===MATERIAL.SNOW?evolveSnow(map,flow,{events,source}):evolveGround(map,flow,{events,source});
    const objects=globalThis.EnvironmentObjectEngine?.resolveMassFlow?.(map,flow,{events,source})||{affected:0,moved:0,destroyed:0};
    return{...terrain,objects,changed:!!terrain.changed||objects.affected>0};
  }
  function event(flow,{type="MASS_FLOW",source="STABILITY_FAILURE",damage=0,forceDistance=1,contactProfile="SURFACE_FLOW",extra={}}={}){
    return{type,material:flow.material,x:flow.path[0]?.x,y:flow.path[0]?.y,source,path:flow.path.map(p=>({...p})),mass:clean(flow.mass),damage:Math.max(0,Math.round(Number(damage||0))),forceDistance:Math.max(0,Math.round(Number(forceDistance||0))),contactProfile,...extra};
  }

  return Object.freeze({MATERIAL,CFG,tileAt,elevation,snow,rockMass,downhill,trace,apply,event});
})();
globalThis.MassFlowEngine=MassFlowEngine;
