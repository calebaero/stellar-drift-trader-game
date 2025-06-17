import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GameState, Enemy, Vector2 } from '../types/game';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { distance } from '../utils/gameUtils';

interface SystemViewProps {
  gameState: GameState;
  enemies: Enemy[];
  projectiles: any[];
  explosions: any[];
  onMoveShip: (isThrusting: boolean, targetAngle: number) => void;
  onFireWeapon: () => void;
  onSetActiveMode: (mode: GameState['activeMode']) => void;
  onDockAtStation: (stationId: string) => void;
  onMineAsteroid: (asteroidId: string) => void;
  onSpawnEnemy: (position: Vector2) => void;
  onDamageShip: (shipId: string, damage: number) => void;
  onSetSelectedTarget: (targetId: string | undefined) => void;
}

export function SystemView({
  gameState,
  enemies,
  projectiles,
  explosions,
  onMoveShip,
  onFireWeapon,
  onSetActiveMode,
  onDockAtStation,
  onMineAsteroid,
  onSpawnEnemy,
  onDamageShip,
  onSetSelectedTarget
}: SystemViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [nearbyObjects, setNearbyObjects] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePosition, setMousePosition] = useState<Vector2>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const lastFireTime = useRef(0);
  const thrustAnimationRef = useRef<number>();

  const currentSystem = gameState.galaxy[gameState.currentSystem];
  const player = gameState.player;

  // MEMOIZE camera offset to prevent infinite re-renders
  const cameraOffset = useMemo(() => ({
    x: canvasSize.width / 2,
    y: canvasSize.height / 2
  }), [canvasSize.width, canvasSize.height]);

  // Handle canvas resizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use container size but maintain reasonable minimum
        const width = Math.max(800, rect.width);
        const height = Math.max(600, rect.height);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Stable callback for interactions - FIXED to use current nearby objects
  const handleInteract = useCallback(() => {
    console.log('Interact pressed, nearby objects:', nearbyObjects);
    
    // Use CURRENT nearby objects, not stale selectedTarget
    const interactableObjects = nearbyObjects.filter(obj => 
      (obj.type === 'station' && obj.canDock) || 
      (obj.type === 'asteroid' && obj.canMine)
    );
    
    if (interactableObjects.length === 0) {
      console.log('No nearby interactable objects');
      return;
    }
    
    // Get the closest one from CURRENT nearby objects
    const closest = interactableObjects[0];
    
    if (closest.type === 'station') {
      console.log('Docking at station:', closest.object.name, 'Distance:', closest.distance);
      onDockAtStation(closest.object.id);
    } else if (closest.type === 'asteroid') {
      console.log('Mining asteroid:', closest.object.id, 'Distance:', closest.distance);
      onMineAsteroid(closest.object.id);
    }
  }, [nearbyObjects, onDockAtStation, onMineAsteroid]);

  const handleFire = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastFireTime.current < 300) return;
    
    lastFireTime.current = currentTime;
    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 100);
    
    onFireWeapon();
  }, [onFireWeapon]);

  // SIMPLIFIED keyboard controls - remove problematic event listener cycling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're in system mode and canvas is in focus area
      if (gameState.activeMode !== 'system') return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handleFire();
          break;
        case 'e':
          e.preventDefault();
          handleInteract();
          break;
        case 'm':
          e.preventDefault();
          onSetActiveMode('galaxy');
          break;
        case 'escape':
          e.preventDefault();
          setShowControls(!showControls);
          break;
      }
    };

    // Simple, stable event listener - no cycling
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFire, handleInteract, onSetActiveMode, showControls, gameState.activeMode]);

  // Mouse controls for aiming and movement
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate proper scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      setMousePosition({ x: mouseX, y: mouseY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        e.preventDefault();
        setIsMouseDown(true);
        updateMousePosition(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        e.preventDefault();
        setIsMouseDown(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMousePosition(e);
    };

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      handleFire();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('contextmenu', handleContextMenu);
      // Add window event listeners to catch mouse up outside canvas
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('contextmenu', handleContextMenu);
      }
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleFire]);

  // REFACTORED: New unified movement system according to instructions
  useEffect(() => {
    // This useEffect hook now acts as the main game loop for player movement.
    // It runs continuously, feeding the latest user input into the game state.
    const updateMovement = () => {
      // Ensure the canvas is available before proceeding.
      if (canvasRef.current) {
        // The ship is always rendered at the center of the canvas.
        const shipScreenX = canvasRef.current.width / 2;
        const shipScreenY = canvasRef.current.height / 2;

        // Calculate the target angle from the ship's position to the current mouse position.
        // Math.atan2 is used to get the correct angle in radians.
        const targetAngle = Math.atan2(mousePosition.y - shipScreenY, mousePosition.x - shipScreenX);

        // Call the single, unified onMoveShip action.
        // It now receives both the thrust status (isMouseDown) and the target angle
        // on every single frame, allowing the physics engine to handle both simultaneously.
        onMoveShip(isMouseDown, targetAngle);

        // Schedule the next call to updateMovement for the next frame.
        thrustAnimationRef.current = requestAnimationFrame(updateMovement);
      }
    };

    // Start the movement loop.
    thrustAnimationRef.current = requestAnimationFrame(updateMovement);

    // The cleanup function for this effect.
    // It cancels the animation frame loop when the component unmounts
    // or when the dependencies change, preventing memory leaks.
    return () => {
      if (thrustAnimationRef.current) {
        cancelAnimationFrame(thrustAnimationRef.current);
      }
    };
  }, [isMouseDown, mousePosition, onMoveShip]); // The hook now depends on mouse state and the move action.

  // STABLE selected target setting to prevent infinite loops
  const stableSetSelectedTarget = useCallback((targetId: string | undefined) => {
    onSetSelectedTarget(targetId);
  }, [onSetSelectedTarget]);

  // Check for nearby objects - SIMPLIFIED and stabilized
  useEffect(() => {
    // Throttle updates to prevent excessive re-renders
    const updateNearbyObjects = () => {
      const nearby: any[] = [];
      
      // Check stations
      currentSystem.stations.forEach(station => {
        const dist = distance(player.position, station.position);
        if (dist < 100) {
          nearby.push({
            type: 'station',
            object: station,
            distance: dist,
            canDock: dist < 50
          });
        }
      });
      
      // Check asteroids
      currentSystem.asteroids.forEach(asteroid => {
        const dist = distance(player.position, asteroid.position);
        if (dist < asteroid.size + 50) {
          nearby.push({
            type: 'asteroid',
            object: asteroid,
            distance: dist,
            canMine: dist < asteroid.size + 30 && asteroid.resources.length > 0
          });
        }
      });
      
      // Sort by distance to prioritize closest objects
      nearby.sort((a, b) => a.distance - b.distance);
      setNearbyObjects(nearby);
      
      // SIMPLIFIED: Only set selectedTarget for UI display purposes
      // The actual interaction logic uses nearbyObjects directly
      const interactableObjects = nearby.filter(obj => 
        (obj.type === 'station' && obj.canDock) || 
        (obj.type === 'asteroid' && obj.canMine)
      );
      
      if (interactableObjects.length > 0) {
        const closest = interactableObjects[0];
        stableSetSelectedTarget(closest.object.id);
      } else {
        stableSetSelectedTarget(undefined);
      }
      
      // Debug: Log when nearby objects change
      console.log('Nearby objects updated:', nearby.length, nearby);
    };

    // Use requestAnimationFrame to throttle updates
    const rafId = requestAnimationFrame(updateNearbyObjects);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [player.position.x, player.position.y, currentSystem.id, stableSetSelectedTarget]); // More specific dependencies

  // Canvas drawing effect - REDUCED dependencies to prevent infinite loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
      const x = ((i * 123.456) + player.position.x * 0.02) % canvas.width;
      const y = ((i * 234.567) + player.position.y * 0.02) % canvas.height;
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Save context for transformations
    ctx.save();

    // Translate camera to follow player
    ctx.translate(
      cameraOffset.x - player.position.x,
      cameraOffset.y - player.position.y
    );

    // Draw asteroids
    currentSystem.asteroids.forEach(asteroid => {
      const dist = distance(player.position, asteroid.position);
      
      // Main asteroid
      ctx.fillStyle = asteroid.resources.length > 0 ? '#CD853F' : '#8B4513';
      ctx.beginPath();
      ctx.arc(asteroid.position.x, asteroid.position.y, asteroid.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = asteroid.resources.length > 0 ? '#FFD700' : '#A0522D';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Mining range indicator if close
      if (dist < asteroid.size + 50) {
        ctx.strokeStyle = dist < asteroid.size + 30 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 255, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(asteroid.position.x, asteroid.position.y, asteroid.size + 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Resource indicator
      if (asteroid.resources.length > 0 && dist < 200) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${asteroid.resources[0].name} x${asteroid.resources[0].quantity}`,
          asteroid.position.x,
          asteroid.position.y + asteroid.size + 20
        );
      }

      // Mining prompt
      if (dist < asteroid.size + 30 && asteroid.resources.length > 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press E to Mine', asteroid.position.x, asteroid.position.y - asteroid.size - 15);
      }
    });

    // Draw stations
    currentSystem.stations.forEach(station => {
      const size = 25;
      const dist = distance(player.position, station.position);
      
      // Station body
      ctx.fillStyle = gameState.factions[station.faction]?.color || '#888';
      ctx.fillRect(
        station.position.x - size/2,
        station.position.y - size/2,
        size,
        size
      );
      
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        station.position.x - size/2,
        station.position.y - size/2,
        size,
        size
      );

      // Docking range indicator if close
      if (dist < 100) {
        ctx.strokeStyle = dist < 50 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(station.position.x, station.position.y, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Station name and distance
      if (dist < 200) {
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(station.name, station.position.x, station.position.y - 40);
        ctx.font = '12px Arial';
        ctx.fillText(`${Math.round(dist)}m`, station.position.x, station.position.y + 50);
      }

      // Docking prompt
      if (dist < 50) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press E to Dock', station.position.x, station.position.y - 60);
      }
    });

    // Draw projectiles
    projectiles.forEach(projectile => {
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(projectile.position.x, projectile.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Projectile trail
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(projectile.position.x, projectile.position.y);
      ctx.lineTo(
        projectile.position.x - projectile.velocity.x * 0.05,
        projectile.position.y - projectile.velocity.y * 0.05
      );
      ctx.stroke();
    });

    // Draw explosions
    explosions.forEach(explosion => {
      const alpha = explosion.life / 0.5;
      ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(explosion.position.x, explosion.position.y, explosion.scale * 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Draw enemies
    enemies.forEach(enemy => {
      drawShip(ctx, enemy.ship, '#FF4444');
    });

    // Draw player ship
    drawShip(ctx, player, '#44FF44');

    // Restore context and draw UI
    ctx.restore();
    drawUI(ctx, canvas);

  }, [
    // REDUCED dependencies to prevent infinite loops
    canvasSize.width,
    canvasSize.height, 
    cameraOffset,
    player.position.x,
    player.position.y,
    player.rotation,
    player.health,
    player.maxHealth,
    player.shields,
    player.maxShields,
    currentSystem.id,
    enemies.length,
    projectiles.length,
    explosions.length,
    isMouseDown
  ]);

  function drawShip(ctx: CanvasRenderingContext2D, ship: any, color: string) {
    ctx.save();
    ctx.translate(ship.position.x, ship.position.y);
    ctx.rotate(ship.rotation);

    // Ship body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Engine glow when thrusting - based on mouse down and ship being player
    const isThrusting = ship === gameState.player && isMouseDown;
    
    if (isThrusting) {
      ctx.fillStyle = '#4488FF';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-20, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();

      // Particle effects
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(68, 136, 255, ${Math.random() * 0.5 + 0.3})`;
        ctx.beginPath();
        ctx.arc(-15 - Math.random() * 10, (Math.random() - 0.5) * 8, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Health/Shield bars
    const barWidth = 35;
    const barHeight = 5;
    const barY = ship.position.y - 35;

    // Shield bar
    if (ship.maxShields > 0) {
      ctx.fillStyle = '#333';
      ctx.fillRect(ship.position.x - barWidth/2, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#4488FF';
      const shieldWidth = (ship.shields / ship.maxShields) * barWidth;
      ctx.fillRect(ship.position.x - barWidth/2, barY, shieldWidth, barHeight);
      
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(ship.position.x - barWidth/2, barY, barWidth, barHeight);
    }

    // Health bar
    ctx.fillStyle = '#333';
    ctx.fillRect(ship.position.x - barWidth/2, barY + 7, barWidth, barHeight);
    
    ctx.fillStyle = ship.health < ship.maxHealth * 0.3 ? '#FF4444' : '#44FF44';
    const healthWidth = (ship.health / ship.maxHealth) * barWidth;
    ctx.fillRect(ship.position.x - barWidth/2, barY + 7, healthWidth, barHeight);
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(ship.position.x - barWidth/2, barY + 7, barWidth, barHeight);
  }

  function drawUI(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    // Minimap
    const minimapSize = 140;
    const minimapX = canvas.width - minimapSize - 10;
    const minimapY = 10;
    const minimapScale = 0.015;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

    // Minimap title
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR', minimapX + minimapSize/2, minimapY - 5);

    // Draw minimap objects
    const centerX = minimapX + minimapSize / 2;
    const centerY = minimapY + minimapSize / 2;

    // Stations
    currentSystem.stations.forEach(station => {
      const x = centerX + (station.position.x - player.position.x) * minimapScale;
      const y = centerY + (station.position.y - player.position.y) * minimapScale;
      
      if (x >= minimapX && x <= minimapX + minimapSize && y >= minimapY && y <= minimapY + minimapSize) {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    });

    // Asteroids
    currentSystem.asteroids.forEach(asteroid => {
      const x = centerX + (asteroid.position.x - player.position.x) * minimapScale;
      const y = centerY + (asteroid.position.y - player.position.y) * minimapScale;
      
      if (x >= minimapX && x <= minimapX + minimapSize && y >= minimapY && y <= minimapY + minimapSize) {
        ctx.fillStyle = asteroid.resources.length > 0 ? '#CD853F' : '#8B4513';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Enemies
    enemies.forEach(enemy => {
      const x = centerX + (enemy.ship.position.x - player.position.x) * minimapScale;
      const y = centerY + (enemy.ship.position.y - player.position.y) * minimapScale;
      
      if (x >= minimapX && x <= minimapX + minimapSize && y >= minimapY && y <= minimapY + minimapSize) {
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player (center)
    ctx.fillStyle = '#44FF44';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    ctx.strokeStyle = '#44FF44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(player.rotation) * 8,
      centerY + Math.sin(player.rotation) * 8
    );
    ctx.stroke();
  }

  // Check if any nearby objects can be interacted with
  const canInteract = nearbyObjects.some(obj => 
    (obj.type === 'station' && obj.canDock) || 
    (obj.type === 'asteroid' && obj.canMine)
  );

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-black text-white relative">
      {/* Header - ALWAYS VISIBLE on desktop */}
      <div className="p-2 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2>{currentSystem.name}</h2>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">
              HP: {Math.round(player.health)}/{player.maxHealth}
            </Badge>
            <Badge variant="outline">
              Shield: {Math.round(player.shields)}/{player.maxShields}
            </Badge>
            <Badge variant="outline">
              Energy: {Math.round(player.energy)}/{player.maxEnergy}
            </Badge>
            <Badge variant="outline">
              Fuel: {player.fuel}/{player.maxFuel}
            </Badge>
            <Badge variant="outline">
              Credits: {gameState.credits}
            </Badge>
          </div>
        </div>
      </div>

      {/* Game Area - FIXED: Proper flex container */}
      <div className="flex-1 relative min-h-0">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full cursor-crosshair focus:outline-none block"
          style={{ touchAction: 'none' }}
          tabIndex={0}
        />

        {/* Controls Help */}
        {showControls && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-90 p-3 rounded border border-blue-500 max-w-xs z-10">
            <div className="text-blue-400 font-medium mb-2">🎮 CONTROLS</div>
            <div className="text-xs space-y-1">
              <div><span className="text-yellow-400">Mouse</span> - Aim ship</div>
              <div><span className="text-yellow-400">Hold Left-click</span> - Drift toward cursor</div>
              <div><span className="text-yellow-400">SPACE/Right-click</span> - Fire weapons</div>
              <div><span className="text-yellow-400">E</span> - Dock/Mine/Interact</div>
              <div><span className="text-yellow-400">M</span> - Galaxy map</div>
              <div><span className="text-yellow-400">ESC</span> - Hide this panel</div>
            </div>
          </div>
        )}

        {/* Interaction Prompts */}
        {nearbyObjects.length > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            {/* Show only the closest interactable object */}
            {(() => {
              const interactable = nearbyObjects.find(obj => 
                (obj.type === 'station' && obj.canDock) || 
                (obj.type === 'asteroid' && obj.canMine)
              );
              
              if (!interactable) return null;
              
              return (
                <div className="text-center mb-2">
                  {interactable.type === 'station' && (
                    <div className="bg-green-600 bg-opacity-90 px-4 py-2 rounded text-white font-bold animate-pulse">
                      🚀 Press E to DOCK at {interactable.object.name}
                    </div>
                  )}
                  {interactable.type === 'asteroid' && (
                    <div className="bg-yellow-600 bg-opacity-90 px-4 py-2 rounded text-white font-bold animate-pulse">
                      ⛏️ Press E to MINE {interactable.object.resources[0]?.name}
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Show count of multiple nearby objects */}
            {nearbyObjects.length > 1 && (
              <div className="text-center">
                <div className="bg-blue-600 bg-opacity-70 px-3 py-1 rounded text-white text-sm">
                  {nearbyObjects.length} objects nearby - E for closest
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Controls - ALWAYS VISIBLE and properly positioned */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          <Button
            onClick={() => onSetActiveMode('galaxy')}
            variant="secondary"
            size="sm"
          >
            Galaxy Map
          </Button>
          <Button
            onClick={handleInteract}
            variant="secondary" 
            size="sm"
            disabled={!canInteract}
          >
            {nearbyObjects.find(obj => obj.type === 'station' && obj.canDock) ? 'Dock' :
             nearbyObjects.find(obj => obj.type === 'asteroid' && obj.canMine) ? 'Mine' :
             'Interact'}
          </Button>
          <Button
            onClick={handleFire}
            variant={isFiring ? "destructive" : "default"}
            size="sm"
            disabled={player.energy < 10}
          >
            Fire
          </Button>
          <Button
            onClick={() => onSpawnEnemy({
              x: player.position.x + 200 + Math.random() * 200,
              y: player.position.y + 200 + Math.random() * 200
            })}
            variant="outline"
            size="sm"
          >
            Spawn Enemy
          </Button>
        </div>

        {/* Status indicators - properly positioned */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 pointer-events-none z-10">
          {isMouseDown && (
            <div className="bg-blue-600 bg-opacity-80 px-3 py-1 rounded text-xs">
              🚀 DRIFTING
            </div>
          )}
          {isFiring && (
            <div className="bg-red-600 bg-opacity-80 px-3 py-1 rounded text-xs">
              💥 FIRING
            </div>
          )}
          {player.energy < 10 && (
            <div className="bg-yellow-600 bg-opacity-80 px-3 py-1 rounded text-xs">
              ⚡ LOW ENERGY
            </div>
          )}
          {nearbyObjects.length > 0 && (
            <div className="bg-green-600 bg-opacity-80 px-3 py-1 rounded text-xs">
              Press E to interact ({nearbyObjects.length} nearby)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}