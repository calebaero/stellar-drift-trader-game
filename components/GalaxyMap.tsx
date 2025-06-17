import React, { useMemo, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { distance } from '../utils/gameUtils';

export function GalaxyMap() {
  // FIXED: Use individual stable selectors
  const currentSystemId = useGameStore(state => state.currentSystem);
  const galaxy = useGameStore(state => state.galaxy);
  const playerFuel = useGameStore(state => state.player.fuel);
  const playerMaxFuel = useGameStore(state => state.player.maxFuel);
  const credits = useGameStore(state => state.credits);
  const factions = useGameStore(state => state.factions);
  const activeMissionsLength = useGameStore(state => state.activeMissions.length);
  
  // --- NEW: Mission tracking selectors ---
  const trackedMissionId = useGameStore(state => state.trackedMissionId);
  const activeMissions = useGameStore(state => state.activeMissions);
  
  const { actions } = useGameStore();
  
  // FIXED: Memoize computed values
  const currentSystem = useMemo(() => galaxy[currentSystemId], [galaxy, currentSystemId]);
  
  const galaxyStats = useMemo(() => ({
    totalSystems: Object.keys(galaxy).length,
    discoveredCount: Object.values(galaxy).filter(s => s.discovered).length
  }), [galaxy]);
  
  // --- NEW: Get tracked mission and check for system targets ---
  const trackedMission = useMemo(() => {
    if (!trackedMissionId) return null;
    return activeMissions.find(m => m.id === trackedMissionId) || null;
  }, [trackedMissionId, activeMissions]);
  
  const currentObjective = useMemo(() => {
    if (!trackedMission) return null;
    const objective = trackedMission.objectives[trackedMission.currentObjectiveIndex];
    return objective && !objective.isHidden ? objective : null;
  }, [trackedMission]);
  
  const targetSystemId = useMemo(() => {
    if (!currentObjective || currentObjective.type !== 'TRAVEL') return null;
    return currentObjective.targetId;
  }, [currentObjective]);
  
  const visibleSystems = useMemo(() => {
    const visible = new Set<string>();
    
    // Always show current system
    visible.add(currentSystemId);
    
    // Show all discovered systems
    Object.values(galaxy).forEach(system => {
      if (system.discovered) {
        visible.add(system.id);
        // Also show connected systems to discovered ones
        system.connections.forEach(connId => {
          visible.add(connId);
        });
      }
    });
    
    return Array.from(visible).map(id => galaxy[id]);
  }, [galaxy, currentSystemId]);

  const viewSize = 600;
  const scale = 0.5;

  // FIXED: Stable callbacks
  const handleSystemClick = useCallback((systemId: string) => {
    const targetSystem = galaxy[systemId];
    const isConnected = currentSystem.connections.includes(systemId);
    const hasEnoughFuel = playerFuel >= 10;
    
    if (isConnected && hasEnoughFuel) {
      actions.jumpToSystem(systemId);
      actions.setActiveMode('system');
    }
  }, [galaxy, currentSystem.connections, playerFuel, actions.jumpToSystem, actions.setActiveMode]);

  const handleJumpButtonClick = useCallback((systemId: string) => {
    handleSystemClick(systemId);
  }, [handleSystemClick]);

  const handleReturnToSystem = useCallback(() => {
    actions.setActiveMode('system');
  }, [actions.setActiveMode]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2>Galaxy Map - {visibleSystems.length} Systems Visible</h2>
          <div className="flex gap-4">
            <Badge variant="outline">
              Credits: {credits}
            </Badge>
            <Badge variant="outline">
              Fuel: {playerFuel}/{playerMaxFuel}
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
                const connectedSystem = galaxy[connectionId];
                if (!connectedSystem || !visibleSystems.find(s => s.id === connectionId)) return null;
                
                const isCurrentConnection = system.id === currentSystemId || connectionId === currentSystemId;
                
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
              const isCurrent = system.id === currentSystemId;
              const isConnected = currentSystem.connections.includes(system.id);
              const canJump = isConnected && playerFuel >= 10;
              const isDiscovered = system.discovered;
              const isMissionTarget = targetSystemId === system.id; // --- NEW: Check if system is mission target ---

              return (
                <g key={system.id}>
                  {/* --- NEW: Mission objective pulsing ring --- */}
                  {isMissionTarget && (
                    <circle
                      cx={system.position.x * scale}
                      cy={system.position.y * scale}
                      r="15"
                      fill="none"
                      stroke="#00FFFF"
                      strokeWidth="2"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="r"
                        values="15;20;15"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.4;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  
                  {/* System circle */}
                  <circle
                    cx={system.position.x * scale}
                    cy={system.position.y * scale}
                    r={isCurrent ? 10 : 7}
                    fill={isCurrent ? '#FFD700' : (isDiscovered ? system.star.color : '#666')}
                    stroke={isCurrent ? '#FFF' : (isMissionTarget ? '#00FFFF' : (isConnected ? '#4a90e2' : '#555'))}
                    strokeWidth={isCurrent ? 3 : (isMissionTarget ? 3 : (isConnected ? 2 : 1))}
                    className={canJump ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                    onClick={() => handleSystemClick(system.id)}
                    opacity={isDiscovered ? 1 : 0.6}
                  />
                  
                  {/* --- NEW: Mission objective icon --- */}
                  {isMissionTarget && (
                    <text
                      x={system.position.x * scale}
                      y={system.position.y * scale + 3}
                      fill="#00FFFF"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      🎯
                    </text>
                  )}
                  
                  {/* System name */}
                  <text
                    x={system.position.x * scale}
                    y={system.position.y * scale - 15}
                    fill={isDiscovered ? (isMissionTarget ? "#00FFFF" : "white") : "#888"}
                    fontSize="9"
                    fontWeight={isCurrent || isMissionTarget ? "bold" : "normal"}
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
                      fill={factions[system.controllingFaction]?.color || '#888'}
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
              <div>Faction: {factions[currentSystem.controllingFaction]?.name}</div>
            </div>

            <div className="space-y-2">
              <h4>Available Jumps ({currentSystem.connections.length}):</h4>
              {currentSystem.connections.length === 0 && (
                <div className="text-gray-400 text-sm">No connected systems</div>
              )}
              {currentSystem.connections.map(connectionId => {
                const system = galaxy[connectionId];
                const dist = distance(currentSystem.position, system.position);
                const canJump = playerFuel >= 10;
                
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
              <div>Systems Discovered: {galaxyStats.discoveredCount} / {galaxyStats.totalSystems}</div>
              <div>Systems Visible: {visibleSystems.length}</div>
              <div>Active Missions: {activeMissionsLength}</div>
            </div>
          </Card>

          <div className="mt-4">
            <Button
              onClick={handleReturnToSystem}
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