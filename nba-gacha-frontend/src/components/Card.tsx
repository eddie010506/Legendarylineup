import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
  const getGradeClass = (g: string) => `grade-${g.toLowerCase().replace(' ', '-')}`;
  
  const getRevealAnimation = (grade: string) => {
    const g = grade.toLowerCase();
    if (g === 'legendary') return { rotateY: 180, scale: [1, 1.2, 1], transition: { duration: 0.8 } };
    if (g === 'super rare' || g === 'epic') return { rotateY: 180, y: [0, -20, 0], transition: { duration: 0.6 } };
    return { rotateY: 180, transition: { duration: 0.4 } };
  };

  return (
    <div className={`card-wrapper ${isSelected ? 'selected-card' : ''}`} 
         style={isSmall ? { transform: 'scale(1.05)', width: '130px', height: '190px' } : {}}
         onClick={(e) => { e.stopPropagation(); isRevealed ? onSelect?.() : onReveal(); }}>
      <motion.div className="card-inner" initial={false} animate={isRevealed ? getRevealAnimation(player.Grade) : { rotateY: 0 }} style={{ transformStyle: 'preserve-3d' }}>
        <div className={`card-face card-front ${getGradeClass(player.Grade)}`}>
          <div className="card-name">{player.Player}</div>
          <div className="card-pos">{player.Pos}</div>
          <div className="card-center-info">
            <div className="card-season-center">{player.Season}</div>
            <div className="card-advanced-stats"><span>WS: {player.WS}</span><span>PER: {player.PER}</span></div>
          </div>
          <div className="card-stats">
            <div>PTS: {player.PTS} | TRB: {player.TRB}</div>
            <div>AST: {player.AST} | STL: {player.STL}</div>
            <div>BLK: {player.BLK}</div>
          </div>
          <div className="card-score-footer">Score: {player.Score.toFixed(1)}</div>
        </div>
        <div className="card-face card-back"><Sparkles size={isSmall ? 20 : 40} /></div>
      </motion.div>
    </div>
  );
};

export default Card;
