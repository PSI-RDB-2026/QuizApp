import { TileData } from '../types';
import { X, Check } from 'lucide-react';

interface YesNoModalProps {
  tile: TileData;
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
}

export default function YesNoModal({ tile, onAnswer, onClose }: YesNoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="bg-failed p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold text-white mb-2 shadow-inner">
            {tile.label}
          </div>
          <h2 className="text-2xl font-bold text-white">Second Chance!</h2>
          <p className="text-white/80 mt-2">Answer this Yes/No question to claim the tile.</p>
        </div>
        
        <div className="p-8">
          <p className="text-xl text-center font-medium text-gray-800 dark:text-gray-200 mb-8">
            Is "{tile.label}" the first letter of the capital of France?
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onAnswer(tile.label === 'P')}
              className="flex flex-col items-center justify-center py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-transform active:scale-95 shadow-lg shadow-green-500/30"
            >
              <Check size={32} className="mb-2" />
              ANO (YES)
            </button>
            <button 
              onClick={() => onAnswer(tile.label !== 'P')}
              className="flex flex-col items-center justify-center py-4 px-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xl transition-transform active:scale-95 shadow-lg shadow-red-500/30"
            >
              <X size={32} className="mb-2" />
              NE (NO)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
