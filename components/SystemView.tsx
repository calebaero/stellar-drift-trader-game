import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { distance } from '../utils/gameUtils';

export function SystemView() {
  // FIXED: Use individual stable selectors instead of object selectors
  const activeMode = useGameStore(state => state.activeMode);
  const currentSystemId = useGameStore(state => state.currentSystem);
  const player = useGameStore(state => state.player);
  const credits = useGameStore(state => state.credits);
  const enemies = useGameStore(state => state.enemies);
  const projectiles = useGameStore(state => state.projectiles);
  const explosions = useGameStore(state => state.explosions);
  
  // FIXED: Memoized complex selectors
  const currentSystem = useGameStore(state => state.galaxy[state.currentSystem]);
  const factions = useGameStore(state => state.factions);
  
  const { actions } = useGameStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [nearbyObjects, setNearbyObjects] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const lastFireTime = useRef(0);
  const thrustAnimationRef = useRef<number>();

  // MEMOIZE camera offset to prevent infinite re-renders
  const cameraOffset = useMemo(() => ({
    x: canvasSize.width / 2,
    y: canvasSize.height / 2
  }), [canvasSize.width, canvasSize.height]);

  // Handle canvas resizing - FIXED: Stable callback
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
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

  // FIXED: Stable callback for interactions
  const handleInteract = useCallback(() => {
    const interactableObjects = nearbyObjects.filter(obj => 
      (obj.type === 'station' && obj.canDock) || 
      (obj.type === 'asteroid' && obj.canMine)
    );
    
    if (interactableObjects.length === 0) {
      return;
    }
    
    const closest = interactableObjects[0];
    
    if (closest.type === 'station') {
      actions.dockAtStation(closest.object.id);
    } else if (closest.type === 'asteroid') {
      actions.mineAsteroid(closest.object.id);
    }
  }, [nearbyObjects, actions.dockAtStation, actions.mineAsteroid]);

  const handleFire = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - lastFireTime.current < 300) return;
    
    lastFireTime.current = currentTime;
    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 100);
    
    actions.fireWeapon();
  }, [actions.fireWeapon]);

  // Keyboard controls - FIXED: Stable dependencies
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMode !== 'system') return;
      
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
          actions.setActiveMode('galaxy');
          break;
        case 'escape':
          e.preventDefault();
          setShowControls(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFire, handleInteract, actions.setActiveMode, activeMode]);

  // Mouse controls - FIXED: Stable dependencies
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      setMousePosition({ x: mouseX, y: mouseY });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        setIsMouseDown(true);
        updateMousePosition(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
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

  // FIXED: Stable movement system
  useEffect(() => {
    const updateMovement = () => {
      if (canvasRef.current) {
        const shipScreenX = canvasRef.current.width / 2;
        const shipScreenY = canvasRef.current.height / 2;

        const targetAngle = Math.atan2(mousePosition.y - shipScreenY, mousePosition.x - shipScreenX);

        actions.setPlayerInput(isMouseDown, targetAngle);

        thrustAnimationRef.current = requestAnimationFrame(updateMovement);
      }
    };

    thrustAnimationRef.current = requestAnimationFrame(updateMovement);

    return () => {
      if (thrustAnimationRef.current) {
        cancelAnimationFrame(thrustAnimationRef.current);
      }
    };
  }, [isMouseDown, mousePosition.x, mousePosition.y, actions.setPlayerInput]);

  // FIXED: Throttled nearby objects check
  useEffect(() => {
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
      
      nearby.sort((a, b) => a.distance - b.distance);
      setNearbyObjects(nearby);
      
      const interactableObjects = nearby.filter(obj => 
        (obj.type === 'station' && obj.canDock) || 
        (obj.type === 'asteroid' && obj.canMine)
      );
      
      if (interactableObjects.length > 0) {
        const closest = interactableObjects[0];
        actions.setSelectedTarget(closest.object.id);
      } else {
        actions.setSelectedTarget(undefined);
      }
    };

    // FIXED: Throttle updates to prevent excessive re-renders
    const intervalId = setInterval(updateNearbyObjects, 100); // 10fps updates
    
    return () => {
      clearInterval(intervalId);
    };
  }, [player.position.x, player.position.y, currentSystemId, actions.setSelectedTarget]);

  // FIXED: Stable canvas drawing with reduced dependencies
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    ctx.save();
    ctx.translate(
      cameraOffset.x - player.position.x,
      cameraOffset.y - player.position.y
    );

    // Draw asteroids
    currentSystem.asteroids.forEach(asteroid => {
      const dist = distance(player.position, asteroid.position);
      
      ctx.fillStyle = asteroid.resources.length > 0 ? '#CD853F' : '#8B4513';
      ctx.beginPath();
      ctx.arc(asteroid.position.x, asteroid.position.y, asteroid.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = asteroid.resources.length > 0 ? '#FFD700' : '#A0522D';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      if (dist < asteroid.size + 50) {
        ctx.strokeStyle = dist < asteroid.size + 30 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 255, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(asteroid.position.x, asteroid.position.y, asteroid.size + 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
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
      
      ctx.fillStyle = factions[station.faction]?.color || '#888';
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

      if (dist < 100) {
        ctx.strokeStyle = dist < 50 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(station.position.x, station.position.y, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (dist < 200) {
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(station.name, station.position.x, station.position.y - 40);
        ctx.font = '12px Arial';
        ctx.fillText(`${Math.round(dist)}m`, station.position.x, station.position.y + 50);
      }

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

    ctx.restore();
    drawUI(ctx, canvas);

  }, [
    // FIXED: Minimal dependencies to prevent infinite loops
    canvasSize.width,
    canvasSize.height, 
    cameraOffset.x,
    cameraOffset.y,
    player.position.x,
    player.position.y,
    player.rotation,
    player.health,
    player.maxHealth,
    player.shields,
    player.maxShields,
    isMouseDown
  ]);

  function drawShip(ctx: CanvasRenderingContext2D, ship: any, color: string) {
    ctx.save();
    ctx.translate(ship.position.x, ship.position.y);
    ctx.rotate(ship.rotation);

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

    const isThrusting = ship === player && isMouseDown;
    
    if (isThrusting) {
      ctx.fillStyle = '#4488FF';
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-20, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();

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

    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR', minimapX + minimapSize/2, minimapY - 5);

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

  const canInteract = nearbyObjects.some(obj => 
    (obj.type === 'station' && obj.canDock) || 
    (obj.type === 'asteroid' && obj.canMine)
  );

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-black text-white relative">
      {/* Header */}
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
              Credits: {credits}
            </Badge>
          </div>
        </div>
      </div>

      {/* Game Area */}
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
            <div className="text-blue-400 font-medium mb-2">🎮 CONTROLS (FIXED)</div>
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
            
            {nearbyObjects.length > 1 && (
              <div className="text-center">
                <div className="bg-blue-600 bg-opacity-70 px-3 py-1 rounded text-white text-sm">
                  {nearbyObjects.length} objects nearby - E for closest
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          <Button
            onClick={() => actions.setActiveMode('galaxy')}
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
            onClick={() => actions.spawnEnemy({
              x: player.position.x + 200 + Math.random() * 200,
              y: player.position.y + 200 + Math.random() * 200
            })}
            variant="outline"
            size="sm"
          >
            Spawn Enemy
          </Button>
        </div>

        {/* Status indicators */}
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