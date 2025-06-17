import { GameState, Mission, MissionObjective, Enemy, Ship, MissionId, FactionId, SystemId, WorldObjectId } from '../types/game';
import { SHIP_HULLS, SHIP_MODULES } from '../data/gameData';

export class MissionManager {
    // This function will be expanded later to create missions procedurally.
    // For now, it will return an empty array.
    generateMissions(gameState: GameState): Mission[] {
        console.log("MissionManager: Checking for new mission opportunities...");
        const generatedMissions: Mission[] = [];
        
        // --- NEW: Generate Bounty Hunting missions ---
        const bountyMission = this.generateBountyMission(gameState);
        if (bountyMission) {
            generatedMissions.push(bountyMission);
        }
        
        // --- NEW: Generate Strategic Repair missions ---
        const repairMission = this.generateRepairMission(gameState);
        if (repairMission) {
            generatedMissions.push(repairMission);
        }
        
        // --- NEW: Generate Espionage missions ---
        const espionageMission = this.generateEspionageMission(gameState);
        if (espionageMission) {
            generatedMissions.push(espionageMission);
        }
        
        // --- NEW: Generate Smuggling missions ---
        const smugglingMission = this.generateSmugglingMission(gameState);
        if (smugglingMission) {
            generatedMissions.push(smugglingMission);
        }
        
        return generatedMissions;
    }

    // --- NEW: Generate Bounty Hunting missions ---
    private generateBountyMission(gameState: GameState): Mission | null {
        // First, check if there are any pirate-controlled systems
        const pirateSystems = Object.values(gameState.galaxy).filter(
            system => system.controllingFaction === 'void-pirates'
        );
        
        if (pirateSystems.length === 0) {
            console.log("No pirate systems found - cannot generate bounty mission");
            return null;
        }
        
        // Select a random pirate system
        const targetSystem = pirateSystems[Math.floor(Math.random() * pirateSystems.length)];
        
        // Procedurally generate an Elite NPC
        const bountyTargetNames = [
            "Dread Pirate Roberts", 
            "Captain Crimson", 
            "Xylar the Vicious",
            "Blackheart Morgan",
            "The Void Reaper",
            "Admiral Darkstar"
        ];
        
        const targetName = bountyTargetNames[Math.floor(Math.random() * bountyTargetNames.length)];
        const bountyTargetId = `bounty-target-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create enhanced ship for bounty target
        const eliteShip: Ship = {
            id: bountyTargetId,
            name: `${targetName}'s Vessel`,
            hull: SHIP_HULLS['light-freighter'], // Could be enhanced with better hulls later
            position: {
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500
            },
            velocity: { x: 0, y: 0 },
            rotation: 0,
            health: 120, // Enhanced health
            maxHealth: 120,
            shields: 60, // Enhanced shields
            maxShields: 60,
            energy: 150, // Enhanced energy
            maxEnergy: 150,
            fuel: 100,
            maxFuel: 100,
            cargo: [],
            maxCargo: 15,
            modules: [SHIP_MODULES['pulse-cannon']], // Better weapon
            faction: 'void-pirates'
        };
        
        // Create Elite Enemy with bounty target flag
        const bountyTarget: Enemy = {
            id: bountyTargetId,
            ship: eliteShip,
            ai: {
                behavior: 'aggressive',
                target: 'player',
                lastAction: Date.now()
            },
            isBountyTarget: true // Mark as elite bounty target
        };
        
        // TODO: Add the Elite NPC to the game world's enemy list
        // This would typically be done through a game state action
        console.log(`Generated bounty target: ${targetName} in system ${targetSystem.name}`);
        
