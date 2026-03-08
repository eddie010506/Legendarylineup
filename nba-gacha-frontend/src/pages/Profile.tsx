import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Trophy, Swords, LogOut, History, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Profile.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [lineupStats, setLineupStats] = useState({ high: 0, games: 0 });
  const [battleStats, setBattleStats] = useState({ wins: 0, games: 0, rank: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      setUser(session.user);

      // 1. Fetch Profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      setProfile(prof);

      // 2. Fetch Lineup High Score
      const { data: scores } = await supabase.from('scores').select('score').eq('user_id', session.user.id);
      if (scores && scores.length > 0) {
        setLineupStats({
          high: Math.max(...scores.map(s => s.score)),
          games: scores.length
        });
      }

      // 3. Fetch Battle Stats
      const { data: bStats } = await supabase.rpc('get_user_battle_stats', { p_user_id: session.user.id });
      if (bStats && bStats[0]) {
        setBattleStats({
          wins: Number(bStats[0].wins),
          games: Number(bStats[0].games),
          rank: Number(bStats[0].rank)
        });
      }
      setLoading(false);
    };

    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div className="profile-loading">LOADING LEGEND...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header-nav">
        <button onClick={() => navigate(-1)} className="back-btn-profile">
          <ArrowLeft size={20} /> Back
        </button>
        <h1>LEGENDARY PROFILE</h1>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="profile-main-card">
        <div className="profile-user-info">
          <UserCircle size={80} color="#818cf8" />
          <div className="profile-titles">
            <h2>{profile?.nickname || 'Rookie Player'}</h2>
            <p>Member since {new Date(profile?.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="game-stats-grid">
          {/* Legendary Lineup Stats */}
          <div className="game-stat-card lineup-card">
            <div className="stat-icon-wrapper"><Trophy size={24} color="#fbbf24" /></div>
            <h3>Legendary Lineup</h3>
            <div className="stat-numbers">
              <div className="stat-sub">
                <span>High Score</span>
                <strong>{lineupStats.high}</strong>
              </div>
              <div className="stat-sub">
                <span>Games</span>
                <strong>{lineupStats.games}</strong>
              </div>
            </div>
            <Link to="/lineup" className="play-btn-mini">PLAY LINEUP</Link>
          </div>

          {/* NBA Battle Stats */}
          <div className="game-stat-card battle-card">
            <div className="stat-icon-wrapper"><Swords size={24} color="#ef4444" /></div>
            <h3>NBA Battle</h3>
            <div className="stat-numbers">
              <div className="stat-sub">
                <span>Win Rate</span>
                <strong>{battleStats.games ? ((battleStats.wins/battleStats.games)*100).toFixed(1) : 0}%</strong>
              </div>
              <div className="stat-sub">
                <span>Rank</span>
                <strong>#{battleStats.rank || '-'}</strong>
              </div>
            </div>
            <Link to="/battle" className="play-btn-mini">PLAY BATTLE</Link>
          </div>
        </div>

        <div className="achievement-banner">
          <ShieldCheck size={20} />
          <span>All records are automatically saved to your account.</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
