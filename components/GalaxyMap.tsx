import React from 'react';
import { GameState, StarSystem } from '../types/game';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { distance } from '../utils/gameUtils';

interface GalaxyMapProps {
  gameState: GameState;
  onJumpToSystem: (systemId: string) => void;
  onSetActiveMode: (mode: GameState['activeMode']) => void;
}

export function GalaxyMap({ gameState, onJumpToSystem, onSetActiveMode }: GalaxyMapProps) {
  const currentSystem = gameState.galaxy[gameState.currentSystem];
  const viewSize = 600;
  const scale = 0.5;

  const handleSystemClick = (systemId: string) => {
    console.log('System clicked:', systemId);
    const targetSystem = gameState.galaxy[systemId];
    
    // FIXED: Check if system is connected, not discovered
    const isConnected = currentSystem.connections.includes(systemId);
    const hasEnoughFuel = gameState.player.fuel >= 10;
    
    console.log('Connected:', isConnected, 'Fuel:', hasEnoughFuel);
    
    if (isConnected && hasEnoughFuel) {
      console.log('Jumping to system:', targetSystem.name);
      onJumpToSystem(systemId);
      onSetActiveMode('system');
    } else if (!isConnected) {
      console.log('System not connected to current system');
    } else {
      console.log('Not enough fuel for jump');
    }
  };

  const handleJumpButtonClick = (systemId: string) => {
    console.log('Jump button clicked for:', systemId);
    handleSystemClick(systemId);
  };

  // FIXED: Show connected systems instead of only discovered ones
  const getVisibleSystems = () => {
    const visible = new Set<string>();
    
    // Always show current system
    visible.add(gameState.currentSystem);
    
    // Show all discovered systems
    Object.values(gameState.galaxy).forEach(system => {
      if (system.discovered) {
        visible.add(system.id);
        // Also show connected systems to discovered ones
        system.connections.forEach(connId => {
          visible.add(connId);
        });
      }
    });
    
    return Array.from(visible).map(id => gameState.galaxy[id]);
  };

  const visibleSystems = getVisibleSystems();

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2>Galaxy Map - {visibleSystems.length} Systems Visible</h2>
          <div className="flex gap-4">
            <Badge variant="outline">
              Credits: {gameState.credits}
            </Badge>
            <Badge variant="outline">
              Fuel: {gameState.player.fuel}/{gameState.player.maxFuel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Map Area */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            width="100%"
            height="100%"
            viewBox={`${-viewSize/2} ${-viewSize/2} ${viewSize} ${viewSize}`}
            className="bg-black"
          >
            {/* Stars background */}
            {Array.from({ length: 50 }).map((_, i) => (
              <circle
                key={i}
                cx={(Math.random() * viewSize - viewSize/2)}
                cy={(Math.random() * viewSize - viewSize/2)}
                r="0.5"
                fill="white"
                opacity={Math.random() * 0.5 + 0.3}
              />
            ))}

            {/* Connections - show all connections between visible systems */}
            {visibleSystems.map(system => 
              system.connections.map(connectionId => {
                const connectedSystem = gameState.galaxy[connectionId];
                if (!connectedSystem || !visibleSystems.find(s => s.id === connectionId)) return null;
                
                const isCurrentConnection = system.id === gameState.currentSystem || connectionId === gameState.currentSystem;
                
                return (
                  <line
                    key={`${system.id}-${connectionId}`}
                    x1={system.position.x * scale}
                    y1={system.position.y * scale}
                    x2={connectedSystem.position.x * scale}
                    y2={connectedSystem.position.y * scale}
                    stroke={isCurrentConnection ? "#4a90e2" : "#333"}
                    strokeWidth={isCurrentConnection ? "2" : "1"}
                    opacity={isCurrentConnection ? 0.8 : 0.5}
                  />
                );
              })
            )}

            {/* Systems */}
            {visibleSystems.map(system => {
              const isCurrent = system.id === gameState.currentSystem;
              const isConnected = currentSystem.connections.includes(system.id);
              const canJump = isConnected && gameState.player.fuel >= 10;
              const isDiscovered = system.discovered;

              return (
                <g key={system.id}>
                  {/* System circle */}
                  <circle
                    cx={system.position.x * scale}
                    cy={system.position.y * scale}
                    r={isCurrent ? 10 : 7}
                    fill={isCurrent ? '#FFD700' : (isDiscovered ? system.star.color : '#666')}
                    stroke={isCurrent ? '#FFF' : (isConnected ? '#4a90e2' : '#555')}
                    strokeWidth={isCurrent ? 3 : (isConnected ? 2 : 1)}
                    className={canJump ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                    onClick={() => handleSystemClick(system.id)}
                    opacity={isDiscovered ? 1 : 0.6}
                  />
                  
                  {/* System name */}
                  <text
                    x={system.position.x * scale}
                    y={system.position.y * scale - 15}
                    fill={isDiscovered ? "white" : "#888"}
                    fontSize="9"
                    fontWeight={isCurrent ? "bold" : "normal"}
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {isDiscovered ? system.name : "Unknown System"}
                  </text>
                  
                  {/* Connection indicator */}
                  {isConnected && !isCurrent && (
                    <circle
                      cx={system.position.x * scale + 10}
                      cy={system.position.y * scale - 10}
                      r="3"
                      fill={canJump ? "#4a90e2" : "#888"}
                      opacity="0.8"
                    />
                  )}
                  
                  {/* Faction indicator for discovered systems */}
                  {system.controllingFaction && isDiscovered && (
                    <circle
                      cx={system.position.x * scale + 8}
                      cy={system.position.y * scale - 8}
                      r="2"
                      fill={gameState.factions[system.controllingFaction]?.color || '#888'}
                    />
                  )}
                </g>
              );
            })}

            {/* Player position indicator */}
            <circle
              cx={currentSystem.position.x * scale}
              cy={currentSystem.position.y * scale}
              r="6"
              fill="none"
              stroke="#00FF00"
              strokeWidth="2"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                values="6;12;6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>

        {/* System Info Panel */}
        <div className="w-80 p-4 border-l border-gray-700 bg-gray-800">
          <Card className="p-4 bg-gray-700 border-gray-600">
            <h3 className="mb-2">Current System: {currentSystem.name}</h3>
            <div className="space-y-2 mb-4">
              <div>Star Type: {currentSystem.star.type}</div>
              <div>Stations: {currentSystem.stations.length}</div>
              <div>Asteroids: {currentSystem.asteroids.length}</div>
              <div>Faction: {gameState.factions[currentSystem.controllingFaction]?.name}</div>
            </div>

            <div className="space-y-2">
              <h4>Available Jumps ({currentSystem.connections.length}):</h4>
              {currentSystem.connections.length === 0 && (
                <div className="text-gray-400 text-sm">No connected systems</div>
              )}
              {currentSystem.connections.map(connectionId => {
                const system = gameState.galaxy[connectionId];
                const dist = distance(currentSystem.position, system.position);
                const canJump = gameState.player.fuel >= 10;
                
                return (
                  <Button
                    key={connectionId}
                    variant={canJump ? "default" : "secondary"}
                    className="w-full justify-start"
                    disabled={!canJump}
                    onClick={() => handleJumpButtonClick(connectionId)}
                  >
                    <div className="flex justify-between w-full">
                      <span>
                        {system.discovered ? system.name : "Unknown System"}
                      </span>
                      <span className="text-xs opacity-70">
                        {Math.round(dist)} units • 10 fuel
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Galaxy Info */}
          <Card className="p-4 bg-gray-700 border-gray-600 mt-4">
            <h4 className="mb-2">Galaxy Status</h4>
            <div className="space-y-1 text-sm">
              <div>Systems Discovered: {Object.values(gameState.galaxy).filter(s => s.discovered).length} / {Object.keys(gameState.galaxy).length}</div>
              <div>Systems Visible: {visibleSystems.length}</div>
              <div>Active Missions: {gameState.activeMissions.length}</div>
            </div>
          </Card>

          <div className="mt-4">
            <Button
              onClick={() => onSetActiveMode('system')}
              variant="outline"
              className="w-full"
            >
              Return to System View
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}