        // Create the Mission Object
        const missionId = `bounty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as MissionId;
        
        const bountyMission: Mission = {
            id: missionId,
            title: `Eliminate ${targetName}`,
            type: 'BOUNTY',
            status: 'AVAILABLE',
            sourceFactionId: 'united-colonies' as FactionId,
            description: `A dangerous pirate captain known as ${targetName} has been terrorizing civilian shipping lanes. Locate and eliminate this threat for a substantial reward.`,
            successMessage: `${targetName} has been eliminated. The shipping lanes are safer thanks to your efforts.`,
            failureMessage: `Mission failed. ${targetName} remains at large.`,
            objectives: [
                {
                    id: 'travel-to-system',
                    type: 'TRAVEL',
                    description: `Travel to ${targetSystem.name} system`,
                    targetId: targetSystem.id as SystemId,
                    targetCount: 1,
                    currentProgress: 0,
                    isComplete: false
                },
                {
                    id: 'eliminate-target',
                    type: 'KILL',
                    description: `Destroy ${targetName}`,
                    targetId: bountyTargetId as any,
                    targetCount: 1,
                    currentProgress: 0,
                    isComplete: false,
                    isHidden: true // Hidden until first objective is complete
                }
            ],
            currentObjectiveIndex: 0,
            rewardCredits: 2000 + Math.floor(Math.random() * 1500), // High reward for elite target
            reputationChange: {
                'united-colonies': 15,
                'void-pirates': -25
            } as any,
            timeLimitInSeconds: 86400 // 24 hours
        };
        
        return bountyMission;
    }
    
    // --- NEW: Generate Strategic Repair missions ---
    private generateRepairMission(gameState: GameState): Mission | null {
        // Find systems with damaged WorldObjects
        const systemsWithDamagedObjects = Object.values(gameState.galaxy).filter(
            system => system.worldObjects.some(obj => obj.status === 'DAMAGED')
        );
        
        if (systemsWithDamagedObjects.length === 0) {
            console.log("No damaged world objects found - cannot generate repair mission");
            return null;
        }
        
        // Select a random system with damaged objects
        const targetSystem = systemsWithDamagedObjects[Math.floor(Math.random() * systemsWithDamagedObjects.length)];
        const damagedObjects = targetSystem.worldObjects.filter(obj => obj.status === 'DAMAGED');
        const targetObject = damagedObjects[Math.floor(Math.random() * damagedObjects.length)];
        
        // Create mission objectives - one GATHER objective for each required item, plus final INTERACT
        const objectives: MissionObjective[] = [];
        
        targetObject.requiredItems.forEach((item, index) => {
            objectives.push({
                id: `gather-${item.itemId}-${index}`,
                type: 'GATHER',
                description: `Collect ${item.required} units of ${item.itemId}`,
                targetId: item.itemId,
                targetCount: item.required,
                currentProgress: 0,
                isComplete: false
            });
        });
        
        // Final interaction objective
        objectives.push({
            id: 'repair-interaction',
            type: 'INTERACT',
            description: `Repair the ${targetObject.type.replace(/([A-Z])/g, ' $1').trim()}`,
            targetId: targetObject.id,
            targetCount: 1,
            currentProgress: 0,
            isComplete: false
        });
        
        const missionId = `repair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as MissionId;
        
        const objectTypeName = targetObject.type === 'DamagedJumpGate' ? 'Jump Gate' : 'Communication Relay';
        
        const repairMission: Mission = {
            id: missionId,
            title: `Repair ${objectTypeName}`,
            type: 'REPAIR',
            status: 'AVAILABLE',
            sourceFactionId: 'deep-space-collective' as FactionId,
            description: `A critical ${objectTypeName.toLowerCase()} in the ${targetSystem.name} system has been damaged and requires repair. Gather the necessary materials and restore functionality to this vital infrastructure.`,
            successMessage: `${objectTypeName} successfully repaired. System connectivity restored.`,
            failureMessage: `Repair mission failed. ${objectTypeName} remains non-functional.`,
            objectives,
            currentObjectiveIndex: 0,
            rewardCredits: 1500 + Math.floor(Math.random() * 1000),
            reputationChange: {
                'deep-space-collective': 20,
                'united-colonies': 10
            } as any,
            timeLimitInSeconds: 172800 // 48 hours
        };
        
