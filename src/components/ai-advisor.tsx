"use client";

import { useState } from "react";
import { personalizedGameTips } from "@/ai/flows/game-advisor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb } from "lucide-react";

interface AIAdvisorProps {
  playerBoard: (number | null)[];
  calledNumbers: number[];
  disabled: boolean;
  opponentName: string;
}

export function AIAdvisor({ playerBoard, calledNumbers, disabled, opponentName }: AIAdvisorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getHint = async () => {
    setIsLoading(true);
    try {
      const validPlayerBoard = playerBoard.filter(n => n !== null) as number[];
      if(validPlayerBoard.length !== 25) {
        throw new Error("Player board is not fully set up.");
      }

      const response = await personalizedGameTips({
        playerBoard: validPlayerBoard,
        calledNumbers: calledNumbers,
        opponentName: opponentName,
      });
      toast({
        title: "💡 AI Game Advisor",
        description: response.tip,
        duration: 8000,
      });
    } catch (error) {
      console.error("Error getting AI tip:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not get a tip from the AI advisor.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={getHint} disabled={isLoading || disabled}>
      <Lightbulb className={`mr-2 h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
      {isLoading ? "Thinking..." : "Get AI Tip"}
    </Button>
  );
}
