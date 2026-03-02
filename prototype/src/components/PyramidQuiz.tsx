import { useState, FC } from 'react';
import { TileData, TileState } from '../types';
import YesNoModal from './YesNoModal';
import StandardQuestionModal from './StandardQuestionModal';
import { Users, Globe } from 'lucide-react';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const INITIAL_PYRAMID: TileData[][] = Array.from({ length: 6 }, (_, rowIndex) => 
  Array.from({ length: rowIndex + 1 }, (_, colIndex) => {
    const index = (rowIndex * (rowIndex + 1)) / 2 + colIndex;
    return {
      id: `r${rowIndex}-c${colIndex}`,
      label: LETTERS[index % LETTERS.length],
      state: 'neutral' as TileState
    };
  })
);

export default function PyramidQuiz() {
  const [gameStarted, setGameStarted] = useState(false);
  const [pyramid, setPyramid] = useState<TileData[][]>(INITIAL_PYRAMID);
  const [selectedTile, setSelectedTile] = useState<{row: number, col: number, tile: TileData} | null>(null);
  const [showYesNoModal, setShowYesNoModal] = useState(false);
  const [showStandardModal, setShowStandardModal] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<'player1' | 'player2'>('player1');

  const handleTileClick = (rowIndex: number, colIndex: number, tile: TileData) => {
    setSelectedTile({ row: rowIndex, col: colIndex, tile });
    
    if (tile.state === 'failed') {
      setShowYesNoModal(true);
    } else if (tile.state === 'neutral') {
      setShowStandardModal(true);
    }
  };

  const updateTileState = (newState: TileState) => {
    if (!selectedTile) return;
    
    const newPyramid = [...pyramid];
    newPyramid[selectedTile.row] = [...newPyramid[selectedTile.row]];
    newPyramid[selectedTile.row][selectedTile.col] = {
      ...newPyramid[selectedTile.row][selectedTile.col],
      state: newState
    };
    
    setPyramid(newPyramid);
    
    if (newState === 'player1' || newState === 'player2' || newState === 'failed') {
      setCurrentPlayer(prev => prev === 'player1' ? 'player2' : 'player1');
    }
  };

  const handleStandardAnswer = (correct: boolean) => {
    setShowStandardModal(false);
    if (correct) {
      updateTileState(currentPlayer);
    } else {
      updateTileState('failed');
    }
  };

  const handleYesNoAnswer = (correct: boolean) => {
    setShowYesNoModal(false);
    if (correct) {
      updateTileState(currentPlayer);
    } else {
      setCurrentPlayer(prev => prev === 'player1' ? 'player2' : 'player1');
    }
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-8 text-center">
          AZ Pyramid
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button
            onClick={() => setGameStarted(true)}
            className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-primary group"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Local Multiplayer</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm">Play with a friend on the same device.</p>
          </button>

          <button
            disabled
            className="flex flex-col items-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-2xl flex items-center justify-center mb-4">
              <Globe size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Online Multiplayer</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm">Coming soon! Play with friends online.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between w-full max-w-md bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md">
        <div className={`px-4 py-2 rounded-lg font-bold ${currentPlayer === 'player1' ? 'bg-player1 text-white shadow-lg scale-110' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} transition-all`}>
          Player 1
        </div>
        <div className="text-xl font-bold text-gray-400">VS</div>
        <div className={`px-4 py-2 rounded-lg font-bold ${currentPlayer === 'player2' ? 'bg-player2 text-white shadow-lg scale-110' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} transition-all`}>
          Player 2
        </div>
      </div>

      <div className="flex flex-col items-center space-y-2 md:space-y-4">
        {pyramid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex space-x-2 md:space-x-4">
            {row.map((tile, colIndex) => (
              <Tile 
                key={tile.id} 
                tile={tile} 
                onClick={() => handleTileClick(rowIndex, colIndex, tile)} 
              />
            ))}
          </div>
        ))}
      </div>

      {showStandardModal && selectedTile && (
        <StandardQuestionModal 
          tile={selectedTile.tile}
          onAnswer={handleStandardAnswer}
          onClose={() => setShowStandardModal(false)}
        />
      )}

      {showYesNoModal && selectedTile && (
        <YesNoModal 
          tile={selectedTile.tile}
          onAnswer={handleYesNoAnswer}
          onClose={() => setShowYesNoModal(false)}
        />
      )}
    </div>
  );
}

const Tile: FC<{ tile: TileData, onClick: () => void }> = ({ tile, onClick }) => {
  let bgColor = "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary border-dashed";
  let textColor = "text-gray-800 dark:text-white";
  
  if (tile.state === 'player1') {
    bgColor = "bg-gradient-to-br from-orange-400 to-player1 border-2 border-orange-600 shadow-[0_0_15px_rgba(255,87,34,0.6)] scale-105 z-10";
    textColor = "text-white drop-shadow-md";
  } else if (tile.state === 'player2') {
    bgColor = "bg-gradient-to-br from-blue-400 to-player2 border-2 border-blue-600 shadow-[0_0_15px_rgba(33,150,243,0.6)] scale-105 z-10";
    textColor = "text-white drop-shadow-md";
  } else if (tile.state === 'failed') {
    bgColor = "bg-gradient-to-br from-gray-800 to-black border-2 border-gray-700 shadow-inner opacity-90";
    textColor = "text-gray-500";
  }

  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold transform transition-all duration-200 hover:scale-110 active:scale-95 ${bgColor} ${textColor}`}
    >
      {tile.label}
      {tile.state === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-full h-1 bg-red-500 rotate-45 absolute"></div>
          <div className="w-full h-1 bg-red-500 -rotate-45 absolute"></div>
        </div>
      )}
    </button>
  );
}
