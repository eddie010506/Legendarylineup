import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Medal, LogOut, ShieldCheck, UserCircle, History } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useGameEngine } from './hooks/useGameEngine';
import Card from './components/Card';
import { SLOTS } from './gameTypes';
import type { LeaderboardEntry } from './gameTypes';
import './App.css';

function App() {
  // 1. Auth & Profile State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userHistory, setUserHistory] = useState<LeaderboardEntry[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [tempNickname, setNickname] = useState('');
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);

  // 2. UI View State
  const [view, setView] = useState<'game' | 'leaderboard' | 'profile'>('game');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [initials, setInitials] = useState('');

  // 3. Game Engine (Custom Hook)
  const {
    hand, revealedIndices, slots, selectedIndex, gameStatus, scoreSubmitted,
    currentRank, layoutSize, slotRefs, totalScoresCount,
    setSelectedIndex, setRevealedIndices, setTotalScoresCount,
    dealHand, placeCard, removeCard, calculateTotal, submitScore
  } = useGameEngine(user, profile, () => fetchLeaderboard(), (uid) => fetchUserHistory(uid));

  useEffect(() => {
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
    fetchLeaderboard();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setProfile(data);
      fetchUserHistory(uid);
    } else {
      setShowNicknamePrompt(true);
    }
  };

  const fetchUserHistory = async (uid: string) => {
    const { data } = await supabase.from('scores').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (data) setUserHistory(data);
  };

  const fetchLeaderboard = async () => {
    const { data, count } = await supabase.from('scores').select('*', { count: 'exact' }).order('score', { ascending: false }).limit(10);
    if (data) setLeaderboard(data);
    if (count !== null) setTotalScoresCount(count);
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
          options: {
            data: { nickname: tempNickname }
          }
        });

    if (error) {
      alert(error.message);
    } else if (authMode === 'signup' && data.user && !data.session) {
      setAuthMessage("Success! Please check your email to confirm your account.");
    }
  };

  const getHighScore = () => {
    if (userHistory.length === 0) return 0;
    return Math.max(...userHistory.map(h => h.score));
  };

  return (
    <div className="game-container">
      <div className="top-nav">
        <h1 onClick={() => setView('game')} style={{ cursor: 'pointer' }}>LEGENDARY LINEUP</h1>
        <div className="nav-actions">
          <button className="nav-btn" onClick={() => setView('leaderboard')}>
            <Medal size={18} /> Leaderboard
          </button>
          {user ? (
            <div className="user-info-chip" onClick={() => setView('profile')}>
              <UserCircle size={20} /> {profile?.nickname || 'Set Nickname'}
            </div>
          ) : (
            <>
              <button className="nav-btn" onClick={() => setAuthMode('login')}>Login</button>
              <button className="nav-btn highlight" onClick={() => setAuthMode('signup')}>Sign Up</button>
            </>
          )}
        </div>
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
              <p>{authMode === 'login' ? "Login to save your high scores" : "Sign up to draw 10 cards instead of 7!"}</p>
              
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
          <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="leaderboard-view">
            <h2>GLOBAL RANKINGS</h2>
            <div className="leaderboard-list">
              <div className="leaderboard-row header"><span>Rank</span><span>Name</span><span>Score</span><span>Date</span></div>
              {leaderboard.map((e, i) => (
                <div key={e.id} className="leaderboard-row">
                  <span className="rank-num">#{i+1}</span>
                  <span className="initials">{e.initials}</span>
                  <div className="score-cell-wrapper">
                    <span className="score">{e.score}</span>
                    {e.roster && (
                      <div className="lineup-tooltip">
                        <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Lineup Info</div>
                        <div className="tooltip-grid">
                          {e.roster.map((p, idx) => (
                            <div key={idx} className={`tooltip-item grade-${p.grade.toLowerCase().replace(' ', '-')}`}>
                              <span className="p-name">{p.name}</span>
                              <span className="p-grade">{p.grade}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="date">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            <button className="draw-btn secondary" style={{ maxWidth: '200px', margin: '2rem auto' }} onClick={() => setView('game')}>Back to Game</button>
          </motion.div>
        ) : view === 'profile' ? (
          <motion.div key="profile" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="profile-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{profile?.nickname}'s Profile</h2>
                <p style={{ opacity: 0.5, margin: '4px 0' }}>Member since {new Date(profile?.created_at).toLocaleDateString()}</p>
              </div>
              <button className="nav-btn" onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Logout</button>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <h4>High Score</h4>
                <div>{getHighScore()}</div>
              </div>
              <div className="stat-card">
                <h4>Games Played</h4>
                <div>{userHistory.length}</div>
              </div>
            </div>

            <h3><History size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Recent Lineups</h3>
            <div className="history-list">
              {userHistory.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-score">{h.score} pts</div>
                  <div className="history-date">{new Date(h.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            <button className="draw-btn secondary" style={{ maxWidth: '200px', margin: '2rem auto' }} onClick={() => setView('game')}>Back to Game</button>
          </motion.div>
        ) : (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="slots-grid">
              {SLOTS.map(slot => {
                const cp = slots[slot];
                const isEx = cp && slot !== "Joker" && cp.Pos.split('-').includes(slot);
                return (
                  <div key={slot} ref={el => { slotRefs.current[slot] = el; }} className={`slot ${selectedIndex !== null && !cp ? 'active' : ''}`}
                       onClick={() => cp ? removeCard(slot) : (selectedIndex !== null && placeCard(slot))}>
                    <div className="slot-label">{slot}</div>
                    {cp && (
                      <div style={{ position: 'relative', pointerEvents: 'none' }}>
                        {isEx && <div className="bonus-indicator" style={{ pointerEvents: 'auto' }}>+5 Bonus</div>}
                        <Card player={cp} isRevealed={true} onReveal={() => {}} isSmall={true} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rules-container">
              <div className="rules-banner">
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#818cf8', letterSpacing: '0.1em' }}>HOW TO PLAY</h3>
                <ul className="rules-list">
                  <li>1. Pull cards and reveal to see your deck.</li>
                  <li>2. You can place the cards on the exact position or adjacent position.</li>
                  <li>3. If the card is on the exact position, a bonus 5 points will be applied.</li>
                  <li>4. Now make your perfect lineup!</li>
                </ul>
              </div>
              <div className="perks-banner">
                <h4>Member Perk</h4>
                <p>Sign up now to draw <strong>10 cards</strong> per game!</p>
                {user ? (
                  <div className="member-active-status"><ShieldCheck size={14} style={{ verticalAlign: 'middle' }} /> Active</div>
                ) : (
                  <button className="nav-btn highlight" style={{ padding: '4px 12px', fontSize: '0.75rem', marginTop: '8px' }} onClick={() => setAuthMode('signup')}>Unlock</button>
                )}
              </div>
            </div>

            <div className="deck-area">
              {(gameStatus === 'idle' || gameStatus === 'finished') && <button className="draw-btn" style={{ marginBottom: '1rem' }} onClick={dealHand}>Draw {user ? 10 : 7} Cards</button>}
              <div className={`hand-container layout-${layoutSize}`}>
                <AnimatePresence>
                  {hand.map((p, idx) => (
                    <motion.div key={`${p.Player}-${p.Season}`} layout initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }}
                                drag={revealedIndices.has(idx)} dragSnapToOrigin whileDrag={{ scale: 1.1, zIndex: 1000 }}
                                onDrag={(e) => {
                                  // Auto-scroll logic
                                  const y = (e as any).clientY || (e as any).touches?.[0]?.clientY;
                                  if (!y) return;
                                  
                                  const threshold = 100; // px from edge
                                  if (y < threshold) {
                                    window.scrollBy({ top: -15, behavior: 'auto' });
                                  } else if (y > window.innerHeight - threshold) {
                                    window.scrollBy({ top: 15, behavior: 'auto' });
                                  }
                                }}
                                onDragEnd={(e, _i) => {
                                  // Use clientX and clientY for more reliable screen coordinates
                                  const point = (e as any).clientX !== undefined ? { x: (e as any).clientX, y: (e as any).clientY } : (e as any).changedTouches?.[0];
                                  if (!point) return;

                                  const { x, y } = point;
                                  for (const s of SLOTS) {
                                    const el = slotRefs.current[s];
                                    if (el) {
                                      const r = el.getBoundingClientRect();
                                      // Add a small buffer (5px) to make it feel better
                                      if (x >= r.left - 5 && x <= r.right + 5 && y >= r.top - 5 && y <= r.bottom + 5) {
                                        return placeCard(s, idx);
                                      }
                                    }
                                  }
                                }}
                                style={{ cursor: revealedIndices.has(idx) ? 'grab' : 'pointer' }}>
                      <Card player={p} isRevealed={revealedIndices.has(idx)} onReveal={() => {
                        const next = new Set(revealedIndices); next.add(idx); setRevealedIndices(next);
                      }} isSelected={selectedIndex === idx} onSelect={() => setSelectedIndex(selectedIndex === idx ? null : idx)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {gameStatus === 'finished' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="finish-modal">
                <Trophy size={48} color="#f59e0b" style={{ margin: '0 auto' }} />
                <h2>Final Score: {calculateTotal()}</h2>
                {!scoreSubmitted ? (
                  user ? (
                    <div style={{ margin: '1rem 0' }}>Submitting record for <strong>{profile?.nickname}</strong>...</div>
                  ) : (
                    <div className="submit-box">
                      <input type="text" maxLength={3} value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} placeholder="INI" />
                      <button className="draw-btn" onClick={() => submitScore(initials)} disabled={initials.length !== 3}>Submit Score</button>
                    </div>
                  )
                ) : (
                  <div className="rank-reveal">
                    <div className="rank-stat">Rank: <strong>#{currentRank}</strong> of {totalScoresCount}</div>
                    <div className="rank-stat">Percentile: <strong>{((currentRank! / totalScoresCount) * 100).toFixed(1)}%</strong></div>
                  </div>
                )}
                <button className="draw-btn secondary" onClick={dealHand}><RotateCcw size={16} /> New Game</button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
