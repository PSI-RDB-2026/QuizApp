import { TileData } from '../types';
import { X } from 'lucide-react';

interface StandardQuestionModalProps {
  tile: TileData;
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
}

export default function StandardQuestionModal({ tile, onAnswer, onClose }: StandardQuestionModalProps) {
  const options = [
    { text: "Option A", correct: true },
    { text: "Option B", correct: false },
    { text: "Option C", correct: false },
    { text: "Option D", correct: false },
  ].sort(() => Math.random() - 0.5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="bg-primary p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold text-white mb-2 shadow-inner">
            {tile.label}
          </div>
          <h2 className="text-2xl font-bold text-white">Question for {tile.label}</h2>
        </div>
        
        <div className="p-6 md:p-8">
          <p className="text-xl text-center font-medium text-gray-800 dark:text-gray-200 mb-8">
            What is a common word starting with the letter {tile.label}?
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => onAnswer(opt.correct)}
                className="py-4 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary text-gray-800 dark:text-gray-200 rounded-2xl font-semibold text-lg transition-all active:scale-95 border-2 border-transparent hover:border-primary-dark"
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
