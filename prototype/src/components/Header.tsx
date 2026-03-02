import { Moon, Sun, Trophy, LogIn, LogOut, Home, Gamepad2 } from 'lucide-react';
import { GameMode } from '../types';
import { ReactNode } from 'react';

interface HeaderProps {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: {name: string, avatar: string} | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({ mode, setMode, isDarkMode, toggleTheme, user, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer group"
          onClick={() => setMode('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-all transform group-hover:rotate-3">
            AZ
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white hidden sm:block">
            Quiz Master
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <NavButton active={mode === 'home'} onClick={() => setMode('home')} icon={<Home size={18} />} label="Home" />
          <NavButton active={mode === 'classic'} onClick={() => setMode('classic')} icon={<Gamepad2 size={18} />} label="Classic" />
          <NavButton active={mode === 'pyramid'} onClick={() => setMode('pyramid')} icon={<Gamepad2 size={18} />} label="Pyramid" />
          <NavButton active={mode === 'hexagon'} onClick={() => setMode('hexagon')} icon={<Gamepad2 size={18} />} label="Hexagon" />
          <NavButton active={mode === 'leaderboard'} onClick={() => setMode('leaderboard')} icon={<Trophy size={18} />} label="Leaderboard" />
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2">
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" referrerPolicy="no-referrer" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
              </div>
              <button 
                onClick={onLogout}
                className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full font-medium shadow-sm transition-all active:scale-95"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all ${
        active 
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
