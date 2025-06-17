import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameState, Ship, StarSystem, Enemy, Vector2, Mission, CargoItem } from '../types/game';
import { SHIP_HULLS, SHIP_MODULES, STARTING_SHIP_CONFIG, FACTIONS, COMMODITIES } from '../data/gameData';
import { generateGalaxy, updateShipPhysics, calculateDamage, addCargo, removeCargo, distance, checkMissionProgress, applyCollisionDamage, addModuleToShip } from '../utils/gameUtils';
import { SpaceshipPhysicsEngine } from '../utils/SpaceshipPhysicsEngine';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<any[]>([]);
  const [explosions, setExplosions] = useState<any[]>([]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const lastEnemySpawnRef = useRef<number>(Date.now());

  // Create persistent physics engine instance
  const physicsEngine = useMemo(() => new SpaceshipPhysicsEngine(), []);

  function initializeGame(): GameState {
    const galaxy = generateGalaxy();
    const startingSystemId = Object.keys(galaxy)[0];
    const startingSystem = galaxy[startingSystemId];
    const startingStation = startingSystem.stations[0];

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
      faction: 'player'
    };

    return {
      player,
      currentSystem: startingSystemId,
      galaxy,
      factions: { ...FACTIONS },
      credits: STARTING_SHIP_CONFIG.credits,
      activeMode: 'system',
      activeMissions: [],
      gameTime: 0,
      runNumber: 1,
      metaProgress: {
        unlockedHulls: ['light-freighter'],
        unlockedModules: ['basic-laser', 'shield-booster'],
        legacyCredits: 0
      }
    };
  }

  const updateGame = useCallback(() => {
    const currentTime = Date.now();
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 1/30);
    lastTimeRef.current = currentTime;

    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Update game time
      newState.gameTime += deltaTime;
      
      // Regenerate shields and energy
      if (newState.player.shields < newState.player.maxShields) {
        newState.player.shields = Math.min(
          newState.player.maxShields,
          newState.player.shields + deltaTime * 10
        );
      }
      
      if (newState.player.energy < newState.player.maxEnergy) {
        newState.player.energy = Math.min(
          newState.player.maxEnergy,
          newState.player.energy + deltaTime * 20
        );
      }

      // Check mission progress with improved delivery logic
      newState.activeMissions = newState.activeMissions.map(mission => {
        if (mission.status === 'active') {
          // Special handling for delivery missions
          if (mission.type === 'delivery') {
            // Must be at destination AND have the cargo
            const atDestination = newState.currentSystem === mission.destination;
            const hasCargo = newState.player.cargo.some((item: CargoItem) => 
              item.id === mission.cargo?.id && item.quantity >= (mission.cargo?.quantity || 0)
            );
            
            if (atDestination && hasCargo) {
              // Remove the delivery cargo and complete mission
              if (mission.cargo) {
                removeCargo(newState.player, mission.cargo.id, mission.cargo.quantity);
              }
              newState.credits += mission.reward;
              return { ...mission, status: 'completed' };
            }
          } else if (checkMissionProgress(mission, newState)) {
            // Complete other mission types
            newState.credits += mission.reward;
            return { ...mission, status: 'completed' };
          }
        }
        return mission;
      }).filter(mission => mission.status !== 'completed');
      
      return newState;
    });

    // Auto-spawn enemies based on system danger level
    if (gameState.activeMode === 'system' && currentTime - lastEnemySpawnRef.current > 30000) {
      const currentSystem = gameState.galaxy[gameState.currentSystem];
      const dangerLevel = currentSystem.controllingFaction === 'void-pirates' ? 0.8 : 
                         currentSystem.controllingFaction === 'independent' ? 0.3 : 0.1;
      
      if (Math.random() < dangerLevel && enemies.length < 3) {
        const spawnDistance = 800 + Math.random() * 400;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnPosition = {
          x: gameState.player.position.x + Math.cos(spawnAngle) * spawnDistance,
          y: gameState.player.position.y + Math.sin(spawnAngle) * spawnDistance
        };
        spawnEnemy(spawnPosition, 'void-pirates');
        lastEnemySpawnRef.current = currentTime;
      }
    }

    // Update enemies with improved AI
    setEnemies(prevEnemies => 
      prevEnemies.map(enemy => {
        const dx = gameState.player.position.x - enemy.ship.position.x;
        const dy = gameState.player.position.y - enemy.ship.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Improved AI behavior
        if (dist > 50 && dist < 800) {
          // Move toward player with more realistic speed
          const thrust = {
            x: (dx / dist) * 60,
            y: (dy / dist) * 60
          };
          updateShipPhysics(enemy.ship, thrust, deltaTime);
          enemy.ship.rotation = Math.atan2(dy, dx);
          
          // Fire at player if in range and has energy
          if (dist < 300 && enemy.ship.energy > 10 && Math.random() < 0.02) {
            enemy.ship.energy -= 10;
            const projectile = {
              id: `enemy-proj-${Date.now()}`,
              position: { ...enemy.ship.position },
              velocity: {
                x: Math.cos(enemy.ship.rotation) * 250,
                y: Math.sin(enemy.ship.rotation) * 250
              },
              life: 1.0,
              damage: 15,
              owner: 'enemy'
            };
            setProjectiles(prev => [...prev, projectile]);
          }
        }
        
        // Regenerate enemy energy
        if (enemy.ship.energy < enemy.ship.maxEnergy) {
          enemy.ship.energy = Math.min(enemy.ship.maxEnergy, enemy.ship.energy + deltaTime * 15);
        }
        
        return enemy;
      })
    );

    // Update projectiles
    setProjectiles(prev => 
      prev.map(projectile => ({
        ...projectile,
        position: {
          x: projectile.position.x + projectile.velocity.x * deltaTime,
          y: projectile.position.y + projectile.velocity.y * deltaTime
        },
        life: projectile.life - deltaTime
      })).filter(projectile => projectile.life > 0)
    );

    // Check projectile collisions
    setProjectiles(prevProjectiles => {
      const newProjectiles = [...prevProjectiles];
      
      newProjectiles.forEach(projectile => {
        if (projectile.owner === 'player') {
          // Check collisions with enemies
          enemies.forEach(enemy => {
            const dist = distance(projectile.position, enemy.ship.position);
            if (dist < 20) {
              damageShip(enemy.id, projectile.damage);
              projectile.life = 0;
              
              setExplosions(prev => [...prev, {
                id: `exp-${Date.now()}`,
                position: { ...enemy.ship.position },
                life: 0.5,
                scale: 1
              }]);
            }
          });
        } else if (projectile.owner === 'enemy') {
          // Check collisions with player
          const dist = distance(projectile.position, gameState.player.position);
          if (dist < 20) {
            damageShip('player', projectile.damage);
            projectile.life = 0;
            
            setExplosions(prev => [...prev, {
              id: `exp-${Date.now()}`,
              position: { ...gameState.player.position },
              life: 0.5,
              scale: 1
            }]);
          }
        }
      });
      
      return newProjectiles;
    });

    // Update explosions
    setExplosions(prev => 
      prev.map(explosion => ({
        ...explosion,
        life: explosion.life - deltaTime,
        scale: explosion.scale + deltaTime * 2
      })).filter(explosion => explosion.life > 0)
    );

    animationRef.current = requestAnimationFrame(updateGame);
  }, [gameState.player.position, gameState.activeMode, gameState.currentSystem, enemies.length]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateGame]);

  // REFACTORED: New unified moveShip function using physics engine
  const moveShip = useCallback((isThrusting: boolean, targetAngle: number) => {
    setGameState(prevState => {
      // We assume a fixed timestep for a 60 FPS game loop.
      // For a more advanced implementation, this could be calculated dynamically.
      const deltaTime = 1 / 60; 

      // Prepare the input object for the physics engine.
      const input = { targetAngle, isThrusting };

      // Convert ship state to physics engine format
      const currentShipState = {
        x: prevState.player.position.x,
        y: prevState.player.position.y,
        vx: prevState.player.velocity.x,
        vy: prevState.player.velocity.y,
        rotation: prevState.player.rotation
      };

      // Delegate all physics calculations to the engine.
      // It takes the current player state and input, and returns a new, updated state.
      const updatedShipState = physicsEngine.updateShipState(currentShipState, input, deltaTime);

      // Convert back to game state format
      const updatedPlayer = {
        ...prevState.player,
        position: { x: updatedShipState.x, y: updatedShipState.y },
        velocity: { x: updatedShipState.vx, y: updatedShipState.vy },
        rotation: updatedShipState.rotation
      };

      // Create the new game state object, preserving the previous state
      // and only replacing the player object with the updated version.
      const newState = {
        ...prevState,
        player: updatedPlayer,
      };

      // IMPORTANT: The existing collision detection logic should be preserved here.
      // This refactor only concerns the player's movement physics.
      
      // Check collisions with asteroids - Less deadly, affects shields first
      const currentSystem = newState.galaxy[newState.currentSystem];
      currentSystem.asteroids.forEach(asteroid => {
        const dist = distance(newState.player.position, asteroid.position);
        if (dist < asteroid.size + 15) {
          const pushX = (newState.player.position.x - asteroid.position.x) / dist;
          const pushY = (newState.player.position.y - asteroid.position.y) / dist;
          newState.player.position.x = asteroid.position.x + pushX * (asteroid.size + 15);
          newState.player.position.y = asteroid.position.y + pushY * (asteroid.size + 15);
          
          // Less damage, affects shields first
          applyCollisionDamage(newState.player, 2);
        }
      });

      // Check collisions with enemies
      setEnemies(prevEnemies => 
        prevEnemies.map(enemy => {
          const dist = distance(newState.player.position, enemy.ship.position);
          if (dist < 25) {
            // Push apart
            const pushX = (newState.player.position.x - enemy.ship.position.x) / dist;
            const pushY = (newState.player.position.y - enemy.ship.position.y) / dist;
            
            newState.player.position.x += pushX * 15;
            newState.player.position.y += pushY * 15;
            enemy.ship.position.x -= pushX * 15;
            enemy.ship.position.y -= pushY * 15;
            
            // Apply collision damage to both
            applyCollisionDamage(newState.player, 5);
            applyCollisionDamage(enemy.ship, 5);
          }
          return enemy;
        })
      );

      return newState;
    });
  }, [physicsEngine]); // Add physicsEngine to the dependency array.

  // REMOVED: rotateShip function is now obsolete as rotation is handled in moveShip

  const fireWeapon = useCallback(() => {
    setGameState(prevState => {
      if (prevState.player.energy < 10) return prevState;
      
      const newState = { ...prevState };
      
      // Calculate weapon stats from modules
      let damage = 20;
      let energyCost = 10;
      let projectileSpeed = 300;
      
      newState.player.modules.forEach(module => {
        if (module.type === 'weapon') {
          if (module.stats.damage) damage += module.stats.damage;
          if (module.stats.energyCost) energyCost += module.stats.energyCost;
          if (module.stats.projectileSpeed) projectileSpeed += module.stats.projectileSpeed;
        }
      });
      
      newState.player.energy -= energyCost;
      
      const projectile = {
        id: `proj-${Date.now()}`,
        position: { ...newState.player.position },
        velocity: {
          x: Math.cos(newState.player.rotation) * projectileSpeed,
          y: Math.sin(newState.player.rotation) * projectileSpeed
        },
        life: 1.0,
        damage: damage,
        owner: 'player'
      };
      
      setProjectiles(prev => [...prev, projectile]);
      
      return newState;
    });
  }, []);

  const jumpToSystem = useCallback((systemId: string) => {
    console.log('Attempting to jump to system:', systemId);
    
    setGameState(prevState => {
      console.log('Current fuel:', prevState.player.fuel);
      if (prevState.player.fuel < 10) {
        console.log('Not enough fuel for jump');
        return prevState;
      }
      
      const currentSystem = prevState.galaxy[prevState.currentSystem];
      const targetSystem = prevState.galaxy[systemId];
      
      if (!targetSystem) {
        console.log('Target system not found:', systemId);
        return prevState;
      }
      
      const isConnected = currentSystem.connections.includes(systemId);
      console.log('Is connected:', isConnected);
      
      if (!isConnected) {
        console.log('System not connected');
        return prevState;
      }
      
      const newState = { ...prevState };
      newState.currentSystem = systemId;
      newState.player.fuel -= 10;
      newState.player.position = { x: 0, y: 0 };
      newState.player.velocity = { x: 0, y: 0 };
      
      // Mark target system as discovered
      newState.galaxy[systemId].discovered = true;
      
      // Also discover connected systems for better exploration
      targetSystem.connections.forEach(connectedId => {
        if (Math.random() < 0.3) { // 30% chance to discover connected systems
          newState.galaxy[connectedId].discovered = true;
        }
      });
      
      // Clear enemies when jumping
      setEnemies([]);
      setProjectiles([]);
      setExplosions([]);
      
      console.log('Jump successful to:', systemId);
      return newState;
    });
  }, []);

  const dockAtStation = useCallback((stationId: string) => {
    console.log('Attempting to dock at station:', stationId);
    
    setGameState(prevState => {
      const currentSystem = prevState.galaxy[prevState.currentSystem];
      const station = currentSystem.stations.find(s => s.id === stationId);
      if (!station) {
        console.log('Station not found');
        return prevState;
      }
      
      const dist = distance(prevState.player.position, station.position);
      console.log('Distance to station:', dist);
      if (dist > 50) {
        console.log('Too far to dock');
        return prevState;
      }
      
      console.log('Docking successful');
      return {
        ...prevState,
        activeMode: 'station',
        selectedTarget: stationId
      };
    });
  }, []);

  const undockFromStation = useCallback(() => {
    console.log('Undocking from station');
    setGameState(prevState => ({
      ...prevState,
      activeMode: 'system',
      selectedTarget: undefined
    }));
  }, []);

  const buyItem = useCallback((itemId: string, quantity: number, price: number) => {
    setGameState(prevState => {
      if (prevState.credits < price * quantity) return prevState;
      
      const newState = { ...prevState };
      
      if (COMMODITIES[itemId]) {
        const currentCargo = newState.player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (currentCargo + quantity > newState.player.maxCargo) return prevState;
        
        const commodity = { ...COMMODITIES[itemId], quantity };
        if (addCargo(newState.player, commodity)) {
          newState.credits -= price * quantity;
        }
      }
      else if (SHIP_MODULES[itemId]) {
        // Use improved module system
        const module = SHIP_MODULES[itemId];
        if (addModuleToShip(newState.player, module)) {
          newState.credits -= price * quantity;
        } else {
          console.log('Cannot add module - slots full or incompatible');
          return prevState;
        }
      }
      
      return newState;
    });
  }, []);

  const sellItem = useCallback((itemId: string, quantity: number, price: number) => {
    setGameState(prevState => {
      const newState = { ...prevState };
      
      if (removeCargo(newState.player, itemId, quantity)) {
        newState.credits += price * quantity;
      }
      
      return newState;
    });
  }, []);

  const repairShip = useCallback(() => {
    setGameState(prevState => {
      const repairCost = (prevState.player.maxHealth - prevState.player.health) * 2;
      if (prevState.credits < repairCost) return prevState;
      
      const newState = { ...prevState };
      newState.credits -= repairCost;
      newState.player.health = newState.player.maxHealth;
      
      return newState;
    });
  }, []);

  const refuelShip = useCallback(() => {
    setGameState(prevState => {
      const fuelCost = prevState.player.maxFuel - prevState.player.fuel;
      if (prevState.credits < fuelCost) return prevState;
      
      const newState = { ...prevState };
      newState.credits -= fuelCost;
      newState.player.fuel = newState.player.maxFuel;
      
      return newState;
    });
  }, []);

  const mineAsteroid = useCallback((asteroidId: string) => {
    setGameState(prevState => {
      const newState = { ...prevState };
      const currentSystem = newState.galaxy[newState.currentSystem];
      const asteroid = currentSystem.asteroids.find(a => a.id === asteroidId);
      
      if (!asteroid) return prevState;
      
      const dist = distance(newState.player.position, asteroid.position);
      if (dist > asteroid.size + 30) return prevState;
      
      if (asteroid.resources.length > 0) {
        const resource = asteroid.resources[0];
        const minedQuantity = Math.min(resource.quantity, 1);
        
        if (addCargo(newState.player, { ...resource, quantity: minedQuantity })) {
          resource.quantity -= minedQuantity;
          if (resource.quantity <= 0) {
            asteroid.resources = asteroid.resources.filter(r => r.id !== resource.id);
          }
          
          asteroid.health -= 10;
          if (asteroid.health <= 0) {
            currentSystem.asteroids = currentSystem.asteroids.filter(a => a.id !== asteroidId);
          }
          
          // Update mining mission progress
          newState.activeMissions = newState.activeMissions.map(mission => {
            if (mission.type === 'mining' && mission.requiredResource === resource.id) {
              return { ...mission, progress: mission.progress + minedQuantity };
            }
            return mission;
          });
        }
      }
      
      return newState;
    });
  }, []);

  const acceptMission = useCallback((mission: Mission) => {
    setGameState(prevState => {
      // Limit active missions
      if (prevState.activeMissions.length >= 5) {
        console.log('Cannot accept more missions - limit reached');
        return prevState;
      }
      
      const newMission = { ...mission, status: 'active' as any };
      
      // Only add cargo for delivery missions, don't auto-complete
      if (mission.cargo && mission.type === 'delivery') {
        const currentCargo = prevState.player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        if (currentCargo + mission.cargo.quantity > prevState.player.maxCargo) {
          console.log('Cannot accept mission - not enough cargo space');
          return prevState;
        }
        
        // Add the delivery cargo to player inventory
        const newState = { ...prevState };
        if (addCargo(newState.player, mission.cargo)) {
          return {
            ...newState,
            activeMissions: [...newState.activeMissions, newMission]
          };
        } else {
          return prevState;
        }
      }
      
      return {
        ...prevState,
        activeMissions: [...prevState.activeMissions, newMission]
      };
    });
  }, []);

  const completeMission = useCallback((missionId: string) => {
    setGameState(prevState => {
      const mission = prevState.activeMissions.find(m => m.id === missionId);
      if (!mission) return prevState;
      
      const newState = { ...prevState };
      newState.credits += mission.reward;
      newState.activeMissions = newState.activeMissions.filter(m => m.id !== missionId);
      
      return newState;
    });
  }, []);

  const setActiveMode = useCallback((mode: GameState['activeMode']) => {
    console.log('Setting active mode to:', mode);
    setGameState(prevState => ({
      ...prevState,
      activeMode: mode
    }));
  }, []);

  // MEMOIZED setSelectedTarget to prevent infinite loops
  const setSelectedTarget = useCallback((targetId: string | undefined) => {
    setGameState(prevState => {
      // Only update if the target actually changed
      if (prevState.selectedTarget === targetId) {
        return prevState;
      }
      return {
        ...prevState,
        selectedTarget: targetId
      };
    });
  }, []);

  const spawnEnemy = useCallback((position: Vector2, faction: string = 'void-pirates') => {
    const enemyShip: Ship = {
      id: `enemy-${Date.now()}`,
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
      id: enemyShip.id,
      ship: enemyShip,
      ai: {
        behavior: 'aggressive',
        target: 'player',
        lastAction: Date.now()
      }
    };

    setEnemies(prev => [...prev, enemy]);
  }, []);

  const removeEnemy = useCallback((enemyId: string) => {
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
  }, []);

  const damageShip = useCallback((shipId: string, damage: number) => {
    if (shipId === 'player') {
      setGameState(prevState => {
        const newState = { ...prevState };
        applyCollisionDamage(newState.player, damage);
        return newState;
      });
    } else {
      setEnemies(prev => 
        prev.map(enemy => {
          if (enemy.id === shipId) {
            applyCollisionDamage(enemy.ship, damage);
            if (enemy.ship.health <= 0) {
              setGameState(prevState => ({
                ...prevState,
                credits: prevState.credits + 50 + Math.floor(Math.random() * 100)
              }));
              
              // Update combat mission progress
              setGameState(prevState => ({
                ...prevState,
                activeMissions: prevState.activeMissions.map(mission => {
                  if (mission.type === 'combat') {
                    return { ...mission, progress: mission.progress + 1 };
                  }
                  return mission;
                })
              }));
              
              setTimeout(() => removeEnemy(shipId), 100);
            }
          }
          return enemy;
        })
      );
    }
  }, [removeEnemy]);

  // MEMOIZED actions object to prevent re-renders
  const actions = useMemo(() => ({
    moveShip,
    fireWeapon,
    jumpToSystem,
    dockAtStation,
    undockFromStation,
    buyItem,
    sellItem,
    repairShip,
    refuelShip,
    mineAsteroid,
    acceptMission,
    completeMission,
    setActiveMode,
    setSelectedTarget,
    spawnEnemy,
    removeEnemy,
    damageShip
  }), [
    moveShip,
    fireWeapon,
    jumpToSystem,
    dockAtStation,
    undockFromStation,
    buyItem,
    sellItem,
    repairShip,
    refuelShip,
    mineAsteroid,
    acceptMission,
    completeMission,
    setActiveMode,
    setSelectedTarget,
    spawnEnemy,
    removeEnemy,
    damageShip
  ]);

  return {
    gameState,
    enemies,
    projectiles,
    explosions,
    actions
  };
}