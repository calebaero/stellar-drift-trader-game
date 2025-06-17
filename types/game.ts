export interface Vector2 {
  x: number;
  y: number;
}

// --- New Mission System Type Definitions ---
export type MissionId = string & { readonly __brand: 'MissionId' };
export type FactionId = string & { readonly __brand: 'FactionId' };
export type SystemId = string & { readonly __brand: 'SystemId' };
export type WorldObjectId = string & { readonly __brand: 'WorldObjectId' };
export type CommodityId = string & { readonly __brand: 'CommodityId' };
export type ShipId = string & { readonly __brand: 'ShipId' };

export type ObjectiveType = 'TRAVEL' | 'KILL' | 'GATHER' | 'INTERACT' | 'SCAN' | 'ESCORT' | 'FOLLOW';
export type MissionType = 'BOUNTY' | 'SALVAGE' | 'ESPIONAGE' | 'SMUGGLING' | 'EXPEDITION' | 'DELIVERY' | 'REPAIR';
export type MissionStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED_SUCCESS' | 'COMPLETED_FAILURE' | 'ABANDONED';

export interface MissionObjective {
   readonly id: string;
   type: ObjectiveType;
   description: string;
   targetId: SystemId | ShipId | WorldObjectId | CommodityId | string;
   targetCount: number;
   currentProgress: number;
   isComplete: boolean;
   isHidden?: boolean;
}

export interface Mission {
   readonly id: MissionId;
   title: string;
   type: MissionType;
   status: MissionStatus;
   sourceFactionId: FactionId;
   description: string;
   successMessage: string;
   failureMessage: string;
   objectives: MissionObjective[];
   currentObjectiveIndex: number;
   rewardCredits: number;
   rewardItems?: { itemId: string; quantity: number };
   reputationChange: {
       [key in FactionId]?: number;
   };
   timeLimitInSeconds?: number;
   expirationTimestamp?: number;
}

// --- NEW: WorldObject interface for interactable world entities ---
export interface WorldObject {
  id: WorldObjectId;
  type: 'DamagedJumpGate' | 'BrokenRelay';
  position: Vector2;
  status: 'DAMAGED' | 'OPERATIONAL';
  requiredItems: { itemId: CommodityId; required: number; supplied: number; }[];
}

// --- NEW: Codex system for archaeological missions ---
export interface CodexEntry {
  id: string;
  title: string;
  content: string;
  unlockingMissionId: MissionId;
  isUnlocked: boolean;
}
// --- End New Definitions ---

export interface Ship {
  id: string;
  name: string;
  hull: ShipHull;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  health: number;
  maxHealth: number;
  shields: number;
  maxShields: number;
  energy: number;
  maxEnergy: number;
  fuel: number;
  maxFuel: number;
  cargo: CargoItem[];
  maxCargo: number;
  modules: ShipModule[];
  faction: string;
  detectionSignature: number; // --- NEW: For stealth mechanics ---
}

export interface ShipHull {
  id: string;
  name: string;
  maxHealth: number;
  maxShields: number;
  maxEnergy: number;
  maxFuel: number;
  maxCargo: number;
  speed: number;
  agility: number;
  moduleSlots: number;
  weaponHardpoints: number;
}

export interface ShipModule {
  id: string;
  name: string;
  type: 'engine' | 'shield' | 'weapon' | 'cargo' | 'scanner' | 'defense' | 'power' | 'special';
  stats: Record<string, number>;
  price: number;
}

export interface CargoItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  basePrice: number;
  isContraband?: boolean; // --- NEW: For smuggling missions ---
}

export interface StarSystem {
  id: string;
  name: string;
  position: Vector2;
  star: {
    type: string;
    color: string;
  };
  stations: Station[];
  asteroids: Asteroid[];
  connections: string[];
  discovered: boolean;
  controllingFaction?: string;
  missions: Mission[]; // Updated to use new Mission type
  worldObjects: WorldObject[]; // --- NEW: Add worldObjects to StarSystem ---
}

export interface Station {
  id: string;
  name: string;
  position: Vector2;
  type: 'trading' | 'mining' | 'military' | 'research';
  faction: string;
  market: Record<string, {
    price: number;
    supply: number;
    demand: number;
  }>;
  missions: Mission[]; // Updated to use new Mission type
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  color: string;
  reputation: number;
  attitude: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
}

export interface Asteroid {
  id: string;
  position: Vector2;
  size: number;
  resources: CargoItem[];
  health: number;
}

export interface GameState {
  player: Ship;
  currentSystem: string;
  galaxy: Record<string, StarSystem>;
  factions: Record<string, Faction>;
  credits: number;
  activeMode: 'galaxy' | 'system' | 'station' | 'missionLog' | 'codex'; // --- UPDATED: Add new view modes ---
  selectedTarget?: string;
  activeMissions: Mission[]; // Updated to use new Mission type
  trackedMissionId?: MissionId; // --- NEW: For HUD mission tracking ---
  codex: CodexEntry[]; // --- NEW: For archaeological expedition lore ---
  gameTime: number;
  runNumber: number;
  metaProgress: {
    unlockedHulls: string[];
    unlockedModules: string[];
    legacyCredits: number;
  };
}

export interface Enemy {
  id: string;
  ship: Ship;
  ai: {
    behavior: 'aggressive' | 'defensive' | 'patrol' | 'flee' | 'security'; // --- NEW: Add security behavior ---
    target?: string;
    lastAction: number;
    scanStartTime?: number; // --- NEW: For security scanning ---
    scanTarget?: string; // --- NEW: For security scanning ---
  };
  isBountyTarget?: boolean; // --- NEW: Flag to distinguish elite bounty targets ---
}