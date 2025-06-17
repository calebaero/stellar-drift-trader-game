import React, { useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from './store/useGameStore';
import { gameLoop } from './utils/GameLoop';
import { GalaxyMap } from './components/GalaxyMap';
import { SystemView } from './components/SystemView';
import { StationInterface } from './components/StationInterface';
import { MissionLog } from './components/MissionLog'; // --- NEW: Import MissionLog ---

export default function MainApp() {
  // FIXED: Use only primitive selectors to prevent object recreation
  const activeMode = useGameStore(state => state.activeMode);
  const playerHealth = useGameStore(state => state.player.health);
  const playerMaxHealth = useGameStore(state => state.player.maxHealth);
  const credits = useGameStore(state => state.credits);
  const activeMissionsLength = useGameStore(state => state.activeMissions.length);
  const gameTime = useGameStore(state => state.gameTime);
  const currentSystemId = useGameStore(state => state.currentSystem);
  const selectedTarget = useGameStore(state => state.selectedTarget);
  
  // FIXED: Separate selectors for complex data to prevent recreation
  const galaxy = useGameStore(state => state.galaxy);
  const activeMissions = useGameStore(state => state.activeMissions);
  
  // FIXED: Memoize complex calculations to prevent recreation
  const galaxyStats = useMemo(() => {
    const discoveredCount = Object.values(galaxy).filter(s => s.discovered).length;
    return { discoveredCount };
  }, [galaxy]);
  
  const firstThreeMissions = useMemo(() => {
    return activeMissions.slice(0, 3);
  }, [activeMissions]);
  
  // FIXED: Extract actions with stable reference
  const actions = useGameStore(state => state.actions);

  // --- NEW: Global keyboard controls for mission log ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault();
          if (activeMode === 'missionLog') {
            actions.setActiveMode('system');
          } else {
            actions.setActiveMode('missionLog');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMode, actions]);

  // Start game loop on mount - FIXED: No dependencies
  useEffect(() => {
    console.log('🎮 Starting Stellar Drift with Zustand + Game Loop architecture');
    gameLoop.start();
    
    return () => {
      console.log('🛑 Stopping game loop');
      gameLoop.stop();
    };
  }, []);

  // FIXED: Stable callback with useCallback
  const handleNewGame = useCallback(() => {
    gameLoop.stop();
    actions.initializeGame();
    setTimeout(() => {
      gameLoop.start();
    }, 100);
  }, [actions]);

  // FIXED: Stable callback for start journey
  const handleStartJourney = useCallback(() => {
    actions.setActiveMode('system');
  }, [actions]);

  // FIXED: Station validation moved to useEffect to prevent render-time side effects
  const selectedStation = useMemo(() => {
    if (!selectedTarget || activeMode !== 'station') return null;
    
    const currentSystem = galaxy[currentSystemId];
    if (!currentSystem) return null;
    
    return currentSystem.stations.find(s => s.id === selectedTarget) || null;
  }, [selectedTarget, activeMode, galaxy, currentSystemId]);

  // FIXED: Handle invalid station state in useEffect, not during render
  useEffect(() => {
    if (activeMode === 'station' && selectedTarget && !selectedStation) {
      console.warn('Selected station not found, returning to system view');
      actions.setActiveMode('system');
    }
  }, [activeMode, selectedTarget, selectedStation, actions]);

  const renderCurrentView = () => {
    switch (activeMode) {
      case 'galaxy':
        return <GalaxyMap />;

      case 'system':
        return <SystemView />;

      case 'station':
        // FIXED: Don't call actions during render, just return null if invalid
        if (!selectedStation) {
          return null; // useEffect will handle the mode change
        }
        return <StationInterface station={selectedStation} />;

      // --- NEW: Mission Log view ---
      case 'missionLog':
        return <MissionLog />;

      default:
        return (
          <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl mb-2">⭐ Stellar Drift</h1>
                <h2 className="text-2xl text-blue-400">Rogue Trader</h2>
                <p className="text-gray-400 max-w-md">
                  Navigate the galaxy, trade goods, complete missions, and build your fortune 
                  in this space exploration adventure.
                </p>
                <div className="text-sm text-green-400 bg-green-900/20 p-2 rounded">
                  ⚡ Powered by Zustand + Independent Game Loop (FIXED v3)
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={handleStartJourney}
                  className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🚀 Start Your Journey
                </button>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <div><strong>Game Controls:</strong></div>
                  <div>• <span className="text-blue-400">Mouse</span> - Aim ship</div>
                  <div>• <span className="text-blue-400">Left-click</span> - Move toward crosshair</div>
                  <div>• <span className="text-blue-400">SPACE/Right-click</span> - Fire weapons</div>
                  <div>• <span className="text-blue-400">E</span> - Dock at stations, mine asteroids</div>
                  <div>• <span className="text-blue-400">M</span> - Open galaxy map</div>
                  <div>• <span className="text-blue-400">J</span> - Open mission log</div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="size-full flex flex-col bg-black text-white overflow-hidden">
      {/* Game UI */}
      {renderCurrentView()}

      {/* Active Missions Indicator - FIXED: Only render when needed and not in mission log */}
      {activeMissionsLength > 0 && activeMode === 'system' && (
        <div className="absolute top-20 left-4 bg-black bg-opacity-70 p-3 rounded border border-green-500">
          <div className="text-green-400 font-medium mb-1 flex items-center gap-2">
            📋 Active Missions ({activeMissionsLength})
            <span className="text-xs text-gray-400">(Press J for details)</span>
          </div>
          {firstThreeMissions.map(mission => (
            <div key={mission.id} className="text-xs text-gray-300">
              • {mission.title}
            </div>
          ))}
          {activeMissionsLength > 3 && (
            <div className="text-xs text-gray-400">
              ... and {activeMissionsLength - 3} more
            </div>
          )}
        </div>
      )}

      {/* Game Over Screen - FIXED: Use stable comparisons */}
      {playerHealth <= 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center space-y-6 bg-gray-900 p-8 rounded-lg border border-red-500 max-w-md">
            <h2 className="text-4xl text-red-400">💀 Ship Destroyed!</h2>
            <p className="text-gray-300 text-lg">Your journey ends here, captain.</p>
            <div className="space-y-2 text-left">
              <div>💰 Credits Earned: <span className="text-yellow-400">{credits}</span></div>
              <div>🌟 Systems Visited: <span className="text-blue-400">{galaxyStats.discoveredCount}</span></div>
              <div>🎯 Missions Active: <span className="text-green-400">{activeMissionsLength}</span></div>
              <div>⚔️ Time Survived: <span className="text-purple-400">{Math.round(gameTime / 60)}m</span></div>
            </div>
            <button
              onClick={handleNewGame}
              className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors w-full"
            >
              🚀 Start New Journey
            </button>
          </div>
        </div>
      )}

      {/* Low Health Warning - FIXED: Use stable comparison */}
      {playerHealth > 0 && playerHealth < playerMaxHealth * 0.2 && activeMode === 'system' && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-red-600 bg-opacity-90 px-6 py-3 rounded-lg animate-pulse border border-red-400">
          <div className="text-white font-bold text-center">
            ⚠️ CRITICAL HULL DAMAGE ⚠️
            <div className="text-sm">Find a station to repair immediately!</div>
          </div>
        </div>
      )}

      {/* Performance Indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-2 rounded text-xs max-w-xs z-10">
          <div className="text-green-400 font-medium mb-1">⚡ ZUSTAND + GAME LOOP (FIXED v3)</div>
          <div>Mode: {activeMode}</div>
          <div>System: {currentSystemId}</div>
          <div>HP: {Math.round(playerHealth)}/{playerMaxHealth}</div>
          <div>Credits: {credits}</div>
          <div>Target: {selectedTarget || 'none'}</div>
          <div>Systems: {galaxyStats.discoveredCount}</div>
        </div>
      )}
    </div>
  );
}