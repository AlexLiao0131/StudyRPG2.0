import { encounterForDate } from '../world/world-service.js';
import { combatPower } from '../progression/combat-power.js';
export function dungeonSnapshot(){const encounter=encounterForDate();return{encounter,heroPower:combatPower(),celebration:encounter===null}}
