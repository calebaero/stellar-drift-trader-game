import React from 'react';
import { useGameState } from './hooks/useGameState';
import { GalaxyMap } from './components/GalaxyMap';
import { SystemView } from './components/SystemView';
import { StationInterface } from './components/StationInterface';

export default function App() {
  const { gameState, enemies, projectiles, explosions, actions } = useGameState();

  const handleNewGame = () => {
    // Force a complete app restart
    window.location.reload();
  };

  const renderCurrentView = () => {
    switch (gameState.activeMode) {
      case 'galaxy':
        return (
          <GalaxyMap
            gameState={gameState}
            onJumpToSystem={actions.jumpToSystem}
            onSetActiveMode={actions.setActiveMode}
          />
        );

      case 'system':
        return (
          <SystemView
            gameState={gameState}
            enemies={enemies}
            projectiles={projectiles}
            explosions={explosions}
            onMoveShip={actions.moveShip}
            onFireWeapon={actions.fireWeapon}
            onSetActiveMode={actions.setActiveMode}
            onDockAtStation={actions.dockAtStation}
            onMineAsteroid={actions.mineAsteroid}
            onSpawnEnemy={actions.spawnEnemy}
            onDamageShip={actions.damageShip}
            onSetSelectedTarget={actions.setSelectedTarget}
          />
        );

      case 'station':
        const selectedStation = gameState.selectedTarget 
          ? gameState.galaxy[gameState.currentSystem].stations.find(
              s => s.id === gameState.selectedTarget
            )
          : null;

        if (!selectedStation) {
          actions.setActiveMode('system');
          return null;
        }

        return (
          <StationInterface
            gameState={gameState}
            station={selectedStation}
            onUndockFromStation={actions.undockFromStation}
            onBuyItem={actions.buyItem}
            onSellItem={actions.sellItem}
            onRepairShip={actions.repairShip}
            onRefuelShip={actions.refuelShip}
            onAcceptMission={actions.acceptMission}
          />
        );

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
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => actions.setActiveMode('system')}
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

      {/* Active Missions Indicator */}
      {gameState.activeMissions.length > 0 && gameState.activeMode === 'system' && (
        <div className="absolute top-20 left-4 bg-black bg-opacity-70 p-3 rounded border border-green-500">
          <div className="text-green-400 font-medium mb-1">
            📋 Active Missions ({gameState.activeMissions.length})
          </div>
          {gameState.activeMissions.slice(0, 3).map(mission => (
            <div key={mission.id} className="text-xs text-gray-300">
              • {mission.title}
            </div>
          ))}
          {gameState.activeMissions.length > 3 && (
            <div className="text-xs text-gray-400">
              ... and {gameState.activeMissions.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState.player.health <= 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center space-y-6 bg-gray-900 p-8 rounded-lg border border-red-500 max-w-md">
            <h2 className="text-4xl text-red-400">💀 Ship Destroyed!</h2>
            <p className="text-gray-300 text-lg">Your journey ends here, captain.</p>
            <div className="space-y-2 text-left">
              <div>💰 Credits Earned: <span className="text-yellow-400">{gameState.credits}</span></div>
              <div>🌟 Systems Visited: <span className="text-blue-400">{Object.values(gameState.galaxy).filter(s => s.discovered).length}</span></div>
              <div>🎯 Missions Active: <span className="text-green-400">{gameState.activeMissions.length}</span></div>
              <div>⚔️ Time Survived: <span className="text-purple-400">{Math.round(gameState.gameTime / 60)}m</span></div>
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

      {/* Low Health Warning */}
      {gameState.player.health > 0 && gameState.player.health < gameState.player.maxHealth * 0.2 && gameState.activeMode === 'system' && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-red-600 bg-opacity-90 px-6 py-3 rounded-lg animate-pulse border border-red-400">
          <div className="text-white font-bold text-center">
            ⚠️ CRITICAL HULL DAMAGE ⚠️
            <div className="text-sm">Find a station to repair immediately!</div>
          </div>
        </div>
      )}

      {/* Debug Info - Moved to bottom left to not cover minimap */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-2 rounded text-xs max-w-xs z-10">
          <div className="text-yellow-400 font-medium mb-1">DEBUG INFO</div>
          <div>Mode: {gameState.activeMode}</div>
          <div>System: {gameState.currentSystem}</div>
          <div>Pos: {Math.round(gameState.player.position.x)}, {Math.round(gameState.player.position.y)}</div>
          <div>Enemies: {enemies.length}</div>
          <div>Projectiles: {projectiles.length}</div>
          <div>HP: {Math.round(gameState.player.health)}/{gameState.player.maxHealth}</div>
          <div>Energy: {Math.round(gameState.player.energy)}/{gameState.player.maxEnergy}</div>
          <div>Target: {gameState.selectedTarget || 'none'}</div>
        </div>
      )}
    </div>
  );
}