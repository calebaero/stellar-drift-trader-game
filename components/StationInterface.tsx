import React, { useState } from 'react';
import { GameState, Station, Mission, CargoItem } from '../types/game';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { COMMODITIES, SHIP_MODULES } from '../data/gameData';
import { canAddModule } from '../utils/gameUtils';

interface StationInterfaceProps {
  gameState: GameState;
  station: Station;
  onUndockFromStation: () => void;
  onBuyItem: (itemId: string, quantity: number, price: number) => void;
  onSellItem: (itemId: string, quantity: number, price: number) => void;
  onRepairShip: () => void;
  onRefuelShip: () => void;
  onAcceptMission: (mission: Mission) => void;
}

export function StationInterface({
  gameState,
  station,
  onUndockFromStation,
  onBuyItem,
  onSellItem,
  onRepairShip,
  onRefuelShip,
  onAcceptMission
}: StationInterfaceProps) {
  const [selectedTab, setSelectedTab] = useState('market');

  const player = gameState.player;
  const currentCargo = player.cargo.reduce((sum, item) => sum + item.quantity, 0);

  const handleUndock = () => {
    console.log('Undocking from station');
    onUndockFromStation();
  };

  const renderMarket = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Buy Section */}
      <Card className="p-4">
        <h3 className="mb-4">Market - Buy</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(station.market).map(([commodityId, marketData]) => {
            const commodity = COMMODITIES[commodityId];
            
            // Safety check for undefined commodity
            if (!commodity) {
              console.warn(`Commodity ${commodityId} not found in COMMODITIES data`);
              return null;
            }
            
            const canBuy = gameState.credits >= marketData.price && 
                          currentCargo < player.maxCargo &&
                          marketData.supply > 0;
            
            return (
              <div key={commodityId} className="flex justify-between items-center p-3 border rounded bg-gray-800">
                <div className="flex-1">
                  <div className="font-medium">{commodity.name}</div>
                  <div className="text-sm text-gray-400">
                    Price: {marketData.price} CR | Supply: {marketData.supply}
                  </div>
                  <div className="text-xs text-gray-500">
                    Demand: {marketData.demand > 70 ? 'High' : marketData.demand > 30 ? 'Medium' : 'Low'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!canBuy}
                    onClick={() => onBuyItem(commodityId, 1, marketData.price)}
                  >
                    Buy 1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canBuy || currentCargo + 5 > player.maxCargo}
                    onClick={() => onBuyItem(commodityId, 5, marketData.price)}
                  >
                    Buy 5
                  </Button>
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </Card>

      {/* Sell Section */}
      <Card className="p-4">
        <h3 className="mb-4">Your Cargo - Sell</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {player.cargo.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              <div className="text-lg mb-2">No cargo to sell</div>
              <div className="text-sm">Buy goods from the market to start trading!</div>
            </div>
          )}
          {player.cargo.map((item, index) => {
            const marketData = station.market[item.id];
            const sellPrice = marketData ? Math.floor(marketData.price * 0.9) : Math.floor(item.basePrice * 0.8);
            const demand = marketData?.demand || 50;
            const demandMultiplier = demand > 70 ? 1.2 : demand > 30 ? 1.0 : 0.8;
            const finalPrice = Math.floor(sellPrice * demandMultiplier);
            
            return (
              <div key={`${item.id}-${index}`} className="flex justify-between items-center p-3 border rounded bg-gray-800">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-400">
                    Quantity: {item.quantity} | Price: {finalPrice} CR each
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: {finalPrice * item.quantity} CR
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSellItem(item.id, 1, finalPrice)}
                  >
                    Sell 1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={item.quantity < 5}
                    onClick={() => onSellItem(item.id, Math.min(5, item.quantity), finalPrice)}
                  >
                    Sell 5
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onSellItem(item.id, item.quantity, finalPrice)}
                  >
                    Sell All
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const renderMissions = () => (
    <div className="space-y-4 h-full">
      {/* Mission capacity info */}
      <Card className="p-4 bg-blue-900/20 border-blue-500 flex-shrink-0">
        <div className="text-blue-400 mb-2">📋 Mission Status</div>
        <div className="text-sm">
          Active Missions: {gameState.activeMissions.length} / 5
          {gameState.activeMissions.length >= 5 && (
            <div className="text-yellow-400 mt-1">⚠️ Mission limit reached - complete some missions to accept new ones</div>
          )}
        </div>
      </Card>

      {/* FIXED: Mission list with proper scrolling */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {station.missions.length === 0 && (
          <Card className="p-6">
            <div className="text-center text-gray-400">
              <div className="text-lg mb-2">No missions available</div>
              <div className="text-sm">Check back later or try another station!</div>
            </div>
          </Card>
        )}
        {station.missions.map(mission => {
          const isAccepted = gameState.activeMissions.some(m => m.id === mission.id);
          const canAccept = gameState.activeMissions.length < 5 && !isAccepted;
          
          return (
            <Card key={mission.id} className="p-4 bg-gray-800 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg">{mission.title}</h4>
                    <Badge variant="secondary">{mission.type}</Badge>
                    {mission.status === 'active' && (
                      <Badge variant="outline" className="text-green-400">Active</Badge>
                    )}
                  </div>
                  <p className="text-gray-400 mb-3">{mission.description}</p>
                  <div className="flex gap-4 mb-3">
                    <Badge variant="outline" className="text-green-400">
                      💰 {mission.reward} CR
                    </Badge>
                    {mission.factionReward && (
                      <Badge variant="outline" className="text-blue-400">
                        👥 +{mission.factionReward} Rep
                      </Badge>
                    )}
                    {mission.timeLimit && (
                      <Badge variant="outline" className="text-yellow-400">
                        ⏰ {mission.timeLimit}h
                      </Badge>
                    )}
                  </div>
                  
                  {/* Mission requirements */}
                  {mission.cargo && (
                    <div className="text-sm text-blue-400 bg-blue-900/20 p-2 rounded mb-2">
                      📦 Deliver to: {mission.destination} - {mission.cargo.name} x{mission.cargo.quantity}
                    </div>
                  )}
                  {mission.target && (
                    <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded mb-2">
                      🎯 Target: {mission.target} ({mission.targetCount || 1} ships)
                    </div>
                  )}
                  {mission.requiredResource && (
                    <div className="text-sm text-yellow-400 bg-yellow-900/20 p-2 rounded mb-2">
                      ⛏️ Mine: {mission.requiredResource} x{mission.targetQuantity}
                    </div>
                  )}
                  {mission.destination && mission.type !== 'delivery' && (
                    <div className="text-sm text-purple-400 bg-purple-900/20 p-2 rounded mb-2">
                      🚀 Destination: {mission.destination}
                    </div>
                  )}
                  
                  {/* Progress for active missions */}
                  {isAccepted && mission.type === 'combat' && (
                    <div className="text-sm text-green-400">
                      Progress: {mission.progress || 0} / {mission.targetCount || 1} targets eliminated
                    </div>
                  )}
                  {isAccepted && mission.type === 'mining' && (
                    <div className="text-sm text-green-400">
                      Progress: {mission.progress || 0} / {mission.targetQuantity || 1} resources mined
                    </div>
                  )}
                  {isAccepted && mission.type === 'delivery' && (
                    <div className="text-sm text-green-400">
                      📦 Cargo loaded - Deliver to {mission.destination}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => onAcceptMission(mission)}
                  disabled={!canAccept}
                  variant={isAccepted ? "secondary" : "default"}
                >
                  {isAccepted ? "Accepted" : canAccept ? "Accept" : "Mission Limit"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderShipyard = () => {
    const repairCost = (player.maxHealth - player.health) * 2;
    const fuelCost = player.maxFuel - player.fuel;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Modules */}
        <Card className="p-4">
          <h3 className="mb-4">Ship Modules</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.values(SHIP_MODULES).map(module => {
              const isOwned = player.modules.some(m => m.id === module.id);
              
              // FIXED: For weapons, always allow purchase if player has money
              const canBuyModule = gameState.credits >= module.price && 
                                  (module.type === 'weapon' || canAddModule(player, module.type));
              
              // Check if this would replace an existing module
              const wouldReplace = module.type === 'weapon' && 
                                 player.modules.some(m => m.type === 'weapon' && 
                                   ['basic-laser', 'pulse-cannon', 'missile-launcher'].includes(m.id));
              
              return (
                <div key={module.id} className="p-3 border rounded bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{module.name}</div>
                      <div className="text-sm text-gray-400 mb-2">
                        Type: {module.type} | Price: {module.price} CR
                      </div>
                      <div className="text-xs text-blue-400 mb-2">
                        {Object.entries(module.stats).map(([stat, value], index) => (
                          <span key={stat}>
                            {index > 0 && ', '}
                            {stat}: +{value}
                          </span>
                        ))}
                      </div>
                      
                      {/* Compatibility info */}
                      {!canBuyModule && !isOwned && gameState.credits >= module.price && (
                        <div className="text-xs text-yellow-400">
                          {player.modules.length >= player.hull.moduleSlots 
                            ? `⚠️ Module slots full (${player.modules.length}/${player.hull.moduleSlots})`
                            : '⚠️ Cannot add this module type'
                          }
                        </div>
                      )}
                      
                      {!canBuyModule && !isOwned && gameState.credits < module.price && (
                        <div className="text-xs text-red-400">
                          💰 Insufficient credits
                        </div>
                      )}
                      
                      {wouldReplace && (
                        <div className="text-xs text-orange-400">
                          🔄 Will replace existing weapon
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={!canBuyModule || isOwned}
                      onClick={() => onBuyItem(module.id, 1, module.price)}
                    >
                      {isOwned ? 'Owned' : wouldReplace ? 'Replace' : 'Buy'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Services */}
        <Card className="p-4">
          <h3 className="mb-4">Station Services</h3>
          <div className="space-y-4">
            {/* Ship Status */}
            <div className="p-3 bg-gray-800 rounded">
              <h4 className="mb-2">Ship Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Hull Integrity:</span>
                  <span className={player.health < player.maxHealth * 0.5 ? 'text-red-400' : 'text-green-400'}>
                    {Math.round((player.health / player.maxHealth) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shield Level:</span>
                  <span className={player.shields < player.maxShields * 0.5 ? 'text-yellow-400' : 'text-blue-400'}>
                    {Math.round((player.shields / player.maxShields) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel Level:</span>
                  <span className={player.fuel < player.maxFuel * 0.3 ? 'text-yellow-400' : 'text-green-400'}>
                    {Math.round((player.fuel / player.maxFuel) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cargo Space:</span>
                  <span className={currentCargo > player.maxCargo * 0.8 ? 'text-yellow-400' : 'text-green-400'}>
                    {currentCargo}/{player.maxCargo}
                  </span>
                </div>
              </div>
            </div>

            {/* Repair Services */}
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={player.health === player.maxHealth || gameState.credits < repairCost}
                onClick={onRepairShip}
              >
                🔧 Repair Ship ({repairCost} CR)
              </Button>
              
              <Button
                className="w-full"
                disabled={player.fuel === player.maxFuel || gameState.credits < fuelCost}
                onClick={onRefuelShip}
              >
                ⛽ Refuel Ship ({fuelCost} CR)
              </Button>
            </div>

            {/* Module Status */}
            <div className="p-3 bg-gray-800 rounded">
              <h4 className="mb-2">Installed Modules ({player.modules.length}/{player.hull.moduleSlots})</h4>
              <div className="space-y-2">
                {player.modules.length === 0 && (
                  <div className="text-gray-400 text-sm">No modules installed</div>
                )}
                {player.modules.map((module, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      <div>{module.name}</div>
                      <div className="text-xs text-gray-500">{module.type}</div>
                    </div>
                    <div className="text-xs text-blue-400">
                      {Object.entries(module.stats).map(([stat, value], i) => (
                        <span key={stat}>
                          {i > 0 && ', '}
                          +{value} {stat.replace('Bonus', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header with prominent undock button */}
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl">{station.name}</h2>
            <div className="text-sm text-gray-400">
              {station.type.charAt(0).toUpperCase() + station.type.slice(1)} Station • {gameState.factions[station.faction]?.name}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-lg">💰 {gameState.credits} CR</div>
              <div className="text-sm text-gray-400">
                Cargo: {currentCargo}/{player.maxCargo}
              </div>
            </div>
          </div>
        </div>
        
        {/* Large prominent undock button */}
        <div className="w-full">
          <Button 
            onClick={handleUndock} 
            variant="outline" 
            className="w-full bg-blue-600 hover:bg-blue-700 border-blue-500 text-white text-lg py-3"
          >
            🚀 UNDOCK AND RETURN TO SPACE
          </Button>
        </div>
      </div>

      {/* FIXED: Content with proper flex layout */}
      <div className="flex-1 p-4 min-h-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 w-full mb-4 flex-shrink-0">
            <TabsTrigger value="market">🏪 Market</TabsTrigger>
            <TabsTrigger value="missions">
              📋 Missions
              {gameState.activeMissions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {gameState.activeMissions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipyard">🔧 Shipyard</TabsTrigger>
          </TabsList>

          {/* FIXED: TabsContent with proper overflow handling */}
          <TabsContent value="market" className="flex-1 mt-0 min-h-0">
            <div className="h-full overflow-y-auto">
              {renderMarket()}
            </div>
          </TabsContent>

          <TabsContent value="missions" className="flex-1 mt-0 min-h-0">
            {renderMissions()}
          </TabsContent>

          <TabsContent value="shipyard" className="flex-1 mt-0 min-h-0">
            <div className="h-full overflow-y-auto">
              {renderShipyard()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom undock button for mobile */}
      <div className="p-4 border-t border-gray-700 bg-gray-800 md:hidden flex-shrink-0">
        <Button 
          onClick={handleUndock} 
          variant="outline" 
          className="w-full bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
        >
          🚀 UNDOCK
        </Button>
      </div>
    </div>
  );
}