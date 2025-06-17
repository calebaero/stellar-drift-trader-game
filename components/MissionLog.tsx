import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Mission, MissionId } from '../types/game';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Progress } from './ui/progress';
import { CheckCircle, Circle, Clock, MapPin, Target, Package, Users, Zap } from 'lucide-react';

export function MissionLog() {
  // Get game state and actions
  const activeMissions = useGameStore(state => state.activeMissions);
  const factions = useGameStore(state => state.factions);
  const { actions } = useGameStore();
  
  // Local state for selected mission
  const [selectedMission, setSelectedMission] = useState<Mission | null>(
    activeMissions.length > 0 ? activeMissions[0] : null
  );

  // Helper function to get mission type icon
  const getMissionTypeIcon = (type: Mission['type']) => {
    switch (type) {
      case 'BOUNTY': return <Target className="w-4 h-4" />;
      case 'DELIVERY': return <Package className="w-4 h-4" />;
      case 'REPAIR': return <Zap className="w-4 h-4" />;
      case 'ESPIONAGE': return <Users className="w-4 h-4" />;
      case 'SMUGGLING': return <Package className="w-4 h-4" />;
      case 'EXPEDITION': return <MapPin className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  // Helper function to get mission type color
  const getMissionTypeColor = (type: Mission['type']) => {
    switch (type) {
      case 'BOUNTY': return 'bg-red-600';
      case 'DELIVERY': return 'bg-blue-600';
      case 'REPAIR': return 'bg-yellow-600';
      case 'ESPIONAGE': return 'bg-purple-600';
      case 'SMUGGLING': return 'bg-orange-600';
      case 'EXPEDITION': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  // Helper function to get objective type icon
  const getObjectiveIcon = (type: string, isComplete: boolean) => {
    if (isComplete) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  // Helper function to calculate objective progress percentage
  const getObjectiveProgress = (currentProgress: number, targetCount: number) => {
    if (targetCount === 0) return 100;
    return Math.min(100, (currentProgress / targetCount) * 100);
  };

  // Handle mission abandonment
  const handleAbandonMission = (missionId: MissionId) => {
    actions.abandonMission(missionId);
    // If the abandoned mission was selected, select the first remaining mission
    if (selectedMission?.id === missionId) {
      const remainingMissions = activeMissions.filter(m => m.id !== missionId);
      setSelectedMission(remainingMissions.length > 0 ? remainingMissions[0] : null);
    }
  };

  // Format time remaining for missions with time limits
  const formatTimeRemaining = (mission: Mission) => {
    if (!mission.timeLimitInSeconds || !mission.expirationTimestamp) return null;
    
    const now = Date.now();
    const remaining = mission.expirationTimestamp - now;
    
    if (remaining <= 0) return "EXPIRED";
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-medium">Mission Log</h1>
            <Badge variant="outline">
              {activeMissions.length} Active
            </Badge>
          </div>
          <Button 
            onClick={() => actions.setActiveMode('system')}
            variant="outline"
          >
            Return to Game
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Mission List */}
        <div className="w-1/3 border-r border-border bg-card/50">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-muted-foreground">Active Missions</h3>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-2 space-y-2">
              {activeMissions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active missions</p>
                  <p className="text-sm">Visit stations to find new missions</p>
                </div>
              ) : (
                activeMissions.map((mission) => (
                  <Card 
                    key={mission.id}
                    className={`cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedMission?.id === mission.id ? 'ring-2 ring-primary bg-accent' : ''
                    }`}
                    onClick={() => setSelectedMission(mission)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded ${getMissionTypeColor(mission.type)}`}>
                          {getMissionTypeIcon(mission.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm line-clamp-2">
                            {mission.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {mission.type}
                            </Badge>
                            {formatTimeRemaining(mission) && (
                              <Badge 
                                variant={formatTimeRemaining(mission) === "EXPIRED" ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                {formatTimeRemaining(mission)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mission Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{mission.currentObjectiveIndex + 1}/{mission.objectives.length}</span>
                        </div>
                        <Progress 
                          value={(mission.currentObjectiveIndex / mission.objectives.length) * 100} 
                          className="h-1 mt-1"
                        />
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Mission Details */}
        <div className="flex-1 flex flex-col">
          {selectedMission ? (
            <>
              {/* Mission Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${getMissionTypeColor(selectedMission.type)}`}>
                        {getMissionTypeIcon(selectedMission.type)}
                      </div>
                      <div>
                        <h2 className="text-xl font-medium">{selectedMission.title}</h2>
                        <p className="text-muted-foreground">
                          {factions[selectedMission.sourceFactionId]?.name || selectedMission.sourceFactionId}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Reward:</span>
                        <span className="text-yellow-500 font-medium">{selectedMission.rewardCredits.toLocaleString()} CR</span>
                      </div>
                      {formatTimeRemaining(selectedMission) && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={formatTimeRemaining(selectedMission) === "EXPIRED" ? "text-red-500" : "text-muted-foreground"}>
                            {formatTimeRemaining(selectedMission)}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline">{selectedMission.status}</Badge>
                    </div>
                  </div>

                  {/* Abandon Mission Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Abandon Mission
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Abandon Mission?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to abandon "{selectedMission.title}"? 
                          You will lose reputation with {factions[selectedMission.sourceFactionId]?.name || selectedMission.sourceFactionId}
                          {selectedMission.reputationChange[selectedMission.sourceFactionId] && 
                            ` (-${Math.abs(selectedMission.reputationChange[selectedMission.sourceFactionId]!)} reputation)`
                          }.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleAbandonMission(selectedMission.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Abandon Mission
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Mission Content */}
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Mission Description */}
                  <div>
                    <h3 className="font-medium mb-2">Mission Briefing</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedMission.description}
                    </p>
                  </div>

                  {/* Mission Objectives */}
                  <div>
                    <h3 className="font-medium mb-3">Objectives</h3>
                    <div className="space-y-3">
                      {selectedMission.objectives.map((objective, index) => {
                        const isCurrent = index === selectedMission.currentObjectiveIndex;
                        const isVisible = !objective.isHidden && (index <= selectedMission.currentObjectiveIndex);
                        
                        if (!isVisible) {
                          return (
                            <div key={objective.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <Circle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">??? Hidden Objective ???</span>
                            </div>
                          );
                        }

                        const progress = getObjectiveProgress(objective.currentProgress, objective.targetCount);
                        
                        return (
                          <div 
                            key={objective.id} 
                            className={`p-3 rounded-lg border transition-all ${
                              isCurrent 
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/20' 
                                : objective.isComplete 
                                  ? 'border-green-500/30 bg-green-500/10'
                                  : 'border-border bg-card/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {getObjectiveIcon(objective.type, objective.isComplete)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                                    {objective.description}
                                  </h4>
                                  {isCurrent && (
                                    <Badge variant="outline" className="ml-2">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                
                                {objective.targetCount > 1 && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                      <span>Progress</span>
                                      <span>{objective.currentProgress}/{objective.targetCount}</span>
                                    </div>
                                    <Progress value={progress} className="h-1" />
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {objective.type}
                                  </Badge>
                                  {objective.isComplete && (
                                    <Badge variant="outline" className="text-xs text-green-500">
                                      Complete
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reward Information */}
                  <div>
                    <h3 className="font-medium mb-3">Rewards</h3>
                    <div className="p-3 rounded-lg bg-card border">
                      <div className="flex items-center justify-between">
                        <span>Credits</span>
                        <span className="text-yellow-500 font-medium">
                          {selectedMission.rewardCredits.toLocaleString()} CR
                        </span>
                      </div>
                      
                      {selectedMission.rewardItems && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span>Items</span>
                          <span>{selectedMission.rewardItems.itemId} x{selectedMission.rewardItems.quantity}</span>
                        </div>
                      )}
                      
                      {Object.keys(selectedMission.reputationChange).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">Reputation Changes:</span>
                          <div className="mt-1 space-y-1">
                            {Object.entries(selectedMission.reputationChange).map(([factionId, change]) => (
                              <div key={factionId} className="flex items-center justify-between text-sm">
                                <span>{factions[factionId]?.name || factionId}</span>
                                <span className={change! > 0 ? 'text-green-500' : 'text-red-500'}>
                                  {change! > 0 ? '+' : ''}{change}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Mission Selected</h3>
                <p>Select a mission from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}