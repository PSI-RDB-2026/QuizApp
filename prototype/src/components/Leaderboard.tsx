import { useState } from 'react';
import { Trophy, Medal, Gamepad2, Triangle, Hexagon } from 'lucide-react';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'classic' | 'pyramid' | 'hexagon'>('classic');

  const leaderboards = {
    classic: [
      { rank: 1, name: "Alex Hunter", score: 9850, avatar: "https://picsum.photos/seed/alex/100/100" },
      { rank: 2, name: "Sam Taylor", score: 8420, avatar: "https://picsum.photos/seed/sam/100/100" },
      { rank: 3, name: "Jordan Lee", score: 7900, avatar: "https://picsum.photos/seed/jordan/100/100" },
      { rank: 4, name: "Casey Smith", score: 7100, avatar: "https://picsum.photos/seed/casey/100/100" },
      { rank: 5, name: "Riley Jones", score: 6850, avatar: "https://picsum.photos/seed/riley/100/100" },
    ],
    pyramid: [
      { rank: 1, name: "Casey Smith", score: 6500, avatar: "https://picsum.photos/seed/casey/100/100" },
      { rank: 2, name: "Riley Jones", score: 5400, avatar: "https://picsum.photos/seed/riley/100/100" },
      { rank: 3, name: "Alex Hunter", score: 5100, avatar: "https://picsum.photos/seed/alex/100/100" },
      { rank: 4, name: "Sam Taylor", score: 4800, avatar: "https://picsum.photos/seed/sam/100/100" },
      { rank: 5, name: "Morgan Davis", score: 4200, avatar: "https://picsum.photos/seed/morgan/100/100" },
    ],
    hexagon: [
      { rank: 1, name: "Jordan Lee", score: 12400, avatar: "https://picsum.photos/seed/jordan/100/100" },
      { rank: 2, name: "Morgan Davis", score: 11200, avatar: "https://picsum.photos/seed/morgan/100/100" },
      { rank: 3, name: "Sam Taylor", score: 10500, avatar: "https://picsum.photos/seed/sam/100/100" },
      { rank: 4, name: "Alex Hunter", score: 9800, avatar: "https://picsum.photos/seed/alex/100/100" },
      { rank: 5, name: "Casey Smith", score: 8900, avatar: "https://picsum.photos/seed/casey/100/100" },
    ]
  };

  const players = leaderboards[activeTab];

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500 mb-4">
          <Trophy size={40} />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white">Global Leaderboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Top players of the week</p>
      </div>

      <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-8 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('classic')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'classic' ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Gamepad2 size={18} />
          <span className="hidden sm:inline">Classic</span>
        </button>
        <button
          onClick={() => setActiveTab('pyramid')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'pyramid' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Triangle size={18} />
          <span className="hidden sm:inline">Pyramid</span>
        </button>
        <button
          onClick={() => setActiveTab('hexagon')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-bold rounded-xl transition-all ${activeTab === 'hexagon' ? 'bg-white dark:bg-gray-700 text-purple-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Hexagon size={18} />
          <span className="hidden sm:inline">Hexagon</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {players.map((player) => (
            <div key={player.rank} className="flex items-center p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="w-12 flex justify-center">
                {player.rank === 1 ? <Medal className="text-yellow-500" size={28} /> :
                 player.rank === 2 ? <Medal className="text-gray-400" size={28} /> :
                 player.rank === 3 ? <Medal className="text-amber-600" size={28} /> :
                 <span className="text-xl font-bold text-gray-400">{player.rank}</span>}
              </div>
              
              <img 
                src={player.avatar} 
                alt={player.name} 
                className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-sm mx-4"
                referrerPolicy="no-referrer"
              />
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{player.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Level {Math.floor(player.score / 1000)}</p>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-extrabold text-primary">{player.score.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Points</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
