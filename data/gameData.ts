// Ship Hulls
export const SHIP_HULLS = {
  'light-freighter': {
    id: 'light-freighter',
    name: 'Light Freighter',
    maxHealth: 100,
    maxShields: 50,
    maxEnergy: 100,
    maxFuel: 100,
    maxCargo: 20,
    moduleSlots: 4,
    price: 0 // Starting ship
  },
  'heavy-freighter': {
    id: 'heavy-freighter',
    name: 'Heavy Freighter',
    maxHealth: 150,
    maxShields: 75,
    maxEnergy: 120,
    maxFuel: 150,
    maxCargo: 40,
    moduleSlots: 6,
    price: 50000
  },
  'combat-frigate': {
    id: 'combat-frigate',
    name: 'Combat Frigate',
    maxHealth: 200,
    maxShields: 100,
    maxEnergy: 150,
    maxFuel: 80,
    maxCargo: 15,
    moduleSlots: 8,
    price: 75000
  }
};

// Ship Modules
export const SHIP_MODULES = {
  'basic-laser': {
    id: 'basic-laser',
    name: 'Basic Laser',
    type: 'weapon',
    stats: { damage: 0, energyCost: 0, projectileSpeed: 0 },
    price: 0
  },
  'pulse-cannon': {
    id: 'pulse-cannon',
    name: 'Pulse Cannon',
    type: 'weapon',
    stats: { damage: 10, energyCost: -2, projectileSpeed: 50 },
    price: 2500
  },
  'missile-launcher': {
    id: 'missile-launcher',
    name: 'Missile Launcher',
    type: 'weapon',
    stats: { damage: 25, energyCost: 5, projectileSpeed: -50 },
    price: 5000
  },
  'shield-booster': {
    id: 'shield-booster',
    name: 'Shield Booster',
    type: 'defense',
    stats: { shieldBonus: 25 },
    price: 1500
  },
  'armor-plating': {
    id: 'armor-plating',
    name: 'Armor Plating',
    type: 'defense',
    stats: { healthBonus: 30 },
    price: 2000
  },
  'cargo-hold': {
    id: 'cargo-hold',
    name: 'Expanded Cargo Hold',
    type: 'utility',
    stats: { cargoBonus: 10 },
    price: 1000
  },
  'energy-cell': {
    id: 'energy-cell',
    name: 'Energy Cell',
    type: 'utility',
    stats: { energyBonus: 50 },
    price: 1200
  },
  // --- NEW: Stealth modules for espionage and smuggling missions ---
  'stealth-plating': {
    id: 'stealth-plating',
    name: 'Stealth Plating',
    type: 'special',
    stats: { detectionReduction: 30 },
    price: 8000
  },
  'scan-jammer': {
    id: 'scan-jammer',
    name: 'Active Scan Jammer',
    type: 'special',
    stats: { scanImmunity: 10, energyCost: 50 }, // 10 seconds immunity, 50 energy cost
    price: 12000
  }
};

