import { useState, FC } from 'react';
import { TileData, TileState } from '../types';
import YesNoModal from './YesNoModal';
import StandardQuestionModal from './StandardQuestionModal';
import { Users, Globe } from 'lucide-react';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const HEX_GRID_LAYOUT = [
  4, 5, 6, 7, 6, 5, 4
];

const INITIAL_HEX_GRID: TileData[][] = HEX_GRID_LAYOUT.map((cols, rowIndex) => 
  Array.from({ length: cols }, (_, colIndex) => {
    return {
      id: `h-r${rowIndex}-c${colIndex}`,
      label: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      state: 'neutral' as TileState
    };
  })
);

export default function HexagonQuiz() {
  const [gameStarted, setGameStarted] = useState(false);
  const [grid, setGrid] = useState<TileData[][]>(INITIAL_HEX_GRID);
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
    
    const newGrid = [...grid];
    newGrid[selectedTile.row] = [...newGrid[selectedTile.row]];
    newGrid[selectedTile.row][selectedTile.col] = {
      ...newGrid[selectedTile.row][selectedTile.col],
      state: newState
    };
    
    setGrid(newGrid);
    
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
          Hexagon Connect
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button
            onClick={() => setGameStarted(true)}
            className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-purple-500 group"
          >
            <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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

      <div className="flex flex-col items-center justify-center py-8">
        {grid.map((row, rowIndex) => (
          <div 
            key={`hex-row-${rowIndex}`} 
            className="flex justify-center"
            style={{ 
              marginTop: rowIndex === 0 ? '0' : '-1.5rem',
            }}
          >
            {row.map((tile, colIndex) => (
              <HexTile 
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

const HexTile: FC<{ tile: TileData, onClick: () => void }> = ({ tile, onClick }) => {
  let bgColor = "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700";
  let textColor = "text-gray-800 dark:text-white";
  let borderClass = "bg-gray-300 dark:bg-gray-600";
  
  if (tile.state === 'player1') {
    bgColor = "bg-gradient-to-br from-orange-400 to-player1";
    textColor = "text-white drop-shadow-md";
    borderClass = "bg-orange-600 shadow-[0_0_15px_rgba(255,87,34,0.6)]";
  } else if (tile.state === 'player2') {
    bgColor = "bg-gradient-to-br from-blue-400 to-player2";
    textColor = "text-white drop-shadow-md";
    borderClass = "bg-blue-600 shadow-[0_0_15px_rgba(33,150,243,0.6)]";
  } else if (tile.state === 'failed') {
    bgColor = "bg-gradient-to-br from-gray-800 to-black";
    textColor = "text-gray-500";
    borderClass = "bg-gray-700";
  }

  return (
    <div className="relative w-16 h-20 md:w-20 md:h-24 mx-1 group cursor-pointer" onClick={onClick}>
      <div className={`absolute inset-0 clip-hexagon transition-all duration-300 group-hover:scale-110 ${borderClass} ${tile.state !== 'neutral' ? 'scale-105 z-10' : ''}`}></div>
      
      <div 
        className={`absolute inset-[3px] clip-hexagon transition-all duration-300 group-hover:scale-110 flex items-center justify-center ${bgColor} ${tile.state !== 'neutral' ? 'scale-105 z-10' : ''}`}
      >
        <span className={`text-xl md:text-2xl font-bold z-10 ${textColor}`}>{tile.label}</span>
        {tile.state === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 z-20 pointer-events-none">
            <div className="w-full h-1 bg-red-500 rotate-45 absolute"></div>
            <div className="w-full h-1 bg-red-500 -rotate-45 absolute"></div>
          </div>
        )}
      </div>
      
      <div className={`absolute inset-0 clip-hexagon bg-black/20 dark:bg-black/40 -z-10 transform translate-y-2`}></div>
    </div>
  );
}
