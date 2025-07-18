
// src/ai/flows/bot-player.ts
'use server';

/**
 * @fileOverview An AI agent that plays Bingo.
 * - playBotTurn - A function that allows the bot to take its turn.
 * - BotPlayerInput - The input type for the playBotTurn function.
 * - BotPlayerOutput - The return type for the playBotTurn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { WINNING_COMBINATIONS } from '@/lib/game-logic';

const BotPlayerInputSchema = z.object({
  playerBoard: z.array(z.number()).length(25).describe("The bot's bingo board layout."),
  calledNumbers: z.array(z.number()).describe('The list of numbers that have been called so far.'),
  allNumbers: z.array(z.number()).length(25).describe('All possible numbers (1-25).'),
});
export type BotPlayerInput = z.infer<typeof BotPlayerInputSchema>;

const BotPlayerOutputSchema = z.object({
  chosenNumber: z.number().describe('The number the bot has chosen to call.'),
  shouldCallBingo: z.boolean().describe('Whether the bot thinks it has won and should call Bingo.'),
});
export type BotPlayerOutput = z.infer<typeof BotPlayerOutputSchema>;


export async function playBotTurn(input: BotPlayerInput): Promise<BotPlayerOutput> {
  return botPlayerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'botPlayerPrompt',
  input: {schema: BotPlayerInputSchema},
  output: {schema: BotPlayerOutputSchema},
  prompt: `You are an expert Bingo player AI. It is your turn.
  
  Your goal is to win the game. You need to decide whether to call a new number or, if you have 5 or more lines completed, to call "Bingo!".

  Analyze your board and the numbers that have already been called.

  Your Board: {{{playerBoard}}}
  Called Numbers: {{{calledNumbers}}}
  Available Numbers: {{json (allNumbers.filter(n => !calledNumbers.includes(n)))}}
  Winning Combinations: {{json WINNING_COMBINATIONS}}

  First, check if you have 5 or more winning lines based on your board and the called numbers. A line is complete if all 5 of its numbers are in the 'calledNumbers' list. If you have 5 or more completed lines, you MUST set 'shouldCallBingo' to true and can pick any available number as a formality.

  If you have fewer than 5 lines, you must choose a number to call from the list of available numbers. Choose strategically. A good strategy is to pick a number that helps you complete a line that is close to being finished.
  
  Based on your analysis, provide your decision.`,
});

const botPlayerFlow = ai.defineFlow(
  {
    name: 'botPlayerFlow',
    inputSchema: BotPlayerInputSchema,
    outputSchema: BotPlayerOutputSchema,
  },
  async (input) => {
    const {output} = await prompt({
        ...input,
        // Pass WINNING_COMBINATIONS to the prompt context.
        // @ts-ignore - Adding extra context for the prompt
        WINNING_COMBINATIONS,
    });
    return output!;
  }
);
