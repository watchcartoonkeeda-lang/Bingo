// src/ai/flows/game-advisor.ts
'use server';

/**
 * @fileOverview Provides personalized game tips and strategies based on the current board configuration.
 *
 * - personalizedGameTips - A function that generates game tips.
 * - GameAdvisorInput - The input type for the personalizedGameTips function.
 * - GameAdvisorOutput - The return type for the personalizedGameTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameAdvisorInputSchema = z.object({
  playerBoard: z.array(z.number()).length(25).describe('The player\'s bingo board layout, as an array of 25 numbers.'),
  calledNumbers: z.array(z.number()).describe('The list of numbers that have been called so far in the game.'),
  opponentName: z.string().describe('The name of the opponent.'),
});
export type GameAdvisorInput = z.infer<typeof GameAdvisorInputSchema>;

const GameAdvisorOutputSchema = z.object({
  tip: z.string().describe('A personalized game tip or strategy based on the current board configuration.'),
});
export type GameAdvisorOutput = z.infer<typeof GameAdvisorOutputSchema>;

export async function personalizedGameTips(input: GameAdvisorInput): Promise<GameAdvisorOutput> {
  return gameAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gameAdvisorPrompt',
  input: {schema: GameAdvisorInputSchema},
  output: {schema: GameAdvisorOutputSchema},
  prompt: `You are an expert Bingo strategist, providing personalized tips to players.

  Based on the current state of the game, analyze the player's board and the called numbers to provide a single, actionable tip.
  Consider potential winning patterns (horizontal, vertical, diagonal) and the numbers that are still available to be called.
  Tailor the tip to help the player make informed decisions and improve their chances of winning.

  Player's Board: {{{playerBoard}}}
  Called Numbers: {{{calledNumbers}}}
  Opponent's Name: {{{opponentName}}}

  Provide a concise and helpful tip:
  `, 
});

const gameAdvisorFlow = ai.defineFlow(
  {
    name: 'gameAdvisorFlow',
    inputSchema: GameAdvisorInputSchema,
    outputSchema: GameAdvisorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
