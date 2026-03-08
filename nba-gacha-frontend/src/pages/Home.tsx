import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Swords, Zap, Users } from 'lucide-react';
import './Home.css';

const Home: React.FC = () => {
  const games = [
    {
      title: "LEGENDARY LINEUP",
      path: "/lineup",
      icon: <Trophy size={48} color="#fbbf24" />,
      description: "Draw cards, build your dream team, and climb the leaderboard.",
      color: "rgba(79, 70, 229, 0.2)",
      borderColor: "#4f46e5",
      accent: <Zap size={20} color="#fbbf24" />
    },
    {
      title: "NBA BATTLE",
      path: "/battle",
      icon: <Swords size={48} color="#ef4444" />,
      description: "Coming Soon: Competitive battles with your legendary cards.",
      color: "rgba(239, 68, 68, 0.1)",
      borderColor: "#ef4444",
      accent: <Users size={20} color="#ef4444" />
    }
  ];

  return (
    <div className="home-container">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="home-header"
      >
        <h1>NBA LEGENDS HUB</h1>
        <p>Choose Your Game Mode</p>
      </motion.header>

      <div className="game-selection-grid">
        {games.map((game, index) => (
          <motion.div
            key={game.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={game.path} className="game-card-link">
              <div 
                className="game-card" 
                style={{ 
                  backgroundColor: game.color,
                  borderColor: game.borderColor 
                }}
              >
                <div className="game-card-icon">{game.icon}</div>
                <div className="game-card-content">
                  <div className="game-card-title-row">
                    <h2>{game.title}</h2>
                    {game.accent}
                  </div>
                  <p>{game.description}</p>
                </div>
                <div className="game-card-footer">
                  <span>PLAY NOW</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Home;
