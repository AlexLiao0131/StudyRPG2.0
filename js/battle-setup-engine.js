export const BattleSetupEngine=(()=>{
  function hashSeed(seed){
    let h=2166136261>>>0;
    for(const ch of String(seed??"CARD_TACTICS")){
      h^=ch.charCodeAt(0);
      h=Math.imul(h,16777619)>>>0;
    }
    return h||0x6d2b79f5;
  }

  function createRandom(seed){
    let a=hashSeed(seed)>>>0;
    return()=>{
      a=(a+0x6D2B79F5)>>>0;
      let t=a;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function weightedChoice(entries,random){
    const valid=(entries||[]).filter(entry=>Number(entry?.weight||0)>0);
    if(!valid.length)return null;
    const total=valid.reduce((sum,entry)=>sum+Number(entry.weight||0),0);
    let roll=random()*total;
    for(const entry of valid){
      roll-=Number(entry.weight||0);
      if(roll<0)return entry;
    }
    return valid[valid.length-1];
  }

  function resolveEnvironment(stage,battleSetup={}){
    const source={...(stage?.environment||{})};
    const pool=Array.isArray(source.weatherPool)?source.weatherPool:[];
    delete source.weatherPool;

    if(!pool.length||!window.EnvironmentEngine){
      return{environment:source,meta:null};
    }

    const valid=pool.filter(entry=>EnvironmentEngine.WEATHER?.[entry?.weather]);
    if(!valid.length){
      return{environment:source,meta:null};
    }

    const battleSeed=
      battleSetup?.seed ??
      stage?.generatedBattlefield?.seed ??
      `${stage?.id||"stage"}:default`;

    const weatherSeed=hashSeed(`${battleSeed}|${stage?.id||"stage"}|WEATHER`);
    const selected=weightedChoice(valid,createRandom(weatherSeed));
    if(!selected)return{environment:source,meta:null};

    const weather=selected.weather;
    const weatherTurns=weather==="CLEAR"
      ?null
      :Math.max(
        1,
        Number(
          selected.duration ??
          EnvironmentEngine.WEATHER_TURNS?.[weather] ??
          1
        )
      );

    const environment={
      ...source,
      weather,
      weatherTurns
    };

    return{
      environment,
      meta:{
        weather,
        weatherTurns,
        weatherSeed,
        battleSeed
      }
    };
  }

  function create({stageId,battleSetup,TEAM}){
    const stage=StageDatabase.get(stageId);
    if(!stage)throw new Error(`Unknown stage: ${stageId}`);

    let map;
    if(stage.mode==="VERSUS"&&stage.battlefield?.type==="PROCEDURAL"){
      if(!window.MapGenerator?.generateVersus)throw new Error("MapGenerator.generateVersus is not loaded.");

      const generated=MapGenerator.generateVersus({
        size:battleSetup?.mapSize||stage.battlefield.defaultSize||"MEDIUM",
        seed:battleSetup?.seed,
        coreRules:stage.coreRules||{}
      });

      map=generated.map;
      stage.cores=generated.cores;
      stage.deploymentPoints=generated.deploymentPoints;
      stage.generatedBattlefield=generated.meta;

      if(battleSetup&&!battleSetup.seed)battleSetup.seed=generated.meta.seed;
      if(battleSetup&&!battleSetup.mapSize)battleSetup.mapSize=generated.meta.size;
    }else{
      map=MapDatabase.createMap(stage.mapId);
    }

    if(window.EnvironmentObjectEngine){
      EnvironmentObjectEngine.initializeMap(map,{seed:battleSetup?.seed??stage.generatedBattlefield?.seed??stage.id});
    }
    if(window.HydrologyEngine)HydrologyEngine.initializeMap(map);

    const stageState=StageEngine.create(stage.scriptId,{
      victory:stage.victory,
      defeat:stage.defeat
    });

    const cores=(stage.cores||[]).map(core=>({
      ...core,
      hp:Number(core.hp??core.maxHp??0),
      maxHp:Number(core.maxHp??core.hp??0),
      shield:Number(core.shield??core.maxShield??0),
      maxShield:Number(core.maxShield??core.shield??0)
    }));

    const resolvedEnvironment=resolveEnvironment(stage,battleSetup||{});
    const environmentState=window.EnvironmentEngine
      ?EnvironmentEngine.create(resolvedEnvironment.environment)
      :null;

    if(resolvedEnvironment.meta){
      stage.generatedEnvironment={...resolvedEnvironment.meta};
      if(stage.generatedBattlefield){
        stage.generatedBattlefield.environment={...resolvedEnvironment.meta};
      }
      if(battleSetup){
        battleSetup.openingWeather=resolvedEnvironment.meta.weather;
        battleSetup.weatherSeed=resolvedEnvironment.meta.weatherSeed;
      }
    }

    const units=[];
    if(window.ClimateEngine&&environmentState){
      ClimateEngine.initializeMap(map,environmentState);
    }

    const createUnit=(id,team,characterId,x,y)=>
      UnitRuntimeEngine.create({id,team,characterId,x,y,map});

    const forcedHeroIds=new Set(
      (stage.playerSpawns||[])
        .filter(s=>s.source==="STAGE")
        .map(s=>s.characterId)
    );

    const requestedDeck=
      Array.isArray(battleSetup?.deck)&&battleSetup.deck.length
        ?battleSetup.deck
        :stage.battleDeck||[];

    const battleDeck=requestedDeck.filter(cardId=>{
      const card=CardDatabase.get(cardId);
      return !(
        CardDatabase.isCharacter(card)&&
        card.unitType==="HERO"&&
        forcedHeroIds.has(card.characterId)
      );
    });

    const cardState=CardPhaseEngine.create({
      deck:battleDeck,
      startingCrystals:Number(stage.cardRules?.startingCrystals||4),
      maxCrystals:Number(stage.cardRules?.maxCrystals||10),
      crystalGrowth:Number(stage.cardRules?.crystalGrowth||1),
      handSize:Number(stage.cardRules?.handSize||5)
    });

    const enemyCardState=CardPhaseEngine.create({
      deck:stage.enemyDeck||[],
      startingCrystals:Number(stage.enemyCardRules?.startingCrystals||stage.cardRules?.startingCrystals||4),
      maxCrystals:Number(stage.enemyCardRules?.maxCrystals||stage.cardRules?.maxCrystals||10),
      crystalGrowth:Number(stage.enemyCardRules?.crystalGrowth||stage.cardRules?.crystalGrowth||1),
      handSize:Number(stage.enemyCardRules?.handSize||stage.cardRules?.handSize||5)
    });

    DeckEngine.shuffle(cardState.zones);
    DeckEngine.shuffle(enemyCardState.zones);
    DeckEngine.draw(
      enemyCardState.zones,
      Number(stage.enemyCardRules?.handSize||stage.cardRules?.handSize||5)
    );

    (stage.playerSpawns||[]).forEach((u,i)=>
      units.push(createUnit(`p${i}`,TEAM.PLAYER,u.characterId,u.x,u.y))
    );
    (stage.enemySpawns||[]).forEach((u,i)=>
      units.push(createUnit(`e${i}`,TEAM.ENEMY,u.characterId,u.x,u.y))
    );

    const encounterState=window.EncounterEngine?.create?.(
      stage.encounters||[],
      {map,units,createUnit}
    )||null;

    if(encounterState){
      stageState.encounterState=encounterState;
      EncounterEngine.spawnInitial(encounterState);
    }

    return{
      stage,
      map,
      stageState,
      cores,
      environmentState,
      units,
      cardState,
      enemyCardState,
      encounterState,
      unitSerial:0
    };
  }

  return Object.freeze({create,resolveEnvironment});
})();
globalThis.BattleSetupEngine=BattleSetupEngine;
