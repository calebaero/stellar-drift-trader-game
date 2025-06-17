import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Station } from '../types/game';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { COMMODITIES, SHIP_MODULES } from '../data/gameData';
import { canAddModule } from '../utils/gameUtils';

interface StationInterfaceProps {
  station: Station;
}

export function StationInterface({ station }: StationInterfaceProps) {
  // FIXED: Use individual primitive selectors to prevent object recreation
  const playerHealth = useGameStore(state => state.player.health);
  const playerMaxHealth = useGameStore(state => state.player.maxHealth);
  const playerShields = useGameStore(state => state.player.shields);
  const playerMaxShields = useGameStore(state => state.player.maxShields);
  const playerFuel = useGameStore(state => state.player.fuel);
  const playerMaxFuel = useGameStore(state => state.player.maxFuel);
  const playerCargo = useGameStore(state => state.player.cargo);
  const playerMaxCargo = useGameStore(state => state.player.maxCargo);
  const playerModules = useGameStore(state => state.player.modules);
  const playerHull = useGameStore(state => state.player.hull);
  const credits = useGameStore(state => state.credits);
  const activeMissionsLength = useGameStore(state => state.activeMissions.length);
  const factions = useGameStore(state => state.factions);
  
  const [selectedTab, setSelectedTab] = useState('market');

  // FIXED: Memoize computed values to prevent recreation
  const currentCargo = useMemo(() => {
    return playerCargo.reduce((sum, item) => sum + item.quantity, 0);
  }, [playerCargo]);

  const repairCost = useMemo(() => {
    return (playerMaxHealth - playerHealth) * 2;
  }, [playerMaxHealth, playerHealth]);

  const fuelCost = useMemo(() => {
    return playerMaxFuel - playerFuel;
  }, [playerMaxFuel, playerFuel]);

  // FIXED: Extract actions with stable reference
  const actions = useGameStore(state => state.actions);

  // FIXED: Stable callbacks with useCallback
  const handleUndock = useCallback(() => {
    actions.undockFromStation();
  }, [actions]);

  const handleBuyItem = useCallback((itemId: string, quantity: number, price: number) => {
    actions.buyItem(itemId, quantity, price);
  }, [actions]);

  const handleSellItem = useCallback((itemId: string, quantity: number, price: number) => {
    actions.sellItem(itemId, quantity, price);
  }, [actions]);

  const handleRepairShip = useCallback(() => {
    actions.repairShip();
  }, [actions]);

  const handleRefuelShip = useCallback(() => {
    actions.refuelShip();
  }, [actions]);

  const handleAcceptMission = useCallback((mission: any) => {
    actions.acceptMission(mission);
  }, [actions]);

  const renderMarket = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Buy Section */}
      <Card className="p-4">
        <h3 className="mb-4">Market - Buy</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(station.market).map(([commodityId, marketData]) => {
            const commodity = COMMODITIES[commodityId];
            
            if (!commodity) {
              return null;
            }
            
            const canBuy = credits >= marketData.price && 
                          currentCargo < playerMaxCargo &&
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
                    onClick={() => handleBuyItem(commodityId, 1, marketData.price)}
                  >
                    Buy 1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canBuy || currentCargo + 5 > playerMaxCargo}
                    onClick={() => handleBuyItem(commodityId, 5, marketData.price)}
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
          {playerCargo.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              <div className="text-lg mb-2">No cargo to sell</div>
              <div className="text-sm">Buy goods from the market to start trading!</div>
            </div>
          )}
          {playerCargo.map((item, index) => {
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
                    onClick={() => handleSellItem(item.id, 1, finalPrice)}
                  >
                    Sell 1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={item.quantity < 5}
                    onClick={() => handleSellItem(item.id, Math.min(5, item.quantity), finalPrice)}
                  >
                    Sell 5
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSellItem(item.id, item.quantity, finalPrice)}
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
          Active Missions: {activeMissionsLength} / 5
          {activeMissionsLength >= 5 && (
            <div className="text-yellow-400 mt-1">⚠️ Mission limit reached - complete some missions to accept new ones</div>
          )}
        </div>
      </Card>

      {/* Mission list with proper scrolling */}
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
          const canAccept = activeMissionsLength < 5;
          
          return (
            <Card key={mission.id} className="p-4 bg-gray-800 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg">{mission.title}</h4>
                    <Badge variant="secondary">{mission.type}</Badge>
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
                </div>
                <Button
                  onClick={() => handleAcceptMission(mission)}
                  disabled={!canAccept}
                  variant="default"
                >
                  {canAccept ? "Accept" : "Mission Limit"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderShipyard = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Modules */}
        <Card className="p-4">
          <h3 className="mb-4">Ship Modules</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.values(SHIP_MODULES).map(module => {
              const isOwned = playerModules.some(m => m.id === module.id);
              
              const canBuyModule = credits >= module.price && 
                                  (module.type === 'weapon' || canAddModule({ 
                                    modules: playerModules,
                                    hull: playerHull 
                                  }, module.type));
              
              const wouldReplace = module.type === 'weapon' && 
                                 playerModules.some(m => m.type === 'weapon' && 
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
                      
                      {!canBuyModule && !isOwned && credits >= module.price && (
                        <div className="text-xs text-yellow-400">
                          {playerModules.length >= playerHull.moduleSlots 
                            ? `⚠️ Module slots full (${playerModules.length}/${playerHull.moduleSlots})`
                            : '⚠️ Cannot add this module type'
                          }
                        </div>
                      )}
                      
                      {!canBuyModule && !isOwned && credits < module.price && (
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
                      onClick={() => handleBuyItem(module.id, 1, module.price)}
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
                  <span className={playerHealth < playerMaxHealth * 0.5 ? 'text-red-400' : 'text-green-400'}>
                    {Math.round((playerHealth / playerMaxHealth) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shield Level:</span>
                  <span className={playerShields < playerMaxShields * 0.5 ? 'text-yellow-400' : 'text-blue-400'}>
                    {Math.round((playerShields / playerMaxShields) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel Level:</span>
                  <span className={playerFuel < playerMaxFuel * 0.3 ? 'text-yellow-400' : 'text-green-400'}>
                    {Math.round((playerFuel / playerMaxFuel) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cargo Space:</span>
                  <span className={currentCargo > playerMaxCargo * 0.8 ? 'text-yellow-400' : 'text-green-400'}>
                    {currentCargo}/{playerMaxCargo}
                  </span>
                </div>
              </div>
            </div>

            {/* Repair Services */}
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={playerHealth === playerMaxHealth || credits < repairCost}
                onClick={handleRepairShip}
              >
                🔧 Repair Ship ({repairCost} CR)
              </Button>
              
              <Button
                className="w-full"
                disabled={playerFuel === playerMaxFuel || credits < fuelCost}
                onClick={handleRefuelShip}
              >
                ⛽ Refuel Ship ({fuelCost} CR)
              </Button>
            </div>

            {/* Module Status */}
            <div className="p-3 bg-gray-800 rounded">
              <h4 className="mb-2">Installed Modules ({playerModules.length}/{playerHull.moduleSlots})</h4>
              <div className="space-y-2">
                {playerModules.length === 0 && (
                  <div className="text-gray-400 text-sm">No modules installed</div>
                )}
                {playerModules.map((module, index) => (
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
              {station.type.charAt(0).toUpperCase() + station.type.slice(1)} Station • {factions[station.faction]?.name}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-lg">💰 {credits} CR</div>
              <div className="text-sm text-gray-400">
                Cargo: {currentCargo}/{playerMaxCargo}
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

      {/* Content with proper flex layout */}
      <div className="flex-1 p-4 min-h-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 w-full mb-4 flex-shrink-0">
            <TabsTrigger value="market">🏪 Market</TabsTrigger>
            <TabsTrigger value="missions">
              📋 Missions
              {activeMissionsLength > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeMissionsLength}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipyard">🔧 Shipyard</TabsTrigger>
          </TabsList>

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