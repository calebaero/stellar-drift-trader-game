import { Ship, Vector2, StarSystem, CargoItem, Mission } from '../types/game';
import { MARKET_COMMODITIES, ASTEROID_RESOURCES } from '../data/gameData';

export function distance(pos1: Vector2, pos2: Vector2): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function updateShipPhysics(ship: Ship, thrustVector: Vector2, deltaTime: number) {
  // Apply thrust - using smaller multiplier here since we increased it in moveShip
  ship.velocity.x += thrustVector.x * deltaTime * 0.08;
  ship.velocity.y += thrustVector.y * deltaTime * 0.08;
  
  // Apply drag
  ship.velocity.x *= 0.98;
  ship.velocity.y *= 0.98;
  
  // Update position
  ship.position.x += ship.velocity.x * deltaTime;
  ship.position.y += ship.velocity.y * deltaTime;
}

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

  // Generate systems first
  starNames.forEach((name, index) => {
    const systemId = name.toLowerCase().replace(/['\s]/g, '-');
    const angle = (index / starNames.length) * Math.PI * 2;
    const radius = 200 + Math.random() * 300;
    
    const starTypeIndex = Math.floor(Math.random() * starTypes.length);
    
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
      connections: [],
      discovered: index === 0, // Only first system (Alpha Centauri) starts discovered
      controllingFaction: factions[Math.floor(Math.random() * factions.length)]
    };
  });

  // Generate connections between nearby systems
  Object.values(systems).forEach(system => {
    Object.values(systems).forEach(otherSystem => {
      if (system.id !== otherSystem.id) {
        const dist = distance(system.position, otherSystem.position);
        // Create connections for systems within reasonable range
        if (dist < 250 && Math.random() < 0.4) {
          if (!system.connections.includes(otherSystem.id)) {
            system.connections.push(otherSystem.id);
          }
          if (!otherSystem.connections.includes(system.id)) {
            otherSystem.connections.push(system.id);
          }
        }
      }
    });
  });

  // Ensure all systems are reachable from Alpha Centauri
  const visited = new Set<string>();
  const queue = ['alpha-centauri'];
  visited.add('alpha-centauri');

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = systems[currentId];
    
    current.connections.forEach(connectionId => {
      if (!visited.has(connectionId)) {
        visited.add(connectionId);
        queue.push(connectionId);
      }
    });
  }

  // Connect any unreachable systems
  Object.keys(systems).forEach(systemId => {
    if (!visited.has(systemId)) {
      // Find closest reachable system and connect to it
      let closest = 'alpha-centauri';
      let closestDist = Infinity;
      
      visited.forEach(reachableId => {
        const dist = distance(systems[systemId].position, systems[reachableId].position);
        if (dist < closestDist) {
          closestDist = dist;
          closest = reachableId;
        }
      });
      
      systems[systemId].connections.push(closest);
      systems[closest].connections.push(systemId);
      visited.add(systemId);
    }
  });

  // Generate stations, asteroids, and missions for each system
  Object.values(systems).forEach(system => {
    // Generate 1-3 stations per system
    const stationCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < stationCount; i++) {
      const angle = (i / stationCount) * Math.PI * 2 + Math.random();
      const radius = 300 + Math.random() * 200;
      
      const station = {
        id: `${system.id}-station-${i}`,
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
        id: `${system.id}-asteroid-${i}`,
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

    // Generate missions for each station
    system.stations.forEach(station => {
      const missionCount = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < missionCount; i++) {
        const mission = generateMission(system.id, station.id);
        station.missions.push(mission);
        system.missions.push(mission);
      }
    });
  });

  // Log generation results
  console.log(`Generated galaxy with ${Object.keys(systems).length} systems:`);
  Object.values(systems).forEach(system => {
    console.log(`- ${system.name}: ${system.stations.length} stations, ${system.asteroids.length} asteroids (${system.asteroids.filter(a => a.resources.length > 0).length} with resources), ${system.missions.length} missions`);
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
    id: `mission-${Date.now()}-${Math.random()}`,
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