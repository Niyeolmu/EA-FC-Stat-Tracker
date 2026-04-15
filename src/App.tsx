/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Plus, 
  ChevronRight, 
  Trash2, 
  Save, 
  History, 
  TrendingUp,
  X,
  AlertCircle,
  Shield,
  Star,
  Volume2,
  VolumeX,
  Volume1
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Match, MatchEvent, TournamentStats, RealPlayerStats, Tournament } from './types';

// --- Theme Constants ---
const COLORS = {
  bg: 'bg-[#02071a]',
  card: 'bg-white/5 backdrop-blur-[10px]',
  accent: 'text-[#c39b4b]',
  accentBg: 'bg-[#0047e0]',
  border: 'border-white/10',
  text: 'text-white',
  textMuted: 'text-[#a0a6b9]',
  uclGold: '#c39b4b',
  accentBlue: '#0047e0',
};

export default function App() {
  // --- State ---
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [view, setView] = useState<'menu' | 'app'>('menu');
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', team: '' });
  const [newMatch, setNewMatch] = useState({ homePlayerId: '', awayPlayerId: '' });
  const [matchError, setMatchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'players' | 'topscorers'>('standings');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [statsSort, setStatsSort] = useState<{ key: keyof RealPlayerStats, direction: 'asc' | 'desc' }>({ key: 'goals', direction: 'desc' });

  // --- Audio State ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const savedTournaments = localStorage.getItem('ucl_tournaments_list');
    if (savedTournaments) {
      setTournaments(JSON.parse(savedTournaments));
    }
  }, []);

  // Sync current tournament data to the list
  useEffect(() => {
    if (currentTournamentId) {
      setTournaments(prev => prev.map(t => 
        t.id === currentTournamentId 
          ? { ...t, players, matches } 
          : t
      ));
    }
  }, [players, matches, currentTournamentId]);

  // Save list to localStorage
  useEffect(() => {
    localStorage.setItem('ucl_tournaments_list', JSON.stringify(tournaments));
  }, [tournaments]);

  // --- Tournament Actions ---
  const createTournament = () => {
    if (!newTournamentName.trim()) return;
    const newT: Tournament = {
      id: crypto.randomUUID(),
      name: newTournamentName,
      players: [],
      matches: [],
      createdAt: Date.now()
    };
    setTournaments([...tournaments, newT]);
    loadTournament(newT.id);
    setNewTournamentName('');
    setIsCreatingTournament(false);
  };

  const loadTournament = (id: string) => {
    const t = tournaments.find(t => t.id === id);
    if (t) {
      setCurrentTournamentId(id);
      setPlayers(t.players);
      setMatches(t.matches);
      setView('app');
      setActiveTab('standings');
    }
  };

  const deleteTournament = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournaments(tournaments.filter(t => t.id !== id));
    if (currentTournamentId === id) {
      setCurrentTournamentId(null);
      setView('menu');
    }
  };

  const exitTournament = () => {
    setView('menu');
    setCurrentTournamentId(null);
    setPlayers([]);
    setMatches([]);
  };

  // --- Audio Effects ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const playAudio = () => {
      if (view === 'menu') {
        audioRef.current?.play().catch((err) => {
          console.log("Autoplay blocked or error:", err);
        });
      } else {
        audioRef.current?.pause();
      }
    };

    playAudio();
    
    // Add interaction listener to handle autoplay block
    const handleInteraction = () => {
      playAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [view]);

  // --- Logic ---
  const stats = useMemo(() => {
    const playerStats: Record<string, TournamentStats> = {};
    
    players.forEach(p => {
      playerStats[p.id] = {
        playerId: p.id,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
        points: 0, assists: 0, yellowCards: 0, redCards: 0
      };
    });

    matches.filter(m => m.isCompleted).forEach(m => {
      const home = playerStats[m.homePlayerId];
      const away = playerStats[m.awayPlayerId];

      if (home && away) {
        home.played++;
        away.played++;
        home.goalsFor += m.homeScore;
        home.goalsAgainst += m.awayScore;
        away.goalsFor += m.awayScore;
        away.goalsAgainst += m.homeScore;

        if (m.homeScore > m.awayScore) {
          home.won++;
          home.points += 3;
          away.lost++;
        } else if (m.homeScore < m.awayScore) {
          away.won++;
          away.points += 3;
          home.lost++;
        } else {
          home.drawn++;
          away.drawn++;
          home.points += 1;
          away.points += 1;
        }

        m.events.forEach(e => {
          const p = playerStats[e.playerId];
          if (p) {
            if (e.type === 'assist') p.assists++;
            if (e.type === 'yellow_card') p.yellowCards++;
            if (e.type === 'red_card') p.redCards++;
          }
        });
      }
    });

    return Object.values(playerStats)
      .map(s => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [players, matches]);

  const addPlayer = () => {
    if (!newPlayer.name || !newPlayer.team) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name: newPlayer.name,
      team: newPlayer.team,
    };
    setPlayers([...players, player]);
    setNewPlayer({ name: '', team: '' });
    setIsAddingPlayer(false);
  };

  const deletePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
    setMatches(matches.filter(m => m.homePlayerId !== id && m.awayPlayerId !== id));
  };

  const generateFixtures = () => {
    if (players.length < 2) return;
    const newFixtures: Match[] = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = 0; j < players.length; j++) {
        if (i !== j) {
          newFixtures.push({
            id: crypto.randomUUID(),
            homePlayerId: players[i].id,
            awayPlayerId: players[j].id,
            homeScore: 0,
            awayScore: 0,
            events: [],
            isCompleted: false,
            date: Date.now(),
          });
        }
      }
    }
    setMatches([...matches, ...newFixtures]);
  };

  const saveMatch = (match: Match) => {
    setMatches(matches.map(m => m.id === match.id ? { ...match, isCompleted: true } : m));
    setEditingMatch(null);
  };

  const addMatch = () => {
    if (!newMatch.homePlayerId || !newMatch.awayPlayerId || newMatch.homePlayerId === newMatch.awayPlayerId) return;
    
    // Check if 2 matches already exist between these two players
    const existingMatchesCount = matches.filter(m => 
      (m.homePlayerId === newMatch.homePlayerId && m.awayPlayerId === newMatch.awayPlayerId) ||
      (m.homePlayerId === newMatch.awayPlayerId && m.awayPlayerId === newMatch.homePlayerId)
    ).length;

    if (existingMatchesCount >= 2) {
      setMatchError('Bu iki oyuncu arasında zaten 2 maç yapıldı!');
      return;
    }

    const match: Match = {
      id: crypto.randomUUID(),
      homePlayerId: newMatch.homePlayerId,
      awayPlayerId: newMatch.awayPlayerId,
      homeScore: 0,
      awayScore: 0,
      events: [],
      isCompleted: false,
      date: Date.now(),
    };
    setMatches([...matches, match]);
    setIsAddingMatch(false);
    setNewMatch({ homePlayerId: '', awayPlayerId: '' });
    setMatchError(null);
  };

  const nextMatch = matches.find(m => !m.isCompleted);

  const realPlayerStats = useMemo(() => {
    const stats: Record<string, RealPlayerStats> = {};
    
    matches.filter(m => m.isCompleted).forEach(m => {
      m.events.forEach(e => {
        if (!e.realPlayerName) return;
        if (!stats[e.realPlayerName]) {
          const player = players.find(p => p.id === e.playerId);
          stats[e.realPlayerName] = {
            name: e.realPlayerName,
            team: player?.team || 'Unknown',
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0
          };
        }
        if (e.type === 'goal') stats[e.realPlayerName].goals++;
        if (e.type === 'assist') stats[e.realPlayerName].assists++;
        if (e.type === 'yellow_card') stats[e.realPlayerName].yellowCards++;
        if (e.type === 'red_card') stats[e.realPlayerName].redCards++;
      });
    });

    return Object.values(stats).sort((a, b) => {
      const aVal = a[statsSort.key];
      const bVal = b[statsSort.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return statsSort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return statsSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [matches, players, statsSort]);

  const handleSort = (key: keyof RealPlayerStats) => {
    setStatsSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // --- Render Helpers ---
  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wider ${
        activeTab === id 
          ? `bg-[#0047e0] text-white shadow-lg shadow-[#0047e0]/20` 
          : `border border-white/10 text-[#a0a6b9] hover:bg-white/5`
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} font-sans selection:bg-[#0047e0]/30 relative`}>
      {/* Global Background for Tournament View (when not in menu) */}
      {view !== 'menu' && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg-img.jpg)' }}
        >
          <div className="absolute inset-0 bg-[#02071a]/85" />
        </div>
      )}
      <audio 
        ref={audioRef}
        src="/videoplayback.weba"
        loop
      />
      <AnimatePresence mode="wait">
        {view === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 relative"
          >
            {/* Background Image with Overlay */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: 'url(/mainbg-img.jpeg)' }}
            >
              <div className="absolute inset-0 bg-[#02071a]/60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-md">
              <div className="flex flex-col items-center mb-12 text-center">
                <img 
                  src="/pngtree-the-uefa-champions-league-trophy-cup-png-image_17378593.webp" 
                  alt="UCL Trophy"
                  className="w-32 h-32 object-contain mb-4 drop-shadow-[0_0_20px_rgba(195,155,75,0.4)]"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">
                  CHAMPIONS <span className="text-[#c39b4b]">LEAGUE</span>
                </h1>
                <p className="text-[#a0a6b9] font-bold tracking-widest uppercase text-xs">Turnuva Yönetim Sistemi</p>
              </div>

              <div className="w-full space-y-4">
                <button 
                  onClick={() => setIsCreatingTournament(true)}
                  className="w-full py-4 rounded-xl bg-[#0047e0] text-white font-black uppercase tracking-widest hover:bg-[#0047e0]/80 transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#0047e0]/20"
                >
                  <Plus size={20} /> Yeni Turnuva Başlat
                </button>

                <div className="pt-8 w-full">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a0a6b9] mb-4 text-center">Kayıtlı Turnuvalar</h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {tournaments.map(t => (
                      <div 
                        key={t.id}
                        onClick={() => loadTournament(t.id)}
                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#0047e0]/50 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-[10px] text-[#a0a6b9] uppercase tracking-wider">
                            {t.players.length} Oyuncu • {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteTournament(t.id, e)}
                          className="p-2 text-red-500/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {tournaments.length === 0 && (
                      <p className="text-center text-[#a0a6b9] text-xs italic py-4">Henüz kayıtlı turnuva yok.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Controls */}
            <div className="fixed bottom-8 right-8 flex items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 z-20">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-white/60 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setVolume(newVol);
                  setIsMuted(false);
                  if (view === 'menu') audioRef.current?.play().catch(() => {});
                }}
                className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#0047e0]"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-6 py-8 relative z-10 min-h-screen"
          >
            {/* Header */}
            <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3 font-extrabold tracking-widest uppercase text-[#c39b4b] cursor-pointer" onClick={exitTournament}>
                <img 
                  src="/pngtree-the-uefa-champions-league-trophy-cup-png-image_17378593.webp" 
                  alt="UCL Trophy"
                  className="w-8 h-8 object-contain"
                  referrerPolicy="no-referrer"
                />
                CHAMPIONS <span className="text-white">LEAGUE HUD</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={exitTournament}
                  className="px-4 py-2 rounded-md border border-white/10 text-[#a0a6b9] text-xs font-bold hover:bg-white/5 transition-colors uppercase"
                >
                  Ana Menü
                </button>
                <button 
                  onClick={() => setActiveTab('matches')}
                  className="px-4 py-2 rounded-md border border-[#0047e0] text-white text-xs font-bold hover:bg-[#0047e0]/10 transition-colors uppercase"
                >
                  Maç Programla
                </button>
                <button 
                  onClick={() => setIsAddingPlayer(true)}
                  className="px-4 py-2 rounded-md bg-[#0047e0] text-white text-xs font-bold hover:bg-[#0047e0]/80 transition-colors uppercase"
                >
                  Oyuncu Ekle
                </button>
              </div>
            </header>

        {/* Next Match Banner */}
        {nextMatch && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`mb-8 p-8 rounded-xl border border-white/10 bg-gradient-to-br from-[#0047e0]/20 to-transparent border-l-4 border-l-[#0047e0] relative overflow-hidden group backdrop-blur-md`}
          >
            <div className="absolute top-4 left-6 text-[10px] text-[#a0a6b9] uppercase tracking-widest font-bold">Sıradaki Karşılaşma</div>
            <div className="flex items-center justify-center gap-12 mt-4">
              <div className="text-center min-w-[120px]">
                <p className="text-2xl font-bold">{players.find(p => p.id === nextMatch.homePlayerId)?.name}</p>
                <p className="text-xs text-[#a0a6b9]">{players.find(p => p.id === nextMatch.homePlayerId)?.team}</p>
              </div>
              <div className="w-12 h-12 border-2 border-[#c39b4b] rounded-full flex items-center justify-center font-black italic text-lg text-white">VS</div>
              <div className="text-center min-w-[120px]">
                <p className="text-2xl font-bold">{players.find(p => p.id === nextMatch.awayPlayerId)?.name}</p>
                <p className="text-xs text-[#a0a6b9]">{players.find(p => p.id === nextMatch.awayPlayerId)?.team}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setEditingMatch(nextMatch)}
                className="px-6 py-2 rounded-md bg-[#0047e0] text-white text-xs font-bold hover:bg-[#0047e0]/80 transition-colors uppercase"
              >
                İstatistik Gir
              </button>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex justify-center flex-wrap gap-3 mb-8">
          <TabButton id="standings" label="Puan Durumu" icon={TrendingUp} />
          <TabButton id="matches" label="Maçlar" icon={History} />
          <TabButton id="topscorers" label="İstatistikler" icon={Trophy} />
          <TabButton id="players" label="Oyuncular" icon={Users} />
        </nav>

        {/* Content */}
        <main className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'standings' && (
              <motion.div
                key="standings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`${COLORS.card} rounded-xl border border-white/10 overflow-hidden`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-[#a0a6b9]">
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Oyuncu / Takım</th>
                        <th className="px-6 py-4 text-center">O</th>
                        <th className="px-6 py-4 text-center">G</th>
                        <th className="px-6 py-4 text-center">B</th>
                        <th className="px-6 py-4 text-center">M</th>
                        <th className="px-6 py-4 text-center">AG</th>
                        <th className="px-6 py-4 text-center">YG</th>
                        <th className="px-6 py-4 text-center">AV</th>
                        <th className="px-6 py-4 text-center text-[#c39b4b]">P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.map((s, i) => {
                        const player = players.find(p => p.id === s.playerId);
                        return (
                          <tr key={s.playerId} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-mono text-[#0047e0] font-bold">{i + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-sm">{player?.name}</div>
                              <div className="text-[10px] text-[#a0a6b9] uppercase tracking-wider">{player?.team}</div>
                            </td>
                            <td className="px-6 py-4 text-center text-sm">{s.played}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.won}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.drawn}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.lost}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.goalsFor}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.goalsAgainst}</td>
                            <td className="px-6 py-4 text-center text-sm">{s.goalDifference}</td>
                            <td className="px-6 py-4 text-center font-black text-[#c39b4b] text-base">{s.points}</td>
                          </tr>
                        );
                      })}
                      {stats.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-6 py-12 text-center text-[#a0a6b9] text-xs uppercase tracking-widest italic">
                            Henüz veri bulunmuyor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'topscorers' && (
              <motion.div
                key="topscorers"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`${COLORS.card} rounded-xl border border-white/10 overflow-hidden`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-[#a0a6b9]">
                        <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>Futbolcu</th>
                        <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('team')}>Takım</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors text-[#c39b4b]" onClick={() => handleSort('goals')}>Gol</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('assists')}>Asist</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('yellowCards')}>Sarı</th>
                        <th className="px-6 py-4 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('redCards')}>Kırmızı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {realPlayerStats.map((s, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-bold text-sm">{s.name}</td>
                          <td className="px-6 py-4 text-[10px] text-[#a0a6b9] uppercase tracking-wider">{s.team}</td>
                          <td className="px-6 py-4 text-center font-black text-[#c39b4b] text-base">{s.goals}</td>
                          <td className="px-6 py-4 text-center text-sm">{s.assists}</td>
                          <td className="px-6 py-4 text-center text-sm text-yellow-400">{s.yellowCards}</td>
                          <td className="px-6 py-4 text-center text-sm text-red-500">{s.redCards}</td>
                        </tr>
                      ))}
                      {realPlayerStats.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-[#a0a6b9] text-xs uppercase tracking-widest italic">
                            Henüz istatistik kaydedilmedi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'matches' && (
              <motion.div
                key="matches"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#a0a6b9]">Fikstür & Sonuçlar</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsAddingMatch(true)}
                      className="px-4 py-2 rounded-md bg-[#0047e0] text-white text-[10px] font-bold hover:bg-[#0047e0]/80 transition-colors uppercase"
                    >
                      Maç Ekle
                    </button>
                    <button 
                      onClick={generateFixtures}
                      className="px-4 py-2 rounded-md border border-white/10 text-white text-[10px] font-bold hover:bg-white/5 transition-colors uppercase"
                    >
                      Otomatik Fikstür
                    </button>
                    <button 
                      onClick={() => setMatches([])}
                      className="px-4 py-2 rounded-md border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/10 transition-colors uppercase"
                    >
                      Sıfırla
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {matches.map((m) => (
                    <div 
                      key={m.id} 
                      className={`${COLORS.card} rounded-lg border border-white/10 p-4 flex items-center justify-between group hover:border-[#0047e0]/50 transition-colors`}
                    >
                      <div className="flex-1 flex items-center justify-end gap-6">
                        <div className="text-right">
                          <p className="font-bold text-sm">{players.find(p => p.id === m.homePlayerId)?.name}</p>
                          <p className="text-[10px] text-[#a0a6b9] uppercase tracking-wider">{players.find(p => p.id === m.homePlayerId)?.team}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-md bg-white/5 flex items-center justify-center font-black text-xl ${m.isCompleted ? 'text-white' : 'text-white/10'}`}>
                          {m.isCompleted ? m.homeScore : '-'}
                        </div>
                      </div>
                      
                      <div className="px-6 text-[#a0a6b9]/20 font-black italic text-xs">VS</div>

                      <div className="flex-1 flex items-center justify-start gap-6">
                        <div className={`w-12 h-12 rounded-md bg-white/5 flex items-center justify-center font-black text-xl ${m.isCompleted ? 'text-white' : 'text-white/10'}`}>
                          {m.isCompleted ? m.awayScore : '-'}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{players.find(p => p.id === m.awayPlayerId)?.name}</p>
                          <p className="text-[10px] text-[#a0a6b9] uppercase tracking-wider">{players.find(p => p.id === m.awayPlayerId)?.team}</p>
                        </div>
                      </div>

                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingMatch(m)}
                          className="p-2 rounded-md bg-[#0047e0] text-white hover:bg-[#0047e0]/80 transition-colors"
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {matches.length === 0 && (
                    <div className="text-center py-12 text-[#a0a6b9] text-xs uppercase tracking-widest italic">
                      Henüz fikstür oluşturulmadı.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'players' && (
              <motion.div
                key="players"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {players.map(p => (
                  <div key={p.id} className={`${COLORS.card} rounded-xl border border-white/10 p-6 relative group overflow-hidden hover:border-[#0047e0]/50 transition-colors`}>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-white">
                      <Shield size={120} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-md bg-[#0047e0]/20 flex items-center justify-center text-[#0047e0]">
                        <Users size={20} />
                      </div>
                      <button 
                        onClick={() => deletePlayer(p.id)}
                        className="text-red-400/40 hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                      <p className="text-[10px] text-[#a0a6b9] uppercase tracking-widest font-bold">{p.team}</p>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setIsAddingPlayer(true)}
                  className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors min-h-[140px]"
                >
                  <Plus size={24} className="text-[#0047e0]" />
                  <span className="font-bold uppercase tracking-widest text-[10px] text-[#a0a6b9]">Oyuncu Ekle</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    )}
  </AnimatePresence>

  {/* Modals */}
  <AnimatePresence>
    {isCreatingTournament && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`${COLORS.card} border border-white/10 p-8 rounded-xl w-full max-w-md relative`}
        >
          <button onClick={() => setIsCreatingTournament(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
            <X size={20} />
          </button>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#a0a6b9] mb-6">Yeni Turnuva Oluştur</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] mb-2">Turnuva Adı</label>
              <input 
                type="text" 
                value={newTournamentName}
                onChange={e => setNewTournamentName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-[#0047e0] outline-none transition-colors"
                placeholder="Örn: Yaz Kupası 2024"
                autoFocus
              />
            </div>
            <button 
              onClick={createTournament}
              className="w-full py-3 rounded-md bg-[#0047e0] text-white text-xs font-bold mt-4 hover:bg-[#0047e0]/80 transition-all uppercase tracking-widest"
            >
              Turnuvayı Başlat
            </button>
          </div>
        </motion.div>
      </div>
    )}
    {isAddingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${COLORS.card} border border-white/10 p-8 rounded-xl w-full max-w-md relative`}
            >
              <button onClick={() => setIsAddingPlayer(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X size={20} />
              </button>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#a0a6b9] mb-6">Yeni Oyuncu Kaydı</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] mb-2">Oyuncu İsmi</label>
                  <input 
                    type="text" 
                    value={newPlayer.name}
                    onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-[#0047e0] outline-none transition-colors"
                    placeholder="Örn: Emir"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] mb-2">Takım</label>
                  <input 
                    type="text" 
                    value={newPlayer.team}
                    onChange={e => setNewPlayer({ ...newPlayer, team: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-[#0047e0] outline-none transition-colors"
                    placeholder="Örn: Real Madrid"
                  />
                </div>
                <button 
                  onClick={addPlayer}
                  className="w-full py-3 rounded-md bg-[#0047e0] text-white text-xs font-bold mt-4 hover:bg-[#0047e0]/80 transition-all uppercase tracking-widest"
                >
                  Sisteme Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${COLORS.card} border border-white/10 p-8 rounded-xl w-full max-w-md relative`}
            >
              <button onClick={() => { setIsAddingMatch(false); setMatchError(null); }} className="absolute top-4 right-4 text-white/40 hover:text-white">
                <X size={20} />
              </button>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#a0a6b9] mb-6">Yeni Maç Ekle</h2>
              <div className="space-y-4">
                {matchError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 rounded-md font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} />
                    {matchError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] mb-2">Ev Sahibi</label>
                  <select 
                    value={newMatch.homePlayerId}
                    onChange={e => setNewMatch({ ...newMatch, homePlayerId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-[#0047e0] outline-none transition-colors"
                  >
                    <option value="" className="bg-[#02071a]">Oyuncu Seçin</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#02071a]">{p.name} ({p.team})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] mb-2">Deplasman</label>
                  <select 
                    value={newMatch.awayPlayerId}
                    onChange={e => setNewMatch({ ...newMatch, awayPlayerId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-[#0047e0] outline-none transition-colors"
                  >
                    <option value="" className="bg-[#02071a]">Oyuncu Seçin</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#02071a]">{p.name} ({p.team})</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={addMatch}
                  className="w-full py-3 rounded-md bg-[#0047e0] text-white text-xs font-bold mt-4 hover:bg-[#0047e0]/80 transition-all uppercase tracking-widest"
                >
                  Maçı Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`${COLORS.card} border border-white/10 p-8 rounded-xl w-full max-w-2xl my-8`}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#a0a6b9]">Maç Veri Girişi</h2>
                <button onClick={() => setEditingMatch(null)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 mb-12">
                <div className="text-center">
                  <p className="text-lg font-bold">{players.find(p => p.id === editingMatch.homePlayerId)?.name}</p>
                  <p className="text-[10px] text-[#a0a6b9] uppercase tracking-widest">{players.find(p => p.id === editingMatch.homePlayerId)?.team}</p>
                  <input 
                    type="number" 
                    value={editingMatch.homeScore}
                    onChange={e => setEditingMatch({ ...editingMatch, homeScore: parseInt(e.target.value) || 0 })}
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-md text-center text-3xl font-black mt-4 outline-none focus:border-[#0047e0]"
                  />
                </div>
                <div className="text-center text-[#a0a6b9]/20 font-black italic text-2xl uppercase">VS</div>
                <div className="text-center">
                  <p className="text-lg font-bold">{players.find(p => p.id === editingMatch.awayPlayerId)?.name}</p>
                  <p className="text-[10px] text-[#a0a6b9] uppercase tracking-widest">{players.find(p => p.id === editingMatch.awayPlayerId)?.team}</p>
                  <input 
                    type="number" 
                    value={editingMatch.awayScore}
                    onChange={e => setEditingMatch({ ...editingMatch, awayScore: parseInt(e.target.value) || 0 })}
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-md text-center text-3xl font-black mt-4 outline-none focus:border-[#0047e0]"
                  />
                </div>
              </div>

              {/* Events Section */}
              <div className="space-y-6 mb-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a0a6b9] flex items-center gap-2">
                    <AlertCircle size={14} className="text-[#0047e0]" />
                    Maç Olayları
                  </h3>
                  <button 
                    onClick={() => setEditingMatch({
                      ...editingMatch,
                      events: [...editingMatch.events, { type: 'goal', playerId: editingMatch.homePlayerId }]
                    })}
                    className="text-[10px] font-bold text-[#0047e0] hover:underline uppercase tracking-widest"
                  >
                    + Olay Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {editingMatch.events.map((event, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-white/5 p-3 rounded-md border border-white/5">
                      <div className="flex items-center gap-3">
                        <select 
                          value={event.type}
                          onChange={e => {
                            const newEvents = [...editingMatch.events];
                            newEvents[idx].type = e.target.value as any;
                            setEditingMatch({ ...editingMatch, events: newEvents });
                          }}
                          className="bg-transparent text-[10px] font-bold outline-none uppercase tracking-wider"
                        >
                          <option value="goal" className="bg-[#02071a]">Gol</option>
                          <option value="assist" className="bg-[#02071a]">Asist</option>
                          <option value="yellow_card" className="bg-[#02071a]">Sarı Kart</option>
                          <option value="red_card" className="bg-[#02071a]">Kırmızı Kart</option>
                        </select>
                        
                        <select 
                          value={event.playerId}
                          onChange={e => {
                            const newEvents = [...editingMatch.events];
                            newEvents[idx].playerId = e.target.value;
                            setEditingMatch({ ...editingMatch, events: newEvents });
                          }}
                          className="flex-1 bg-transparent text-xs outline-none font-bold"
                        >
                          <option value={editingMatch.homePlayerId} className="bg-[#02071a]">
                            {players.find(p => p.id === editingMatch.homePlayerId)?.name} (Kontrolünde)
                          </option>
                          <option value={editingMatch.awayPlayerId} className="bg-[#02071a]">
                            {players.find(p => p.id === editingMatch.awayPlayerId)?.name} (Kontrolünde)
                          </option>
                        </select>

                        <button 
                          onClick={() => {
                            const newEvents = editingMatch.events.filter((_, i) => i !== idx);
                            setEditingMatch({ ...editingMatch, events: newEvents });
                          }}
                          className="text-red-400/60 hover:text-red-400 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <input 
                        type="text"
                        value={event.realPlayerName || ''}
                        onChange={e => {
                          const newEvents = [...editingMatch.events];
                          newEvents[idx].realPlayerName = e.target.value;
                          setEditingMatch({ ...editingMatch, events: newEvents });
                        }}
                        placeholder="Futbolcu İsmi (Örn: Mbappe)"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[#0047e0]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => saveMatch(editingMatch)}
                className="w-full py-4 rounded-md bg-[#0047e0] text-white text-xs font-bold hover:bg-[#0047e0]/80 transition-all uppercase tracking-widest"
              >
                Verileri Kaydet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #02071a;
        }

        .ucl-bg-gradient {
          background: url('https://ais-dev-7r6hujqqx3mgz5pwtsah3j-198816423399.europe-west2.run.app/api/user-attachments/67fe6175-9e66-4740-9a25-7b56f8f121e4') no-repeat center center fixed;
          background-size: cover;
        }

        .ucl-bg-gradient::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 50% 50%, rgba(12, 28, 78, 0.8) 0%, rgba(2, 7, 26, 0.95) 100%);
          z-index: -1;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 71, 224, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
