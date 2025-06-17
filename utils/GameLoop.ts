import { useGameStore } from '../store/useGameStore';
import { SpaceshipPhysicsEngine } from './SpaceshipPhysicsEngine';
import { updateShipPhysics, distance, checkMissionProgress, applyCollisionDamage } from './gameUtils';

// FIXED: Add unique ID generator to prevent duplicate keys in GameLoop
let gameLoopIdCounter = 0;
function generateUniqueGameId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++gameLoopIdCounter}`;
}

/**
 * Independent game loop that runs outside React's render cycle
 * FIXED v2: Drastically reduced React state update frequency to prevent infinite loops
 */
class GameLoop {
  private lastTime = 0;
  private animationFrameId = 0;
  private physicsEngine = new SpaceshipPhysicsEngine();
  private isRunning = false;
  
  // FIXED v2: Much less frequent state updates to prevent React overwhelm
  private updateQueue: any = {};
  private lastStateUpdate = 0;
  private updateInterval = 1000 / 10; // Only 10fps for React state updates
  
  // Internal physics state (runs at 60fps without React)
  private internalPlayerState: any = null;
  private internalEnemies: any[] = [];
  private internalProjectiles: any[] = [];
  private internalExplosions: any[] = [];

  start() {
    if (this.isRunning) return;
    
    console.log('🚀 Starting game loop (v2 - ultra low React updates)...');
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastStateUpdate = performance.now();
    
    // Initialize internal state from store
    const state = useGameStore.getState();
    this.internalPlayerState = { ...state.player };
    this.internalEnemies = [...state.enemies];
    this.internalProjectiles = [...state.projectiles];
    this.internalExplosions = [...state.explosions];
    
    this.loop();
  }

  stop() {
    console.log('⏹️ Stopping game loop...');
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;
    
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30);
    this.lastTime = currentTime;

    try {
      // Run physics at 60fps on internal state
      this.updateInternalPhysics(deltaTime);
      
      // FIXED v2: Only sync to React state every 100ms (10fps)
      if (currentTime - this.lastStateUpdate >= this.updateInterval) {
        this.syncToReactState();
        this.lastStateUpdate = currentTime;
      }
      
    } catch (error) {
      console.error('Game loop error:', error);
    }
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private updateInternalPhysics(deltaTime: number) {
    const state = useGameStore.getState();
    
    // Update player physics on internal state
    this.updatePlayerPhysicsInternal(state, deltaTime);
    
    // Update other systems on internal state
    this.updatePlayerRegenerationInternal(deltaTime);
    this.updateEnemiesInternal(state, deltaTime);
    this.updateProjectilesInternal(deltaTime);
    this.updateExplosionsInternal(deltaTime);
    this.updateCollisionsInternal();
  }

  private updatePlayerPhysicsInternal(state: any, deltaTime: number) {
    const { playerInput } = state;
    
    // Convert to physics engine format
    const currentShipState = {
      x: this.internalPlayerState.position.x,
      y: this.internalPlayerState.position.y,
      vx: this.internalPlayerState.velocity.x,
      vy: this.internalPlayerState.velocity.y,
      rotation: this.internalPlayerState.rotation
    };

    // Update physics
    const updatedShipState = this.physicsEngine.updateShipState(
      currentShipState, 
      playerInput, 
      deltaTime
    );

    // Update internal player state
    this.internalPlayerState.position = { x: updatedShipState.x, y: updatedShipState.y };
    this.internalPlayerState.velocity = { x: updatedShipState.vx, y: updatedShipState.vy };
    this.internalPlayerState.rotation = updatedShipState.rotation;
  }

  private updatePlayerRegenerationInternal(deltaTime: number) {
    // Regenerate shields
    if (this.internalPlayerState.shields < this.internalPlayerState.maxShields) {
      this.internalPlayerState.shields = Math.min(
        this.internalPlayerState.maxShields,
        this.internalPlayerState.shields + deltaTime * 10
      );
    }
    
    // Regenerate energy
    if (this.internalPlayerState.energy < this.internalPlayerState.maxEnergy) {
      this.internalPlayerState.energy = Math.min(
        this.internalPlayerState.maxEnergy,
        this.internalPlayerState.energy + deltaTime * 20
      );
    }
  }

  private updateEnemiesInternal(state: any, deltaTime: number) {
    this.internalEnemies = this.internalEnemies.map(enemy => {
      const dx = this.internalPlayerState.position.x - enemy.ship.position.x;
      const dy = this.internalPlayerState.position.y - enemy.ship.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const newEnemy = { ...enemy, ship: { ...enemy.ship } };
      
      // Simple AI
      if (dist > 50 && dist < 800) {
        const thrust = {
          x: (dx / dist) * 60,
          y: (dy / dist) * 60
        };
        updateShipPhysics(newEnemy.ship, thrust, deltaTime);
        newEnemy.ship.rotation = Math.atan2(dy, dx);
        
        // Occasional firing
        if (dist < 300 && newEnemy.ship.energy > 10 && Math.random() < 0.01) {
          newEnemy.ship.energy -= 10;
          // FIXED: Use unique ID generator for projectiles
          this.internalProjectiles.push({
            id: generateUniqueGameId('enemy-proj'),
            position: { ...newEnemy.ship.position },
            velocity: {
              x: Math.cos(newEnemy.ship.rotation) * 250,
              y: Math.sin(newEnemy.ship.rotation) * 250
            },
            life: 1.0,
            damage: 15,
            owner: 'enemy'
          });
        }
      }
      
      // Regenerate energy
      if (newEnemy.ship.energy < newEnemy.ship.maxEnergy) {
        newEnemy.ship.energy = Math.min(
          newEnemy.ship.maxEnergy, 
          newEnemy.ship.energy + deltaTime * 15
        );
      }
      
      return newEnemy;
    });
  }

  private updateProjectilesInternal(deltaTime: number) {
    this.internalProjectiles = this.internalProjectiles
      .map(projectile => ({
        ...projectile,
        position: {
          x: projectile.position.x + projectile.velocity.x * deltaTime,
          y: projectile.position.y + projectile.velocity.y * deltaTime
        },
        life: projectile.life - deltaTime
      }))
      .filter(projectile => projectile.life > 0);
  }

  private updateExplosionsInternal(deltaTime: number) {
    this.internalExplosions = this.internalExplosions
      .map(explosion => ({
        ...explosion,
        life: explosion.life - deltaTime,
        scale: explosion.scale + deltaTime * 2
      }))
      .filter(explosion => explosion.life > 0);
  }

  private updateCollisionsInternal() {
    // Simplified collision detection on internal state
    this.internalProjectiles.forEach(projectile => {
      if (projectile.owner === 'player') {
        // Check enemy collisions
        this.internalEnemies.forEach(enemy => {
          const dist = distance(projectile.position, enemy.ship.position);
          if (dist < 20) {
            projectile.life = 0;
            enemy.ship.health -= projectile.damage;
            
            // FIXED: Use unique ID generator for explosions
            this.internalExplosions.push({
              id: generateUniqueGameId('explosion'),
              position: { ...enemy.ship.position },
              life: 0.5,
              scale: 1
            });
          }
        });
      } else if (projectile.owner === 'enemy') {
        // Check player collision
        const dist = distance(projectile.position, this.internalPlayerState.position);
        if (dist < 20) {
          projectile.life = 0;
          this.internalPlayerState.health -= projectile.damage;
          
          // FIXED: Use unique ID generator for explosions
          this.internalExplosions.push({
            id: generateUniqueGameId('explosion'),
            position: { ...this.internalPlayerState.position },
            life: 0.5,
            scale: 1
          });
        }
      }
    });
    
    // Remove dead projectiles
    this.internalProjectiles = this.internalProjectiles.filter(p => p.life > 0);
    
    // Remove dead enemies
    this.internalEnemies = this.internalEnemies.filter(e => e.ship.health > 0);
  }

  // FIXED v2: Only sync to React state at 10fps to prevent overwhelm
  private syncToReactState() {
    const updates: any = {};
    
    // Only sync if there are meaningful changes
    const currentState = useGameStore.getState();
    
    // Check if player state changed meaningfully
    const playerChanged = 
      Math.abs(currentState.player.position.x - this.internalPlayerState.position.x) > 1 ||
      Math.abs(currentState.player.position.y - this.internalPlayerState.position.y) > 1 ||
      Math.abs(currentState.player.rotation - this.internalPlayerState.rotation) > 0.1 ||
      Math.abs(currentState.player.health - this.internalPlayerState.health) > 1 ||
      Math.abs(currentState.player.shields - this.internalPlayerState.shields) > 1 ||
      Math.abs(currentState.player.energy - this.internalPlayerState.energy) > 1;
    
    if (playerChanged) {
      updates.player = { ...this.internalPlayerState };
    }
    
    // Always sync dynamic entities (but less frequently)
    if (this.internalEnemies.length !== currentState.enemies.length) {
      updates.enemies = [...this.internalEnemies];
    }
    
    if (this.internalProjectiles.length !== currentState.projectiles.length || 
        this.internalProjectiles.length > 0) {
      updates.projectiles = [...this.internalProjectiles];
    }
    
    if (this.internalExplosions.length !== currentState.explosions.length || 
        this.internalExplosions.length > 0) {
      updates.explosions = [...this.internalExplosions];
    }
    
    // Update game time less frequently
    updates.gameTime = currentState.gameTime + 0.1; // 100ms increment
    
    // Only call setState if there are actual updates
    if (Object.keys(updates).length > 0) {
      useGameStore.setState(updates);
    }
  }

  // FIXED: Public methods with unique ID generation
  public addProjectile(projectile: any) {
    // Ensure unique ID if not provided
    if (!projectile.id) {
      projectile.id = generateUniqueGameId('proj');
    }
    this.internalProjectiles.push(projectile);
  }
  
  public addEnemy(enemy: any) {
    // Ensure unique ID if not provided
    if (!enemy.id) {
      enemy.id = generateUniqueGameId('enemy');
    }
    if (!enemy.ship.id) {
      enemy.ship.id = generateUniqueGameId('enemy-ship');
    }
    this.internalEnemies.push(enemy);
  }
}

// Export singleton instance
export const gameLoop = new GameLoop();