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

export function getBotMove(board: number[], calledNumbers: number[], allNumbers: number[]): { shouldCallBingo: boolean, chosenNumber: number | null } {
  // 1. Check if the bot has won
  const hasWon = checkWin(board, calledNumbers);
  if (hasWon) {
    return { shouldCallBingo: true, chosenNumber: null };
  }

  // 2. If not a winner, choose a random available number
  const availableNumbers = allNumbers.filter(n => !calledNumbers.includes(n));
  if (availableNumbers.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return { shouldCallBingo: false, chosenNumber: availableNumbers[randomIndex] };
  }

  // 3. No moves left (should not happen in a normal game)
  return { shouldCallBingo: false, chosenNumber: null };
}
