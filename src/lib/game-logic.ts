export const WINNING_COMBINATIONS = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

function isCombinationWinner(combination: number[], board: (number | null)[], calledNumbers: number[]): boolean {
    return combination.every(index => {
      const boardNumber = board[index];
      return boardNumber !== null && calledNumbers.includes(boardNumber);
    });
}


export function checkWin(board: (number | null)[], calledNumbers: number[]): boolean {
  if (!board || board.length !== 25) {
    return false;
  }
  if (board.some(cell => cell === null)) {
    return false;
  }
  
  const completedLines = countWinningLines(board, calledNumbers);
  return completedLines >= 5;
}

export function countWinningLines(board: (number | null)[], calledNumbers: number[]): number {
    if (!board || board.length !== 25 || board.some(c => c === null)) {
        return 0;
    }

    return WINNING_COMBINATIONS.reduce((count, combination) => {
        if (isCombinationWinner(combination, board, calledNumbers)) {
            return count + 1;
        }
        return count;
    }, 0);
}

// Helper to find the single number needed to complete a line
function findWinningNumber(board: number[], combination: number[], calledNumbers: number[]): number | null {
    const missingNumbers: number[] = [];
    let calledCount = 0;

    for (const index of combination) {
        const num = board[index];
        if (calledNumbers.includes(num)) {
            calledCount++;
        } else {
            missingNumbers.push(num);
        }
    }

    // If exactly 4 numbers are called, the one missing number is the winning one
    if (calledCount === 4 && missingNumbers.length === 1) {
        return missingNumbers[0];
    }
    return null;
}


export function getBotMove(
    botBoard: number[],
    playerBoard: number[],
    calledNumbers: number[],
    allNumbers: number[]
): { shouldCallBingo: boolean; chosenNumber: number | null } {
    // 1. Check if the bot has won
    if (checkWin(botBoard, calledNumbers)) {
        return { shouldCallBingo: true, chosenNumber: null };
    }

    const availableNumbers = allNumbers.filter(n => !calledNumbers.includes(n));

    // 2. Priority 1: Find a move for the bot to win immediately
    for (const combination of WINNING_COMBINATIONS) {
        const winningMove = findWinningNumber(botBoard, combination, calledNumbers);
        if (winningMove && availableNumbers.includes(winningMove)) {
            return { shouldCallBingo: false, chosenNumber: winningMove };
        }
    }

    // 3. Priority 2: Find a move to block the player from winning
    for (const combination of WINNING_COMBINATIONS) {
        const blockingMove = findWinningNumber(playerBoard, combination, calledNumbers);
        if (blockingMove && availableNumbers.includes(blockingMove)) {
            return { shouldCallBingo: false, chosenNumber: blockingMove };
        }
    }
    
    // 4. Priority 3: Make a strategic move to set up a future win
    const lineCompletionScores: { [key: number]: number } = {};

    for (const num of availableNumbers) {
        lineCompletionScores[num] = 0;
        // Check how many lines this number would help complete for the bot
        for (const combination of WINNING_COMBINATIONS) {
            const lineNumbers = combination.map(index => botBoard[index]);
            if (lineNumbers.includes(num)) {
                // This move is on a potential winning line
                const calledInLine = lineNumbers.filter(n => calledNumbers.includes(n)).length;
                // Prioritize moves that get a line closer to completion
                lineCompletionScores[num] += (calledInLine + 1); // Add 1 because this move improves it
            }
        }
    }
    
    if (Object.keys(lineCompletionScores).length > 0) {
        const bestMove = Object.keys(lineCompletionScores).reduce((a, b) => lineCompletionScores[a] > lineCompletionScores[b] ? a : b);
        if (bestMove) {
            return { shouldCallBingo: false, chosenNumber: parseInt(bestMove, 10) };
        }
    }
    
    // 5. Fallback: If no strategic moves, choose a random available number
    if (availableNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        return { shouldCallBingo: false, chosenNumber: availableNumbers[randomIndex] };
    }

    return { shouldCallBingo: false, chosenNumber: null };
}
