import { create } from 'zustand';
import { GameState, Ship, StarSystem, Enemy, Vector2, Mission, CargoItem } from '../types/game';
import { SHIP_HULLS, SHIP_MODULES, STARTING_SHIP_CONFIG, FACTIONS, COMMODITIES } from '../data/gameData';
import { generateGalaxy, addCargo, removeCargo, distance, checkMissionProgress, applyCollisionDamage, addModuleToShip } from '../utils/gameUtils';

// FIXED: Add unique ID generator to prevent duplicate keys in store
let storeIdCounter = 0;
function generateUniqueStoreId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++storeIdCounter}`;
}

// Extended game state to include dynamic entities and player input
interface GameStore extends GameState {
  // Dynamic game entities
  enemies: Enemy[];
  projectiles: Array<{
    id: string;
    position: Vector2;
    velocity: Vector2;
    life: number;
    damage: number;
    owner: string;
  }>;
  explosions: Array<{
    id: string;
    position: Vector2;
    life: number;
    scale: number;
  }>;
  
  // Player input state for physics engine
  playerInput: {
    isThrusting: boolean;
    targetAngle: number;
  };
  
  // Game timing
  lastUpdateTime: number;
  lastEnemySpawnTime: number;
  
  // Actions - FIXED: Made more stable and reduced side effects
  actions: {
    // Player movement - now just sets input state
    setPlayerInput: (isThrusting: boolean, targetAngle: number) => void;
    
    // Player actions
    fireWeapon: () => void;
    
    // Navigation
    jumpToSystem: (systemId: string) => void;
    setActiveMode: (mode: GameState['activeMode']) => void;
    setSelectedTarget: (targetId: string | undefined) => void;
    
    // Station interactions
    dockAtStation: (stationId: string) => void;
    undockFromStation: () => void;
    buyItem: (itemId: string, quantity: number, price: number) => void;
    sellItem: (itemId: string, quantity: number, price: number) => void;
    repairShip: () => void;
    refuelShip: () => void;
    
    // Mining and missions
    mineAsteroid: (asteroidId: string) => void;
    acceptMission: (mission: Mission) => void;
    completeMission: (missionId: string) => void;
    abandonMission: (missionId: string) => void; // --- NEW: Abandon mission action ---
    
    // Enemy management - FIXED: Simplified to reduce GameLoop coupling
    spawnEnemy: (position: Vector2, faction?: string) => void;
    
    // Initialize game
    initializeGame: () => void;
  };
}

function createInitialGameState(): GameState {
  const galaxy = generateGalaxy();
  // FIXED: Use the first system (which should be alpha-centauri) instead of hardcoding
  const startingSystemId = Object.keys(galaxy)[0];
  const startingSystem = galaxy[startingSystemId];
  
  if (!startingSystem) {
    throw new Error('No starting system found in generated galaxy');
  }
  
  const startingStation = startingSystem.stations[0];
  if (!startingStation) {
    throw new Error('No starting station found in starting system');
  }

  console.log(`🎮 Starting game in system: ${startingSystemId} (${startingSystem.name})`);

  const hull = SHIP_HULLS[STARTING_SHIP_CONFIG.hull];
  const player: Ship = {
    id: 'player',
    name: 'Player Ship',
    hull,
    position: { x: startingStation.position.x + 100, y: startingStation.position.y + 100 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: hull.maxHealth,
    maxHealth: hull.maxHealth,
    shields: hull.maxShields,
    maxShields: hull.maxShields,
    energy: hull.maxEnergy,
    maxEnergy: hull.maxEnergy,
    fuel: hull.maxFuel,
    maxFuel: hull.maxFuel,
    cargo: [],
    maxCargo: hull.maxCargo,
    modules: STARTING_SHIP_CONFIG.modules.map(id => SHIP_MODULES[id]),
    faction: 'player',
    detectionSignature: 100 // --- NEW: Default detection signature for stealth mechanics ---
  };

  return {
    player,
    currentSystem: startingSystemId,
    galaxy,
    factions: { ...FACTIONS },
    credits: STARTING_SHIP_CONFIG.credits,
    activeMode: 'system',
    activeMissions: [],
    trackedMissionId: undefined, // --- NEW: For HUD mission tracking ---
    codex: [], // --- NEW: For archaeological expedition lore ---
    gameTime: 0,
    runNumber: 1,
    metaProgress: {
      unlockedHulls: ['light-freighter'],
      unlockedModules: ['basic-laser', 'shield-booster'],
      legacyCredits: 0
    }
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initialize with default game state
  ...createInitialGameState(),
  
  // Dynamic entities
  enemies: [],
  projectiles: [],
  explosions: [],
  
  // Player input
  playerInput: {
    isThrusting: false,
    targetAngle: 0
  },
  
  // Timing
  lastUpdateTime: Date.now(),
  lastEnemySpawnTime: Date.now(),
  
  // FIXED: Stable actions with minimal side effects
  actions: {
    // Player input - just stores input state, physics handled by game loop
    setPlayerInput: (isThrusting: boolean, targetAngle: number) => {
      // FIXED: Only update if changed to prevent unnecessary re-renders
      const current = get().playerInput;
      if (current.isThrusting !== isThrusting || Math.abs(current.targetAngle - targetAngle) > 0.01) {
        set({ playerInput: { isThrusting, targetAngle } });
      }
    },
    
    fireWeapon: () => {
      const state = get();
      if (state.player.energy < 10) return;
      
      // Calculate weapon stats from modules
      let damage = 20;
      let energyCost = 10;
      let projectileSpeed = 300;
      
      state.player.modules.forEach(module => {
        if (module.type === 'weapon') {
          if (module.stats.damage) damage += module.stats.damage;
          if (module.stats.energyCost) energyCost += module.stats.energyCost;
          if (module.stats.projectileSpeed) projectileSpeed += module.stats.projectileSpeed;
        }
      });
      
      // FIXED: Use unique ID generator for projectiles
      const newProjectile = {
        id: generateUniqueStoreId('proj'),
        position: { ...state.player.position },
        velocity: {
          x: Math.cos(state.player.rotation) * projectileSpeed,
          y: Math.sin(state.player.rotation) * projectileSpeed
        },
        life: 1.0,
        damage: damage,
        owner: 'player'
      };
      
      // FIXED: Batch updates
      set(state => ({
        player: {
          ...state.player,
          energy: state.player.energy - energyCost
        },
        projectiles: [...state.projectiles, newProjectile]
      }));
    },
    
    jumpToSystem: (systemId: string) => {
      const state = get();
      
      if (state.player.fuel < 10) return;
      
      const currentSystem = state.galaxy[state.currentSystem];
      const targetSystem = state.galaxy[systemId];
      
      if (!targetSystem || !currentSystem.connections.includes(systemId)) return;
      
      // Mark target system as discovered
      const newGalaxy = { ...state.galaxy };
      newGalaxy[systemId] = { ...newGalaxy[systemId], discovered: true };
      
      // Also discover connected systems for better exploration
      targetSystem.connections.forEach(connectedId => {
        if (Math.random() < 0.3) {
          newGalaxy[connectedId] = { ...newGalaxy[connectedId], discovered: true };
        }
      });
      
      set({
        currentSystem: systemId,
        galaxy: newGalaxy,
        player: {
          ...state.player,
          fuel: state.player.fuel - 10,
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 }
        },
        // Clear dynamic entities when jumping
        enemies: [],
        projectiles: [],
        explosions: []
      });
    },
    
    setActiveMode: (mode: GameState['activeMode']) => {
      // FIXED: Only update if changed
      const current = get().activeMode;
      if (current !== mode) {
        set({ activeMode: mode });
      }
    },
    
    setSelectedTarget: (targetId: string | undefined) => {
      // FIXED: Only update if changed
      const current = get().selectedTarget;
      if (current !== targetId) {
        set({ selectedTarget: targetId });
      }
    },
    
    dockAtStation: (stationId: string) => {
      const state = get();
      const currentSystem = state.galaxy[state.currentSystem];
      const station = currentSystem.stations.find(s => s.id === stationId);
      if (!station) return;
      
      const dist = distance(state.player.position, station.position);
      if (dist > 50) return;
      
      set({
        activeMode: 'station',
        selectedTarget: stationId
      });
    },
    
    undockFromStation: () => set({
      activeMode: 'system',
      selectedTarget: undefined
    }),
    
    buyItem: (itemId: string, quantity: number, price: number) => {
      const state = get();
      if (state.credits < price * quantity) return;
      
      if (COMMODITIES[itemId]) {
        const currentCargo = state.player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (currentCargo + quantity > state.player.maxCargo) return;
        
        const newPlayer = { ...state.player };
        const commodity = { ...COMMODITIES[itemId], quantity };
        if (addCargo(newPlayer, commodity)) {
          set({
            player: newPlayer,
            credits: state.credits - (price * quantity)
          });
        }
      } else if (SHIP_MODULES[itemId]) {
        const newPlayer = { ...state.player };
        const module = SHIP_MODULES[itemId];
        if (addModuleToShip(newPlayer, module)) {
          set({
            player: newPlayer,
            credits: state.credits - (price * quantity)
          });
        }
      }
    },
    
    sellItem: (itemId: string, quantity: number, price: number) => {
      const state = get();
      const newPlayer = { ...state.player };
      
      if (removeCargo(newPlayer, itemId, quantity)) {
        set({
          player: newPlayer,
          credits: state.credits + (price * quantity)
        });
      }
    },
    
    repairShip: () => {
      const state = get();
      const repairCost = (state.player.maxHealth - state.player.health) * 2;
      if (state.credits < repairCost) return;
      
      set({
        credits: state.credits - repairCost,
        player: {
          ...state.player,
          health: state.player.maxHealth
        }
      });
    },
    
    refuelShip: () => {
      const state = get();
      const fuelCost = state.player.maxFuel - state.player.fuel;
      if (state.credits < fuelCost) return;
      
      set({
        credits: state.credits - fuelCost,
        player: {
          ...state.player,
          fuel: state.player.maxFuel
        }
      });
    },
    
    mineAsteroid: (asteroidId: string) => {
      const state = get();
      const currentSystem = state.galaxy[state.currentSystem];
      const asteroid = currentSystem.asteroids.find(a => a.id === asteroidId);
      
      if (!asteroid || asteroid.resources.length === 0) return;
      
      const dist = distance(state.player.position, asteroid.position);
      if (dist > asteroid.size + 30) return;
      
      const resource = asteroid.resources[0];
      const minedQuantity = Math.min(resource.quantity, 1);
      
      const newPlayer = { ...state.player };
      if (addCargo(newPlayer, { ...resource, quantity: minedQuantity })) {
        // Update asteroid
        resource.quantity -= minedQuantity;
        if (resource.quantity <= 0) {
          asteroid.resources = asteroid.resources.filter(r => r.id !== resource.id);
        }
        
        asteroid.health -= 10;
        const newGalaxy = { ...state.galaxy };
        const newCurrentSystem = { ...newGalaxy[state.currentSystem] };
        
        if (asteroid.health <= 0) {
          newCurrentSystem.asteroids = newCurrentSystem.asteroids.filter(a => a.id !== asteroidId);
        }
        
        newGalaxy[state.currentSystem] = newCurrentSystem;
        
        set({
          player: newPlayer,
          galaxy: newGalaxy
        });
      }
    },
    
    acceptMission: (mission: Mission) => {
      const state = get();
      if (state.activeMissions.length >= 5) return;
      
      const newMission = { ...mission, status: 'ACTIVE' as any };
      
      // --- UPDATED: Handle mission cargo using new format ---
      if (mission.rewardItems && mission.type === 'DELIVERY') {
        const currentCargo = state.player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (currentCargo + mission.rewardItems.quantity > state.player.maxCargo) return;
        
        const newPlayer = { ...state.player };
        const cargoItem = {
          id: mission.rewardItems.itemId,
          name: 'Mission Cargo',
          category: 'mission',
          quantity: mission.rewardItems.quantity,
          basePrice: 0
        };
        if (addCargo(newPlayer, cargoItem)) {
          set({
            player: newPlayer,
            activeMissions: [...state.activeMissions, newMission],
            trackedMissionId: newMission.id // --- NEW: Auto-track new missions ---
          });
        }
      } else {
        set({
          activeMissions: [...state.activeMissions, newMission],
          trackedMissionId: newMission.id // --- NEW: Auto-track new missions ---
        });
      }
    },
    
    completeMission: (missionId: string) => {
      const state = get();
      const mission = state.activeMissions.find(m => m.id === missionId);
      if (!mission) return;
      
      // Apply reputation changes
      const newFactions = { ...state.factions };
      Object.entries(mission.reputationChange).forEach(([factionId, change]) => {
        if (newFactions[factionId] && change) {
          newFactions[factionId] = {
            ...newFactions[factionId],
            reputation: newFactions[factionId].reputation + change
          };
        }
      });
      
      set({
        credits: state.credits + mission.rewardCredits,
        factions: newFactions,
        activeMissions: state.activeMissions.filter(m => m.id !== missionId),
        trackedMissionId: state.trackedMissionId === missionId ? undefined : state.trackedMissionId
      });
    },
    
    // --- NEW: Abandon mission action ---
    abandonMission: (missionId: string) => {
      const state = get();
      const mission = state.activeMissions.find(m => m.id === missionId);
      if (!mission) return;
      
      // Apply reputation penalty (negative of the positive changes)
      const newFactions = { ...state.factions };
      Object.entries(mission.reputationChange).forEach(([factionId, change]) => {
        if (newFactions[factionId] && change && change > 0) {
          newFactions[factionId] = {
            ...newFactions[factionId],
            reputation: newFactions[factionId].reputation - 5 // Fixed penalty for abandoning
          };
        }
      });
      
      // Remove mission cargo if it was a delivery mission
      let newPlayer = { ...state.player };
      if (mission.type === 'DELIVERY' && mission.rewardItems) {
        removeCargo(newPlayer, mission.rewardItems.itemId, mission.rewardItems.quantity);
      }
      
      set({
        player: newPlayer,
        factions: newFactions,
        activeMissions: state.activeMissions.filter(m => m.id !== missionId),
        trackedMissionId: state.trackedMissionId === missionId ? undefined : state.trackedMissionId
      });
    },
    
    // FIXED: Simplified enemy spawn with unique IDs
    spawnEnemy: (position: Vector2, faction: string = 'void-pirates') => {
      const state = get();
      
      if (state.enemies.length >= 3) return; // Limit enemies
      
      // FIXED: Use unique ID generator for enemy ships
      const enemyShip: Ship = {
        id: generateUniqueStoreId('enemy-ship'),
        name: 'Pirate Vessel',
        hull: SHIP_HULLS['light-freighter'],
        position: { ...position },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        health: 60,
        maxHealth: 60,
        shields: 20,
        maxShields: 20,
        energy: 100,
        maxEnergy: 100,
        fuel: 100,
        maxFuel: 100,
        cargo: [],
        maxCargo: 10,
        modules: [SHIP_MODULES['basic-laser']],
        faction
      };

      const enemy: Enemy = {
        id: generateUniqueStoreId('enemy'),
        ship: enemyShip,
        ai: {
          behavior: 'aggressive',
          target: 'player',
          lastAction: Date.now()
        }
      };

      set(state => ({
        enemies: [...state.enemies, enemy],
        lastEnemySpawnTime: Date.now()
      }));
    },
    
    initializeGame: () => {
      // FIXED: Reset ID counter for new game
      storeIdCounter = 0;
      const newState = createInitialGameState();
      set({
        ...newState,
        enemies: [],
        projectiles: [],
        explosions: [],
        playerInput: { isThrusting: false, targetAngle: 0 },
        lastUpdateTime: Date.now(),
        lastEnemySpawnTime: Date.now()
      });
    }
  }
}));