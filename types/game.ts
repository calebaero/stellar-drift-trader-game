export interface Vector2 {
  x: number;
  y: number;
}

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
  missions: Mission[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'combat' | 'exploration' | 'mining' | 'escort';
  reward: number;
  factionReward?: number;
  targetSystem?: string;
  targetPosition?: Vector2;
  cargo?: {
    name: string;
    quantity: number;
  };
  target?: string;
  timeLimit?: number;
  completed: boolean;
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
  activeMode: 'galaxy' | 'system' | 'station';
  selectedTarget?: string;
  activeMissions: Mission[];
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
    behavior: 'aggressive' | 'defensive' | 'patrol' | 'flee';
    target?: string;
    lastAction: number;
  };
}