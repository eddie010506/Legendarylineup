import { useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Player } from '../gameTypes';

export type BattleGrade = "Legendary" | "Epic" | "Super Rare" | "Rare" | "Common";

const GRADE_WEIGHTS: Record<string, number> = {
  "Legendary": 5,
  "Epic": 4,
  "Super Rare": 3,
  "Rare": 2,
  "Common": 1
};

export const useBattleEngine = () => {
  const [playerHand, setPlayerHand] = useState<Player[]>([]);
  const [cpuHand, setCpuHand] = useState<Player[]>([]);
  const [playerWins, setPlayerWins] = useState(0);
  const [cpuWins, setCpuWins] = useState(0);
  const [battleStatus, setBattleStatus] = useState<'idle' | 'playing' | 'result' | 'finished'>('idle');
  const [currentMatchup, setCurrentMatchup] = useState<{ player: Player; cpu: Player } | null>(null);
  const [winner, setWinner] = useState<'player' | 'cpu' | 'draw' | null>(null);
  const [gameWinner, setGameWinner] = useState<'player' | 'cpu' | null>(null);
  const [playerChampions, setPlayerChampions] = useState<Player[]>([]);
  const [cpuChampions, setCpuChampions] = useState<Player[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [globalStats, setGlobalStats] = useState<{ wins: number; games: number; rank: number } | null>(null);
  const [battleLeaderboard, setBattleLeaderboard] = useState<any[]>([]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase.rpc('get_battle_leaderboard');
    if (data) setBattleLeaderboard(data);
  };

  const startNewGame = async () => {
    setBattleStatus('idle');
    setPlayerWins(0);
    setCpuWins(0);
    setPlayerChampions([]);
    setCpuChampions([]);
    setGameWinner(null);
    setCurrentMatchup(null);
    setWinner(null);
    setSelectedCardIndex(null);

    // Fetch initial global stats
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.rpc('get_user_battle_stats', { p_user_id: session.user.id });
      if (data && data[0]) {
        setGlobalStats({ 
          wins: Number(data[0].wins), 
          games: Number(data[0].games), 
          rank: Number(data[0].rank) 
        });
      }
    }

    console.log("Fetching battle hands...");
    const { data, error } = await supabase.rpc('draw_battle_hands'); 
    
    if (error) {
      console.error("RPC Error:", error);
      alert("Database error: " + error.message);
      return;
    }

    if (data && data.player_hand && data.cpu_hand) {
      console.log("Hands loaded successfully:", data);
      setPlayerHand(data.player_hand);
      setCpuHand(data.cpu_hand);
      setBattleStatus('playing');
    } else {
      console.error("Unexpected data format from RPC:", data);
      alert("Failed to load cards. Please check your console for details.");
    }
  };

  const executeBattle = (playerCardIndex: number) => {
    if (battleStatus !== 'playing') return;

    const pCard = playerHand[playerCardIndex];
    const cpuCardIndex = Math.floor(Math.random() * cpuHand.length);
    const cCard = cpuHand[cpuCardIndex];

    setCurrentMatchup({ player: pCard, cpu: cCard });

    const pWeight = GRADE_WEIGHTS[pCard.Grade] || 0;
    const cWeight = GRADE_WEIGHTS[cCard.Grade] || 0;

    let roundWinner: 'player' | 'cpu' | 'draw' = 'draw';
    if (pWeight > cWeight) {
      roundWinner = 'player';
    } else if (cWeight > pWeight) {
      roundWinner = 'cpu';
    } else {
      // Tie-breaker: Score
      if (pCard.Score > cCard.Score) roundWinner = 'player';
      else if (cCard.Score > pCard.Score) roundWinner = 'cpu';
    }

    setWinner(roundWinner);
    setBattleStatus('result');

    // Remove the cards (Burn logic)
    setTimeout(async () => {
      let currentPWin = playerWins;
      let currentCWin = cpuWins;

      if (roundWinner === 'player') {
        currentPWin += 1;
        setPlayerWins(currentPWin);
        setPlayerChampions(prev => [...prev, pCard]);
      } else if (roundWinner === 'cpu') {
        currentCWin += 1;
        setCpuWins(currentCWin);
        setCpuChampions(prev => [...prev, cCard]);
      }

      setPlayerHand(prev => prev.filter((_, i) => i !== playerCardIndex));
      setCpuHand(prev => {
        const newCpu = [...prev];
        newCpu.splice(cpuCardIndex, 1);
        return newCpu;
      });
      
      if (currentPWin >= 3) {
        setGameWinner('player');
        setBattleStatus('finished');
        await updateGlobalStats(true);
      } else if (currentCWin >= 3) {
        setGameWinner('cpu');
        setBattleStatus('finished');
        await updateGlobalStats(false);
      } else {
        setBattleStatus('playing');
        setWinner(null);
        setCurrentMatchup(null);
      }
    }, 2500); // Wait for animation
  };

  const updateGlobalStats = async (won: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Log the match
    await supabase.from('battle_logs').insert([{
      user_id: session.user.id,
      winner: won ? 'player' : 'cpu',
      player_score: playerWins,
      cpu_score: cpuWins
    }]);

    // 2. Get updated ranking/stats
    const { data } = await supabase.rpc('get_user_battle_stats', {
      p_user_id: session.user.id
    });

    if (data && data[0]) {
      setGlobalStats({
        wins: Number(data[0].wins),
        games: Number(data[0].games),
        rank: Number(data[0].rank)
      });
    }
  };

  return {
    playerHand, cpuHand, playerWins, cpuWins, battleStatus, 
    currentMatchup, winner, gameWinner, playerChampions, cpuChampions,
    selectedCardIndex, setSelectedCardIndex, globalStats, battleLeaderboard,
    startNewGame, executeBattle, fetchLeaderboard
  };
};
