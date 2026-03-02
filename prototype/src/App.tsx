import { useState, useEffect } from 'react';
import Header from './components/Header';
import ClassicQuiz from './components/ClassicQuiz';
import PyramidQuiz from './components/PyramidQuiz';
import HexagonQuiz from './components/HexagonQuiz';
import Leaderboard from './components/Leaderboard';
import SignInModal from './components/SignInModal';
import { GameMode } from './types';
import { Gamepad2 } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<GameMode>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<{name: string, avatar: string} | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogin = (username?: string) => {
    // Mock login
    setUser({
      name: username || 'Alex Hunter',
      avatar: `https://picsum.photos/seed/${username || 'alex'}/100/100`
    });
    setIsSignInModalOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      <Header 
        mode={mode} 
        setMode={setMode} 
        isDarkMode={isDarkMode} 
        toggleTheme={() => setIsDarkMode(!isDarkMode)} 
        user={user}
        onLogin={() => setIsSignInModalOpen(true)}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {mode === 'home' && (
          <div className="flex flex-col items-center justify-center space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark text-center">
              Welcome to AZ Quiz Master
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 text-center max-w-2xl">
              Challenge yourself in multiple game modes. Conquer the pyramid, connect the hexagons, or test your knowledge in the classic mode!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8">
              <GameModeCard 
                title="Classic Quiz" 
                description="Standard 4-option questions."
                onClick={() => setMode('classic')}
                color="bg-blue-500"
              />
              <GameModeCard 
                title="AZ Pyramid" 
                description="Conquer the pyramid of letters."
                onClick={() => setMode('pyramid')}
                color="bg-primary"
              />
              <GameModeCard 
                title="Hexagon Connect" 
                description="Connect the edges to the center."
                onClick={() => setMode('hexagon')}
                color="bg-purple-500"
              />
            </div>
          </div>
        )}
        
        {mode === 'classic' && <ClassicQuiz />}
        {mode === 'pyramid' && <PyramidQuiz />}
        {mode === 'hexagon' && <HexagonQuiz />}
        {mode === 'leaderboard' && <Leaderboard />}
      </main>

      {isSignInModalOpen && (
        <SignInModal 
          onClose={() => setIsSignInModalOpen(false)} 
          onLogin={handleLogin} 
        />
      )}
    </div>
  );
}

function GameModeCard({ title, description, onClick, color }: { title: string, description: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border-t-4 border-primary group"
    >
      <div className={`w-20 h-20 rounded-2xl ${color} flex items-center justify-center text-white mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
        <Gamepad2 size={40} />
      </div>
      <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-center">{description}</p>
    </button>
  );
}
