import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Shield, RotateCcw, Home as HomeIcon, Medal, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useBattleEngine } from '../../hooks/useBattleEngine';
import Card from '../../components/Card';
import './NbaBattle.css';

const NbaBattle: React.FC = () => {
  const {
    playerHand, cpuHand, playerWins, cpuWins, battleStatus, 
    currentMatchup, winner, gameWinner, playerChampions, cpuChampions,
    selectedCardIndex, setSelectedCardIndex, globalStats, battleLeaderboard,
    startNewGame, executeBattle, fetchLeaderboard
  } = useBattleEngine();

  const [view, setView] = useState<'game' | 'leaderboard'>('game');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [tempNickname, setNickname] = useState('');
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startNewGame();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthMode(null);
        setAuthMessage(null);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      setProfile(data);
    } else {
      setShowNicknamePrompt(true);
    }
  };

  const saveNickname = async () => {
    if (tempNickname.length < 2) return alert("Nickname too short!");
    const { error } = await supabase.from('profiles').insert([{ id: user.id, nickname: tempNickname }]);
    if (error) return alert("Nickname taken or error: " + error.message);
    setProfile({ id: user.id, nickname: tempNickname });
    setShowNicknamePrompt(false);
  };

  const handleAuth = async () => {
    setAuthMessage(null);
    if (authMode === 'signup' && tempNickname.length < 2) {
      return alert("Nickname is too short!");
    }

    const { data, error } = authMode === 'login' 
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPass })
      : await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPass,
          options: { data: { nickname: tempNickname } }
        });

    if (error) {
      alert(error.message);
    } else if (authMode === 'signup' && data.user && !data.session) {
      setAuthMessage("Success! Please check your email to confirm your account.");
    }
  };

  const toggleLeaderboard = () => {
    if (view === 'game') {
      fetchLeaderboard();
      setView('leaderboard');
    } else {
      setView('game');
    }
  };

  const handleBattle = () => {
    if (selectedCardIndex !== null) {
      executeBattle(selectedCardIndex);
      setSelectedCardIndex(null);
    }
  };

  return (
    <div className="battle-container">
      <div className="battle-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/" className="nav-btn" title="Back to Hub"><HomeIcon size={18} /></Link>
          <button className="nav-btn" onClick={toggleLeaderboard}>
            {view === 'game' ? <><Medal size={18} /> Rankings</> : "Back to Game"}
          </button>
          {user ? (
            <Link to="/profile" className="nav-btn" style={{ background: 'rgba(79, 70, 229, 0.2)' }}>
              <UserCircle size={18} /> {profile?.nickname || 'Profile'}
            </Link>
          ) : (
            <>
              <button className="nav-btn" onClick={() => setAuthMode('login')}>Login</button>
              <button className="nav-btn highlight" onClick={() => setAuthMode('signup')}>Sign Up</button>
            </>
          )}
        </div>
        
        <div className="compact-scoreboard">
          <div className="scoreboard-side">
            <span className="side-name">PLAYER</span>
            <div className="win-dots">
              {[...Array(3)].map((_, i) => <div key={i} className={`dot ${i < playerWins ? 'filled player' : ''}`} />)}
            </div>
          </div>
          <div className="score-vs-small">VS</div>
          <div className="scoreboard-side">
            <div className="win-dots">
              {[...Array(3)].map((_, i) => <div key={i} className={`dot ${i < cpuWins ? 'filled cpu' : ''}`} />)}
            </div>
            <span className="side-name">CPU</span>
          </div>
        </div>

        <Link to="/lineup" className="nav-btn lineup-nav-btn">Legendary Lineup</Link>
      </div>

      <AnimatePresence>
        {showNicknamePrompt && (
          <div className="nickname-prompt-overlay">
            <div className="nickname-card">
              <h2>One Last Step!</h2>
              <p>Choose a legendary nickname for your profile.</p>
              <input type="text" maxLength={15} value={tempNickname} onChange={e => setNickname(e.target.value)} placeholder="Enter Nickname" />
              <button className="draw-btn" onClick={saveNickname}>Start Playing</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="auth-overlay">
            <div className="auth-card">
              <h2>{authMode === 'login' ? "Welcome Back" : "Join the Legends"}</h2>
              <p>{authMode === 'login' ? "Login to save your battle records" : "Sign up to track your global ranking!"}</p>
              
              {authMessage ? (
                <div className="auth-success-message" style={{ color: '#22c55e', textAlign: 'center', padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '0.5rem' }}>
                  {authMessage}
                </div>
              ) : (
                <>
                  {authMode === 'signup' && (
                    <input type="text" placeholder="Legendary Nickname" value={tempNickname} onChange={e => setNickname(e.target.value)} />
                  )}
                  <input type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                  <input type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} />
                  <div className="auth-btns">
                    <button onClick={handleAuth}>{authMode === 'login' ? "Login" : "Create Account"}</button>
                  </div>
                </>
              )}

              <div className="auth-toggle-text">
                {authMode === 'login' ? "Don't have an account?" : "Already a member?"}
                <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthMessage(null); }}>
                  {authMode === 'login' ? "Sign Up" : "Login"}
                </button>
              </div>
              <button className="close-btn" onClick={() => { setAuthMode(null); setAuthMessage(null); }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'leaderboard' ? (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="battle-leaderboard-view"
          >
            <h2>GLOBAL BATTLE RANKINGS</h2>
            <div className="battle-leaderboard-list">
              <div className="bl-row header">
                <span>Rank</span><span>Player</span><span>Wins</span><span>Win Rate</span>
              </div>
              {battleLeaderboard.map((entry, i) => (
                <div key={i} className="bl-row">
                  <span className="bl-rank">#{i + 1}</span>
                  <span className="bl-name">{entry.nickname}</span>
                  <span className="bl-wins">{entry.wins}</span>
                  <span className="bl-rate">{entry.win_rate}%</span>
                </div>
              ))}
            </div>
            <button className="draw-btn secondary" style={{ maxWidth: '200px', margin: '2rem auto' }} onClick={() => setView('game')}>Return to Battle</button>
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="battle-layout"
          >
            <div className="trophy-sidebar cpu-champions-sidebar">
              <div className="sidebar-label">CPU CHAMPIONS</div>
              <div className="trophy-box">
                {cpuChampions.map((p, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="stacked-trophy">
                    <Card player={p} isRevealed={true} onReveal={() => {}} />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="battle-main-field">
              <div className="battle-arena">
                <div className="cpu-field-top">
                  <div className="hand-preview cpu-hand-standard">
                    {cpuHand.map((_, i) => (
                      <motion.div key={i} layout className="card-back-standard">
                        <div className="card-inner">
                          <div className="card-face card-back"><Shield size={40} /></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="central-battle-zone">
                  <AnimatePresence mode="wait">
                    {currentMatchup ? (
                      <motion.div key="matchup" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="matchup-arena">
                        <div className={`battle-card-slot cpu-slot ${winner === 'cpu' ? 'winner' : winner === 'player' ? 'loser' : ''}`}>
                          <Card player={currentMatchup.cpu} isRevealed={true} onReveal={() => {}} />
                        </div>
                        <div className="vs-sign active"><Swords size={48} /></div>
                        <div className={`battle-card-slot player-slot ${winner === 'player' ? 'winner' : winner === 'cpu' ? 'loser' : ''}`}>
                          <Card player={currentMatchup.player} isRevealed={true} onReveal={() => {}} />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="duel-staging-arena">
                        <div className="battle-rule-hint top">
                          1. Higher Grade Wins: LEGENDARY &gt; EPIC &gt; SUPER RARE &gt; RARE &gt; COMMON
                        </div>

                        <div className="duel-box-wrapper">
                          <div className="duel-slot cpu-hidden-slot">
                            <div className="card-inner">
                              <div className="card-face card-back hidden-question">
                                <span>?</span>
                              </div>
                            </div>
                            <div className="duel-label">CPU CHOICE</div>
                          </div>

                          <div className="vs-sign-static">VS</div>

                          <div 
                            ref={slotRef}
                            className={`duel-slot player-staging-slot ${selectedCardIndex !== null ? 'has-card' : ''}`}
                          >
                            {selectedCardIndex !== null ? (
                              <div className="staged-card" onDoubleClick={() => setSelectedCardIndex(null)}>
                                <Card player={playerHand[selectedCardIndex]} isRevealed={true} onReveal={() => {}} />
                              </div>
                            ) : (
                              <div className="slot-placeholder-text">DROP CARD</div>
                            )}
                            <div className="duel-label">YOUR CARD</div>
                          </div>
                        </div>

                        <div className="battle-rule-hint bottom">
                          2. Tie Breaker: Card with the Higher Score wins the round
                        </div>
                        
                        {selectedCardIndex !== null && battleStatus === 'playing' && (
                          <motion.button 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="confirm-battle-btn"
                            onClick={handleBattle}
                          >
                            BATTLE
                          </motion.button>
                        )}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="player-field-bottom">
                  <div className="player-hand-grid">
                    {playerHand.map((p, i) => (
                      selectedCardIndex === i ? <div key={p.id} className="placeholder-card" /> : (
                        <motion.div
                          key={p.id}
                          layoutId={p.id}
                          drag={battleStatus === 'playing'}
                          dragSnapToOrigin
                          onDragEnd={(_, info) => {
                            if (!slotRef.current) return;
                            const rect = slotRef.current.getBoundingClientRect();
                            if (info.point.x > rect.left && info.point.x < rect.right && info.point.y > rect.top && info.point.y < rect.bottom) {
                              setSelectedCardIndex(i);
                            }
                          }}
                          onDoubleClick={() => setSelectedCardIndex(i)}
                          className="hand-card-wrapper"
                        >
                          <Card player={p} isRevealed={true} onReveal={() => {}} isSmall={true} />
                        </motion.div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="trophy-sidebar player-champions-sidebar">
              <div className="sidebar-label">PLAYER CHAMPIONS</div>
              <div className="trophy-box">
                {playerChampions.map((p, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="stacked-trophy">
                    <Card player={p} isRevealed={true} onReveal={() => {}} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameWinner && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="finish-overlay-anchored"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="finish-modal battle-result-modal"
            >
              {gameWinner === 'player' ? (
                <>
                  <Trophy size={64} color="#fbbf24" style={{ margin: '0 auto' }} />
                  <h2 className="result-title winner">VICTORY!</h2>
                </>
              ) : (
                <>
                  <Swords size={64} color="#ef4444" style={{ margin: '0 auto' }} />
                  <h2 className="result-title loser">DEFEAT</h2>
                </>
              )}
              
              <div className="battle-stats-summary">
                <div className="stat-item">
                  <span className="stat-label">Season Wins</span>
                  <span className="stat-value">{globalStats?.wins || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Global Rank</span>
                  <span className="stat-value">#{globalStats?.rank || '-'}</span>
                </div>
                <div className="stat-item full-width">
                  <span className="stat-label">All-Time Win Rate</span>
                  <span className="stat-value">
                    {globalStats?.games 
                      ? ((globalStats.wins / globalStats.games) * 100).toFixed(1) 
                      : '0.0'}%
                  </span>
                </div>
              </div>

              {!user && (
                <p className="guest-tip" style={{ fontSize: '0.8rem', color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  💡 <strong>Tip:</strong> Log in or Sign up to save your win rate and climb the global rankings!
                </p>
              )}

              <div className="result-actions">
                <button className="draw-btn" onClick={startNewGame}>
                  <RotateCcw size={20} /> PLAY AGAIN
                </button>
                <Link to="/" className="draw-btn secondary">BACK TO HUB</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NbaBattle;
