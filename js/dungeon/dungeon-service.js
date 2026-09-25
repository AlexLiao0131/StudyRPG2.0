import { encounterForDate, worldForDate } from '../world/world-service.js';
import { combatPower } from '../progression/combat-power.js';
import { calibratedDailyMonsterPower, ensureDailyBalanceSnapshot } from '../balance/daily-dungeon-power.js';
export function dungeonSnapshot(){const encounter=encounterForDate(),world=worldForDate();if(!encounter)return{encounter:null,world,heroPower:combatPower(),enemyPower:0,celebration:!!world?.noBattle};const balance=ensureDailyBalanceSnapshot();return{encounter,world,heroPower:combatPower(),enemyPower:calibratedDailyMonsterPower(),balance,celebration:false}}
