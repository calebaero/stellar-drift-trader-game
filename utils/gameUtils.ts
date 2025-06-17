import { Ship, Vector2, StarSystem, CargoItem, Mission, WorldObject, Enemy } from '../types/game';
import { MARKET_COMMODITIES, ASTEROID_RESOURCES } from '../data/gameData';

// FIXED: Add unique ID generator to prevent duplicate keys
let uniqueIdCounter = 0;
function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++uniqueIdCounter}`;
}

export function distance(pos1: Vector2, pos2: Vector2): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- NEW: Enhanced physics for elite bounty targets ---
export function updateShipPhysics(ship: Ship, thrustVector: Vector2, deltaTime: number, enemy?: Enemy) {
  // Apply thrust - using smaller multiplier here since we increased it in moveShip
  let thrustMultiplier = 0.08;
  let dragMultiplier = 0.98;
  
  // Enhanced AI behavior for elite bounty targets
  if (enemy?.isBountyTarget) {
    thrustMultiplier = 0.12; // 50% faster acceleration
    dragMultiplier = 0.96; // Better maneuverability (less drag)
  }
  
  ship.velocity.x += thrustVector.x * deltaTime * thrustMultiplier;
  ship.velocity.y += thrustVector.y * deltaTime * thrustMultiplier;
  
  // Apply drag
  ship.velocity.x *= dragMultiplier;
  ship.velocity.y *= dragMultiplier;
  
  // Update position
  ship.position.x += ship.velocity.x * deltaTime;
  ship.position.y += ship.velocity.y * deltaTime;
}
// --- End enhanced physics ---

export function calculateDamage(attacker: Ship, target: Ship): number {
  // Base damage calculation
  let damage = 20;
  
  // Add weapon bonuses
  attacker.modules.forEach(module => {
    if (module.type === 'weapon' && module.stats.damage) {
      damage += module.stats.damage;
    }
  });
  
  return damage;
}

export function addCargo(ship: Ship, item: CargoItem): boolean {
  const currentCargo = ship.cargo.reduce((sum, cargo) => sum + cargo.quantity, 0);
  if (currentCargo + item.quantity > ship.maxCargo) {
    return false;
  }
  
  // Check if item already exists in cargo
  const existingItem = ship.cargo.find(cargo => cargo.id === item.id);
  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    ship.cargo.push({ ...item });
  }
  
  return true;
}

export function removeCargo(ship: Ship, itemId: string, quantity: number): boolean {
  const item = ship.cargo.find(cargo => cargo.id === itemId);
  if (!item || item.quantity < quantity) {
    return false;
  }
  
  item.quantity -= quantity;
  if (item.quantity <= 0) {
    ship.cargo = ship.cargo.filter(cargo => cargo.id !== itemId);
  }
  
  return true;
}

export function generateGalaxy(): Record<string, StarSystem> {
  // FIXED: Reset counter for new galaxy generation
  uniqueIdCounter = 0;
  
  const systems: Record<string, StarSystem> = {};
  const starNames = [
    'Alpha Centauri', 'Proxima', 'Barnard\'s Star', 'Wolf 359', 'Lalande 21185',
    'Sirius', 'Ross 154', 'Ross 248', 'Epsilon Eridani', 'Lacaille 9352',
    'Ross 128', 'EZ Aquarii', 'Procyon', '61 Cygni', 'Struve 2398',
    'Groombridge 34', 'Epsilon Indi', 'DX Cancri', 'Tau Ceti', 'GJ 106',
    'Vega', 'Altair', 'Rigel', 'Betelgeuse', 'Polaris'
  ];

  const factions = ['united-colonies', 'deep-space-collective', 'void-pirates', 'independent'];
  const starTypes = ['G', 'K', 'M', 'F', 'A'];
  const starColors = ['#FFD700', '#FF8C00', '#FF4500', '#87CEEB', '#FFFFFF'];

  // FIXED: Generate systems first with proper initialization and corrected ID generation
  starNames.forEach((name, index) => {
    // FIXED: Proper regex to convert star names to valid system IDs
    const systemId = name.toLowerCase()
      .replace(/['\s]/g, '-')  // Replace apostrophes and spaces with hyphens
      .replace(/--+/g, '-')    // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    const angle = (index / starNames.length) * Math.PI * 2;
    const radius = 200 + Math.random() * 300;
    
    const starTypeIndex = Math.floor(Math.random() * starTypes.length);
    
    // FIXED: Ensure all required properties are properly initialized
    systems[systemId] = {
      id: systemId,
      name,
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      },
      star: {
        type: starTypes[starTypeIndex],
        color: starColors[starTypeIndex]
      },
      stations: [],
      asteroids: [],
      missions: [],
      connections: [], // FIXED: Ensure connections array is always initialized
      discovered: index === 0, // Only first system (Alpha Centauri) starts discovered
      controllingFaction: factions[Math.floor(Math.random() * factions.length)],
      worldObjects: [] // --- NEW: Initialize worldObjects array ---
    };
  });

  // FIXED: Generate connections between nearby systems with proper null checks
  const systemIds = Object.keys(systems);
  const systemValues = Object.values(systems);
  
  // Validate that all systems are properly created and log the starting system
  console.log(`Generated ${systemIds.length} systems for galaxy`);
  console.log('Starting system should be:', systemIds[0]); // This should be "alpha-centauri"
  
  // --- NEW: Store planned connections for WorldObject generation ---
  const plannedConnections: Array<{from: string, to: string}> = [];
  
  systemValues.forEach(system => {
    // FIXED: Add null checks and validation
    if (!system || !system.connections) {
      console.error('Invalid system found during connection generation:', system);
      return;
    }
    
    systemValues.forEach(otherSystem => {
      // FIXED: Add comprehensive null checks
      if (!otherSystem || !otherSystem.connections || system.id === otherSystem.id) {
        return;
      }
      
      try {
        const dist = distance(system.position, otherSystem.position);
        // Create connections for systems within reasonable range
        if (dist < 250 && Math.random() < 0.4) {
          // --- NEW: 10% chance for connection to be broken (for repair missions) ---
          if (Math.random() < 0.1) {
            // Create a damaged jump gate instead of direct connection
            const worldObject: WorldObject = {
              id: generateUniqueId('damaged-gate') as any,
              type: 'DamagedJumpGate',
              position: {
                x: system.position.x + (otherSystem.position.x - system.position.x) * 0.8,
                y: system.position.y + (otherSystem.position.y - system.position.y) * 0.8
              },
              status: 'DAMAGED',
              requiredItems: [
                { itemId: 'iron' as any, required: 5, supplied: 0 },
                { itemId: 'crystals' as any, required: 2, supplied: 0 }
              ]
            };
            system.worldObjects.push(worldObject);
            plannedConnections.push({from: system.id, to: otherSystem.id});
            console.log(`Created damaged jump gate in ${system.name} preventing connection to ${otherSystem.name}`);
          } else {
            // Normal connection
            if (!system.connections.includes(otherSystem.id)) {
              system.connections.push(otherSystem.id);
            }
            if (!otherSystem.connections.includes(system.id)) {
              otherSystem.connections.push(system.id);
            }
          }
        }
      } catch (error) {
        console.error('Error generating connections between systems:', {
          system: system?.id,
          otherSystem: otherSystem?.id,
          error
        });
      }
    });
  });

  // FIXED: Ensure all systems are reachable from Alpha Centauri with validation
  const visited = new Set<string>();
  const startingSystemId = systemIds[0]; // Should be "alpha-centauri" now
  const queue = [startingSystemId];
  
  // Validate starting system exists
  if (!systems[startingSystemId]) {
    console.error(`Starting system ${startingSystemId} not found! Available systems:`, Object.keys(systems));
    throw new Error(`Starting system ${startingSystemId} not found in generated galaxy`);
  } else {
    visited.add(startingSystemId);
    console.log(`Starting galaxy connectivity from: ${startingSystemId}`);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = systems[currentId];
    
    // FIXED: Add null check for current system
    if (!current || !current.connections) {
      console.error('Invalid system during reachability check:', currentId);
      continue;
    }
    
    current.connections.forEach(connectionId => {
      if (!visited.has(connectionId) && systems[connectionId]) {
        visited.add(connectionId);
        queue.push(connectionId);
      }
    });
  }

  // FIXED: Connect any unreachable systems with proper validation
  Object.keys(systems).forEach(systemId => {
    const system = systems[systemId];
    if (!system || !system.connections) {
      console.error('Invalid system during unreachable system connection:', systemId);
      return;
    }
    
    if (!visited.has(systemId)) {
      // Find closest reachable system and connect to it
      let closest = startingSystemId; // Use the validated starting system
      let closestDist = Infinity;
      
      visited.forEach(reachableId => {
        const reachableSystem = systems[reachableId];
        if (!reachableSystem) return;
        
        try {
          const dist = distance(system.position, reachableSystem.position);
          if (dist < closestDist) {
            closestDist = dist;
            closest = reachableId;
          }
        } catch (error) {
          console.error('Error calculating distance for unreachable system connection:', error);
        }
      });
      
      // FIXED: Validate closest system before connecting
      const closestSystem = systems[closest];
      if (closestSystem && closestSystem.connections) {
        system.connections.push(closest);
        closestSystem.connections.push(systemId);
        visited.add(systemId);
      }
    }
  });

  // Generate stations, asteroids, and missions for each system
  Object.values(systems).forEach(system => {
    // FIXED: Add null check for system
    if (!system) {
      console.error('Invalid system during content generation');
      return;
    }
    
    try {
      // Generate 1-3 stations per system
      const stationCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < stationCount; i++) {
        const angle = (i / stationCount) * Math.PI * 2 + Math.random();
        const radius = 300 + Math.random() * 200;
        
        const station = {
          // FIXED: Use unique ID generator for stations
          id: generateUniqueId(`${system.id}-station`),
          name: `${system.name} ${['Hub', 'Outpost', 'Station', 'Port', 'Base'][Math.floor(Math.random() * 5)]}`,
          type: ['trading', 'mining', 'military'][Math.floor(Math.random() * 3)] as any,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          },
          faction: system.controllingFaction,
          market: generateMarket(),
          missions: []
        };
        
        system.stations.push(station);
      }

      // Generate 4-10 asteroids per system
      const asteroidCount = Math.floor(Math.random() * 7) + 4;
      for (let i = 0; i < asteroidCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 150 + Math.random() * 400;
        const size = 15 + Math.random() * 25;
        
        const asteroid = {
          // FIXED: Use unique ID generator for asteroids
          id: generateUniqueId(`${system.id}-asteroid`),
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          },
          size,
          health: size * 2,
          resources: Math.random() < 0.8 ? [generateResource()] : []
        };
        
        system.asteroids.push(asteroid);
      }

      // --- NEW: Generate additional WorldObjects (broken relays) ---
      if (Math.random() < 0.2) { // 20% chance for broken relay
        const relay: WorldObject = {
          id: generateUniqueId('broken-relay') as any,
          type: 'BrokenRelay',
          position: {
            x: Math.random() * 1000 - 500,
            y: Math.random() * 1000 - 500
          },
          status: 'DAMAGED',
          requiredItems: [
            { itemId: 'platinum' as any, required: 3, supplied: 0 },
            { itemId: 'rare-metals' as any, required: 1, supplied: 0 }
          ]
        };
        system.worldObjects.push(relay);
        console.log(`Created broken relay in ${system.name}`);
      }

      // Generate missions for each station
      system.stations.forEach(station => {
        const missionCount = Math.floor(Math.random() * 5) + 2;
        for (let i = 0; i < missionCount; i++) {
          const mission = generateMission(system.id, station.id);
          station.missions.push(mission);
          system.missions.push(mission);
        }
      });
    } catch (error) {
      console.error('Error generating content for system:', system.id, error);
    }
  });

  // Log generation results
  console.log(`Generated galaxy with ${Object.keys(systems).length} systems:`);
  Object.values(systems).forEach(system => {
    if (system) {
      const worldObjectCount = system.worldObjects.length;
      console.log(`- ${system.name} (${system.id}): ${system.stations.length} stations, ${system.asteroids.length} asteroids (${system.asteroids.filter(a => a.resources.length > 0).length} with resources), ${system.missions.length} missions, ${worldObjectCount} world objects`);
    }
  });

  return systems;
}

// Market generation to only use valid commodities
function generateMarket() {
  const market: Record<string, any> = {};
  
  // Use only valid commodities from our defined list
  MARKET_COMMODITIES.forEach(commodityId => {
    // Not all stations carry all commodities
    if (Math.random() < 0.7) { // 70% chance each commodity is available
      market[commodityId] = {
        price: 50 + Math.floor(Math.random() * 100),
        supply: Math.floor(Math.random() * 50) + 10,
        demand: Math.floor(Math.random() * 100)
      };
    }
  });
  
  return market;
}

// Resource generation to only use valid resources
function generateResource() {
  const resourceId = ASTEROID_RESOURCES[Math.floor(Math.random() * ASTEROID_RESOURCES.length)];
  
  // Map resource IDs to their display data
  const resourceData = {
    'iron': { name: 'Iron Ore', basePrice: 30 },
    'platinum': { name: 'Platinum', basePrice: 150 },
    'crystals': { name: 'Quantum Crystals', basePrice: 200 },
    'rare-metals': { name: 'Rare Metals', basePrice: 100 }
  };
  
  const resource = resourceData[resourceId as keyof typeof resourceData];
  return {
    id: resourceId,
    name: resource.name,
    basePrice: resource.basePrice,
    quantity: Math.floor(Math.random() * 10) + 5
  };
}

function generateMission(systemId: string, stationId: string): Mission {
  const missionTypes = ['delivery', 'combat', 'mining', 'exploration', 'escort'];
  const type = missionTypes[Math.floor(Math.random() * missionTypes.length)] as any;
  
  const baseMission = {
    // FIXED: Use unique ID generator to prevent duplicate mission IDs
    id: generateUniqueId('mission'),
    title: '',
    description: '',
    type,
    source: stationId,
    reward: 500 + Math.floor(Math.random() * 1000),
    status: 'available' as any,
    progress: 0
  };

  switch (type) {
    case 'delivery':
      return {
        ...baseMission,
        title: 'Cargo Delivery',
        description: 'Transport goods to a distant station safely.',
        cargo: {
          id: 'delivery-package',
          name: 'Delivery Package',
          quantity: Math.floor(Math.random() * 5) + 1,
          basePrice: 0
        },
        destination: systemId
      };
    
    case 'combat':
      return {
        ...baseMission,
        title: 'Eliminate Hostiles',
        description: 'Destroy enemy ships threatening trade routes.',
        target: 'Pirates',
        targetCount: Math.floor(Math.random() * 3) + 2
      };
    
    case 'mining':
      return {
        ...baseMission,
        title: 'Resource Extraction',
        description: 'Mine valuable resources from asteroids.',
        requiredResource: ASTEROID_RESOURCES[Math.floor(Math.random() * ASTEROID_RESOURCES.length)],
        targetQuantity: Math.floor(Math.random() * 10) + 5
      };
    
    case 'exploration':
      return {
        ...baseMission,
        title: 'System Survey',
        description: 'Explore and map uncharted regions.',
        destination: systemId
      };
    
    case 'escort':
      return {
        ...baseMission,
        title: 'Escort Mission',
        description: 'Protect a convoy from hostile forces.',
        destination: systemId,
        timeLimit: 24
      };
    
    default:
      return baseMission;
  }
}

// Mission tracking and completion utilities
export function checkMissionProgress(mission: Mission, gameState: any): boolean {
  switch (mission.type) {
    case 'delivery':
      // FIXED: Don't auto-complete delivery missions - they need manual completion logic
      return false; // Handled separately in useGameState
    
    case 'mining':
      // Check if required resource has been mined
      return gameState.player.cargo.some((item: CargoItem) => 
        item.id === mission.requiredResource && item.quantity >= (mission.targetQuantity || 0)
      );
    
    case 'exploration':
      // Check if destination system has been visited
      return gameState.currentSystem === mission.destination;
    
    case 'combat':
      // Check if enough enemies have been killed
      return mission.progress >= (mission.targetCount || 1);
    
    case 'escort':
      // Check if escort destination reached without convoy loss
      return gameState.currentSystem === mission.destination;
    
    default:
      return false;
  }
}

export function applyCollisionDamage(ship: Ship, damage: number): void {
  // Apply damage to shields first, then hull
  if (ship.shields > 0) {
    const shieldDamage = Math.min(damage, ship.shields);
    ship.shields -= shieldDamage;
    damage -= shieldDamage;
  }
  
  if (damage > 0) {
    ship.health -= damage;
    if (ship.health <= 0) {
      ship.health = 0;
    }
  }
}

// FIXED: Ship module management utilities with corrected weapon logic
export function canAddModule(ship: Ship, moduleType: string): boolean {
  // FIXED: For weapons, always allow replacement
  if (moduleType === 'weapon') {
    return true; // Always allow weapon purchases for replacement
  }
  
  // For other modules, check if there are free slots
  return ship.modules.length < ship.hull.moduleSlots;
}

export function addModuleToShip(ship: Ship, module: any): boolean {
  // For weapons, always replace existing weapon
  if (module.type === 'weapon') {
    const existingWeaponIndex = ship.modules.findIndex(m => 
      m.type === 'weapon' && ['basic-laser', 'pulse-cannon', 'missile-launcher'].includes(m.id)
    );
    
    if (existingWeaponIndex >= 0) {
      // Remove stats from old weapon
      const oldWeapon = ship.modules[existingWeaponIndex];
      removeModuleStats(ship, oldWeapon);
      
      // Replace with new weapon
      ship.modules[existingWeaponIndex] = module;
      applyModuleStats(ship, module);
      return true;
    } else {
      // No weapon to replace, add as new (if slots available)
      if (ship.modules.length < ship.hull.moduleSlots) {
        ship.modules.push(module);
        applyModuleStats(ship, module);
        return true;
      }
      return false;
    }
  }
  
  // For other modules, check slot availability
  if (ship.modules.length >= ship.hull.moduleSlots) {
    return false;
  }
  
  // Add module and apply stats
  ship.modules.push(module);
  applyModuleStats(ship, module);
  return true;
}

function applyModuleStats(ship: Ship, module: any): void {
  if (module.stats.shieldBonus) {
    ship.maxShields += module.stats.shieldBonus;
    ship.shields += module.stats.shieldBonus;
  }
  if (module.stats.cargoBonus) {
    ship.maxCargo += module.stats.cargoBonus;
  }
  if (module.stats.energyBonus) {
    ship.maxEnergy += module.stats.energyBonus;
    ship.energy += module.stats.energyBonus;
  }
  if (module.stats.healthBonus) {
    ship.maxHealth += module.stats.healthBonus;
    ship.health += module.stats.healthBonus;
  }
}

function removeModuleStats(ship: Ship, module: any): void {
  if (module.stats.shieldBonus) {
    ship.maxShields -= module.stats.shieldBonus;
    ship.shields = Math.min(ship.shields, ship.maxShields);
  }
  if (module.stats.cargoBonus) {
    ship.maxCargo -= module.stats.cargoBonus;
  }
  if (module.stats.energyBonus) {
    ship.maxEnergy -= module.stats.energyBonus;
    ship.energy = Math.min(ship.energy, ship.maxEnergy);
  }
  if (module.stats.healthBonus) {
    ship.maxHealth -= module.stats.healthBonus;
    ship.health = Math.min(ship.health, ship.maxHealth);
  }
}