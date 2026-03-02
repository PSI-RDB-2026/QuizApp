import { useState } from 'react';

export default function ClassicQuiz() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const options = [
    "Paris", "London", "Berlin", "Madrid"
  ];

  const handleSelect = (index: number) => {
    if (!isSubmitted) setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer !== null) setIsSubmitted(true);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700">
          <div className="h-full bg-primary w-1/3 transition-all duration-500"></div>
        </div>
        
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-8 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span>Question 3 of 10</span>
            <span className="flex items-center text-primary"><span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span> 15s</span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-10 leading-tight">
            What is the capital city of France?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, i) => {
              let btnClass = "border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-primary hover:bg-primary/5";
              
              if (selectedAnswer === i) {
                btnClass = "border-2 border-primary bg-primary/10 text-primary dark:text-primary";
              }
              
              if (isSubmitted) {
                if (i === 0) { // Let's say Paris is correct
                  btnClass = "border-2 border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/30";
                } else if (selectedAnswer === i) {
                  btnClass = "border-2 border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/30";
                } else {
                  btnClass = "border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 opacity-50";
                }
              }

              return (
                <button 
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={isSubmitted}
                  className={`py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-200 text-left flex items-center justify-between ${btnClass}`}
                >
                  <span>{opt}</span>
                  {isSubmitted && i === 0 && <span className="w-6 h-6 rounded-full bg-white text-green-500 flex items-center justify-center text-sm">✓</span>}
                  {isSubmitted && selectedAnswer === i && i !== 0 && <span className="w-6 h-6 rounded-full bg-white text-red-500 flex items-center justify-center text-sm">✕</span>}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 md:px-12 flex justify-end border-t border-gray-100 dark:border-gray-800">
          {!isSubmitted ? (
            <button 
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className={`py-3 px-8 rounded-xl font-bold text-white transition-all ${selectedAnswer !== null ? 'bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 active:scale-95' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
            >
              Submit Answer
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="py-3 px-8 rounded-xl font-bold text-white bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
