import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BarChart3 } from 'lucide-react';
import type { Player } from '../gameTypes';

interface CardProps {
  player: Player;
  isRevealed: boolean;
  onReveal: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isSmall?: boolean;
}

const Card: React.FC<CardProps> = ({ player, isRevealed, onReveal, isSelected, onSelect, isSmall = false }) => {
  const [showStats, setShowStats] = useState(false);
  const getGradeClass = (g: string) => `grade-${g.toLowerCase().replace(' ', '-')}`;

  const handleInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRevealed) {
      onReveal();
    } else if (window.innerWidth <= 768) {
      setShowStats(!showStats);
    } else {
      onSelect?.();
    }
  };

  const getRevealAnimation = (grade: string) => {
    const g = grade.toLowerCase();
    if (g === 'legendary') return { rotateY: 180, scale: [1, 1.2, 1], transition: { duration: 0.8 } };
    if (g === 'super rare' || g === 'epic') return { rotateY: 180, y: [0, -20, 0], transition: { duration: 0.6 } };
    return { rotateY: 180, transition: { duration: 0.4 } };
  };

  return (
    <div className={`card-wrapper ${isSelected ? 'selected-card' : ''}`} 
         style={isSmall ? { transform: 'scale(1.05)', width: '130px', height: '190px' } : {}}
         onClick={handleInteraction}>
      <motion.div className="card-inner" initial={false} animate={isRevealed ? getRevealAnimation(player.Grade) : { rotateY: 0 }} style={{ transformStyle: 'preserve-3d' }}>
        
        <div className={`card-face card-front ${getGradeClass(player.Grade)}`}>
          <AnimatePresence mode="wait">
            {(!showStats || window.innerWidth > 768) ? (
              <motion.div key="main-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-content-layer" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
                <div className="card-name">{player.Player}</div>
                <div className="card-pos">{player.Pos}</div>
                <div className="card-center-info">
                  <div className="card-season-center">{player.Season}</div>
                  {window.innerWidth > 768 && (
                    <div className="card-advanced-stats"><span>WS: {player.WS}</span><span>PER: {player.PER}</span></div>
                  )}
                </div>
                {window.innerWidth > 768 && (
                  <div className="card-stats">
                    <div>PTS: {player.PTS} | TRB: {player.TRB}</div>
                    <div>AST: {player.AST} | STL: {player.STL}</div>
                    <div>BLK: {player.BLK}</div>
                  </div>
                )}
                <div className="card-score-footer">Score: {player.Score.toFixed(1)}</div>
                {window.innerWidth <= 768 && <div className="mobile-stats-hint"><BarChart3 size={10} style={{ verticalAlign: 'middle' }} /> Stats</div>}
              </motion.div>
            ) : (
              <motion.div key="stats-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-content-layer stats-layer" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', gap: '8px' }}>
                <div className="card-stats" style={{ background: 'rgba(0,0,0,0.5)', padding: '8px 4px' }}>
                  <div style={{ fontSize: '0.65rem' }}>PTS: {player.PTS} | TRB: {player.TRB}</div>
                  <div style={{ fontSize: '0.65rem' }}>AST: {player.AST} | STL: {player.STL}</div>
                  <div style={{ fontSize: '0.65rem' }}>BLK: {player.BLK}</div>
                </div>
                <div className="card-advanced-stats" style={{ fontSize: '0.6rem', justifyContent: 'center' }}>
                  <span>WS: {player.WS}</span>
                  <span>PER: {player.PER}</span>
                </div>
                <div className="mobile-stats-hint" style={{ fontSize: '0.5rem', opacity: 0.5, textAlign: 'center' }}>Tap to close</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="card-face card-back"><Sparkles size={isSmall ? 20 : 40} /></div>
      </motion.div>
    </div>
  );
};

export default Card;