// FIXED: Complete and comprehensive commodities list
export const COMMODITIES = {
  // Basic commodities that should always be available
  'food': {
    id: 'food',
    name: 'Food Supplies',
    basePrice: 45,
    type: 'consumable'
  },
  'metals': {
    id: 'metals',
    name: 'Raw Metals',
    basePrice: 30,
    type: 'industrial'
  },
  'electronics': {
    id: 'electronics',
    name: 'Electronics',
    basePrice: 80,
    type: 'technology'
  },
  'fuel': {
    id: 'fuel',
    name: 'Refined Fuel',
    basePrice: 25,
    type: 'consumable'
  },
  'medicine': {
    id: 'medicine',
    name: 'Medical Supplies',
    basePrice: 120,
    type: 'consumable'
  },
  // Mining resources
  'iron': {
    id: 'iron',
    name: 'Iron Ore',
    basePrice: 30,
    type: 'raw'
  },
  'platinum': {
    id: 'platinum',
    name: 'Platinum',
    basePrice: 150,
    type: 'precious'
  },
  'crystals': {
    id: 'crystals',
    name: 'Quantum Crystals',
    basePrice: 200,
    type: 'exotic'
  },
  'rare-metals': {
    id: 'rare-metals',
    name: 'Rare Metals',
    basePrice: 100,
    type: 'precious'
  },
  // Additional trade goods
  'textiles': {
    id: 'textiles',
    name: 'Synthetic Textiles',
    basePrice: 55,
    type: 'consumer'
  },
  'weapons': {
    id: 'weapons',
    name: 'Military Hardware',
    basePrice: 180,
    type: 'military'
  },
  'luxury-goods': {
    id: 'luxury-goods',
    name: 'Luxury Goods',
    basePrice: 250,
    type: 'luxury'
  },
  'machinery': {
    id: 'machinery',
    name: 'Industrial Machinery',
    basePrice: 95,
    type: 'industrial'
  },
  'chemicals': {
    id: 'chemicals',
    name: 'Chemical Compounds',
    basePrice: 70,
    type: 'industrial'
  },
  'water': {
    id: 'water',
    name: 'Purified Water',
    basePrice: 15,
    type: 'consumable'
  },
  // --- NEW: Contraband items for smuggling missions ---
  'narcotics': {
    id: 'narcotics',
    name: 'Illegal Narcotics',
    basePrice: 500,
    type: 'contraband',
    isContraband: true
  },
  'stolen-data': {
    id: 'stolen-data',
    name: 'Stolen Data Cores',
    basePrice: 800,
    type: 'contraband',
    isContraband: true
  },
  'black-market-tech': {
    id: 'black-market-tech',
    name: 'Black Market Technology',
    basePrice: 1200,
    type: 'contraband',
    isContraband: true
  },
  'classified-intel': {
    id: 'classified-intel',
    name: 'Classified Intelligence',
    basePrice: 2000,
    type: 'contraband',
    isContraband: true
  }
};

// Factions
export const FACTIONS = {
  'united-colonies': {
    id: 'united-colonies',
    name: 'United Colonies',
    color: '#4a90e2',
    reputation: 50
  },
  'deep-space-collective': {
    id: 'deep-space-collective',
    name: 'Deep Space Collective',
    color: '#50c878',
    reputation: 0
  },
  'void-pirates': {
    id: 'void-pirates',
    name: 'Void Pirates',
    color: '#dc2626',
    reputation: -25
  },
  'independent': {
    id: 'independent',
    name: 'Independent',
    color: '#888888',
    reputation: 25
  }
};

// Starting ship configuration
export const STARTING_SHIP_CONFIG = {
  hull: 'light-freighter',
  modules: ['basic-laser', 'shield-booster'],
  credits: 1000
};

// Mission types and their base parameters
export const MISSION_TYPES = {
  delivery: {
    baseReward: 500,
    timeLimitHours: 48,
    description: 'Transport cargo safely to the destination.'
  },
  combat: {
    baseReward: 750,
    timeLimitHours: 24,
    description: 'Eliminate hostile targets in the specified area.'
  },
  mining: {
    baseReward: 400,
    timeLimitHours: 72,
    description: 'Extract valuable resources from asteroids.'
  },
  exploration: {
    baseReward: 600,
    timeLimitHours: 96,
    description: 'Survey uncharted systems and report findings.'
  },
  escort: {
    baseReward: 800,
    timeLimitHours: 12,
    description: 'Protect convoy ships from hostile attacks.'
  }
};

// FIXED: Ensure market generation only uses valid commodities
export const MARKET_COMMODITIES = [
  'food', 'metals', 'electronics', 'fuel', 'medicine',
  'textiles', 'machinery', 'chemicals', 'water'
];

// Resource types for asteroid mining
export const ASTEROID_RESOURCES = [
  'iron', 'platinum', 'crystals', 'rare-metals'
];

// Station types and their characteristics
export const STATION_TYPES = {
  trading: {
    name: 'Trading Post',
    marketSize: 'large',
    commodityFocus: ['food', 'electronics', 'textiles', 'luxury-goods'],
    missionTypes: ['delivery', 'exploration']
  },
  mining: {
    name: 'Mining Station',
    marketSize: 'medium',
    commodityFocus: ['metals', 'machinery', 'fuel', 'water'],
    missionTypes: ['mining', 'combat']
  },
  military: {
    name: 'Military Outpost',
    marketSize: 'small',
    commodityFocus: ['weapons', 'medicine', 'electronics'],
    missionTypes: ['combat', 'escort']
  }
};