        console.log(`Generated repair mission for ${objectTypeName} in ${targetSystem.name}`);
        return repairMission;
    }
    
    // --- NEW: Generate Espionage missions ---
    private generateEspionageMission(gameState: GameState): Mission | null {
        // Look for military or faction-controlled stations for espionage targets
        const militarySystems = Object.values(gameState.galaxy).filter(
            system => system.stations.some(station => 
                station.type === 'military' || station.faction !== 'independent'
            )
        );
        
        if (militarySystems.length === 0) {
            console.log("No suitable targets for espionage mission");
            return null;
        }
        
        const targetSystem = militarySystems[Math.floor(Math.random() * militarySystems.length)];
        const targetStation = targetSystem.stations.find(s => 
            s.type === 'military' || s.faction !== 'independent'
        )!;
        
        const missionId = `espionage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as MissionId;
        
        const espionageMission: Mission = {
            id: missionId,
            title: `Intelligence Gathering`,
            type: 'ESPIONAGE',
            status: 'AVAILABLE',
            sourceFactionId: 'deep-space-collective' as FactionId,
            description: `Infiltrate ${targetStation.name} and gather intelligence on their operations. Maintain a low profile and avoid detection by security forces. Use stealth technology if available.`,
            successMessage: `Intelligence successfully gathered from ${targetStation.name}. The data will prove invaluable.`,
            failureMessage: `Mission compromised. Intelligence gathering failed.`,
            objectives: [
                {
                    id: 'travel-to-target',
                    type: 'TRAVEL',
                    description: `Travel to ${targetSystem.name} system`,
                    targetId: targetSystem.id as SystemId,
                    targetCount: 1,
                    currentProgress: 0,
                    isComplete: false
                },
                {
                    id: 'gather-intelligence',
                    type: 'SCAN',
                    description: `Scan ${targetStation.name} for 30 seconds while remaining undetected`,
                    targetId: targetStation.id as any,
                    targetCount: 30, // 30 seconds
                    currentProgress: 0,
                    isComplete: false
                }
            ],
            currentObjectiveIndex: 0,
            rewardCredits: 3000 + Math.floor(Math.random() * 2000),
            reputationChange: {
                'deep-space-collective': 25,
                [targetStation.faction]: -15
            } as any,
            timeLimitInSeconds: 129600 // 36 hours
        };
        
        console.log(`Generated espionage mission for ${targetStation.name} in ${targetSystem.name}`);
        return espionageMission;
    }
    
    // --- NEW: Generate Smuggling missions ---
    private generateSmugglingMission(gameState: GameState): Mission | null {
        // Find systems with different faction control for smuggling routes
        const systems = Object.values(gameState.galaxy);
        const sourceSystem = systems.find(s => s.controllingFaction === 'void-pirates');
        const destSystem = systems.find(s => 
            s.controllingFaction !== 'void-pirates' && 
            s.controllingFaction !== sourceSystem?.controllingFaction
        );
        
        if (!sourceSystem || !destSystem) {
            console.log("No suitable smuggling route found");
            return null;
        }
        
        const sourceStation = sourceSystem.stations[0];
        const destStation = destSystem.stations[0];
        
        if (!sourceStation || !destStation) {
            console.log("No stations available for smuggling route");
            return null;
        }
        
        // Select contraband cargo
        const contrabandTypes = ['narcotics', 'stolen-data', 'black-market-tech', 'classified-intel'];
        const cargoType = contrabandTypes[Math.floor(Math.random() * contrabandTypes.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        const missionId = `smuggling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as MissionId;
        
        const smugglingMission: Mission = {
            id: missionId,
            title: `Contraband Transport`,
            type: 'SMUGGLING',
            status: 'AVAILABLE',
            sourceFactionId: 'void-pirates' as FactionId,
            description: `Transport illegal cargo from ${sourceStation.name} to ${destStation.name}. Avoid security scans at all costs - being caught will result in severe penalties. Stealth equipment highly recommended.`,
            successMessage: `Contraband successfully delivered. The client is pleased with your discretion.`,
            failureMessage: `Smuggling operation failed. Cargo confiscated by authorities.`,
            objectives: [
                {
                    id: 'pickup-contraband',
                    type: 'INTERACT',
                    description: `Pick up contraband from ${sourceStation.name}`,
                    targetId: sourceStation.id as any,
                    targetCount: 1,
                    currentProgress: 0,
                    isComplete: false
                },
                {
                    id: 'deliver-contraband',
                    type: 'INTERACT',
                    description: `Deliver contraband to ${destStation.name} (AVOID DETECTION)`,
                    targetId: destStation.id as any,
                    targetCount: 1,
                    currentProgress: 0,
                    isComplete: false
                }
            ],
            currentObjectiveIndex: 0,
            rewardCredits: 5000 + Math.floor(Math.random() * 3000),
            rewardItems: {
                itemId: cargoType,
                quantity: quantity
            },
            reputationChange: {
                'void-pirates': 30,
                'united-colonies': -20
            } as any,
            timeLimitInSeconds: 172800 // 48 hours
        };
        
        console.log(`Generated smuggling mission from ${sourceSystem.name} to ${destSystem.name}`);
        return smugglingMission;
    }

    // This function is the core of the mission system's real-time logic.
    updateMissionProgress(gameState: GameState): GameState {
        const updatedMissions = gameState.activeMissions.map(mission => {
            if (mission.status !== 'ACTIVE') return mission;

            const currentObjective = mission.objectives[mission.currentObjectiveIndex];
            if (!currentObjective || currentObjective.isComplete) return mission;

            let objectiveCompleted = false;

            // --- Implement Objective Completion Logic Here ---
            switch (currentObjective.type) {
                case 'TRAVEL':
                    if (gameState.currentSystem === currentObjective.targetId) {
                        currentObjective.currentProgress = 1;
                        objectiveCompleted = true;
                    }
                    break;
                case 'GATHER':
                    const itemInCargo = gameState.player.cargo.find(item => item.id === currentObjective.targetId);
                    const progress = itemInCargo ? itemInCargo.quantity : 0;
                    currentObjective.currentProgress = progress;
                    if (progress >= currentObjective.targetCount) {
                        objectiveCompleted = true;
                    }
                    break;
                // --- NEW: KILL objective for bounty missions ---
                case 'KILL':
                    // This will be updated when enemies are actually killed
                    // The progress is tracked externally in useGameState when enemies die
                    if (currentObjective.currentProgress >= currentObjective.targetCount) {
                        objectiveCompleted = true;
                    }
                    break;
                // --- NEW: INTERACT objective for repair missions ---
                case 'INTERACT':
                    // Check if player is near the target WorldObject and has required materials
                    const currentSystem = gameState.galaxy[gameState.currentSystem];
                    const targetObject = currentSystem?.worldObjects?.find(obj => obj.id === currentObjective.targetId);
                    
                    if (targetObject && targetObject.status === 'DAMAGED') {
                        // Check if player is close enough to interact (within 50 units)
                        const playerPos = gameState.player.position;
                        const objectPos = targetObject.position;
                        const distance = Math.sqrt(
                            Math.pow(playerPos.x - objectPos.x, 2) + 
                            Math.pow(playerPos.y - objectPos.y, 2)
                        );
                        
                        if (distance <= 50) {
                            // Check if player has all required materials
                            const hasAllMaterials = targetObject.requiredItems.every(item => {
                                const playerItem = gameState.player.cargo.find(cargo => cargo.id === item.itemId);
                                return playerItem && playerItem.quantity >= item.required;
                            });
                            
                            if (hasAllMaterials) {
                                objectiveCompleted = true;
                                currentObjective.currentProgress = 1;
                                
                                // TODO: This should trigger the actual repair process:
                                // 1. Remove materials from player cargo
                                // 2. Update object status to 'OPERATIONAL'
                                // 3. Add jump connections if it's a jump gate
                                console.log(`Player can complete repair of ${targetObject.type} - interaction ready`);
                            }
                        }
                    }
                    break;
                // TODO: Add cases for 'SCAN', 'ESCORT', 'FOLLOW' as those mechanics are built.
            }

            if (objectiveCompleted) {
                currentObjective.isComplete = true;
                
                // Unhide the next objective if it was hidden
                if (mission.currentObjectiveIndex < mission.objectives.length - 1) {
                    const nextObjective = mission.objectives[mission.currentObjectiveIndex + 1];
                    if (nextObjective.isHidden) {
                        nextObjective.isHidden = false;
                        console.log(`Revealed hidden objective: ${nextObjective.description}`);
                    }
                }
                
                // If there's a next objective, advance to it.
                if (mission.currentObjectiveIndex < mission.objectives.length - 1) {
                    mission.currentObjectiveIndex++;
                } else {
                    // This is the final objective, so the mission is ready to be turned in.
                    console.log(`Mission ${mission.id} all objectives complete!`);
                    // TODO: Auto-complete mission or require manual turn-in
                }
            }
            return mission;
        });

        return { ...gameState, activeMissions: updatedMissions };
    }
}