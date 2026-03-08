import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SLOT_RULES } from '../gameTypes';
import type { Player, SlotMap, SlotName } from '../gameTypes';

export const useGameEngine = (user: any, profile: any, fetchLeaderboard: () => void) => {
  const [hand, setHand] = useState<Player[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [slots, setSlots] = useState<SlotMap>({ PG: null, SG: null, SF: null, PF: null, C: null, Joker: null });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [layoutSize, setLayoutSize] = useState<number>(7);
  const [totalScoresCount, setTotalScoresCount] = useState(0);
  
  const slotRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const dealHand = async () => {
    const rosterSize = user ? 10 : 7;
    setLayoutSize(rosterSize);
    
    const { data, error } = await supabase.rpc('draw_player_hand', { roster_size: rosterSize });
    
    if (error || !data) {
      console.error("Error drawing hand:", error);
      alert("Failed to deal hand. Please check your connection.");
      return;
    }

    setHand(data as Player[]);
    setRevealedIndices(new Set());
    setSelectedIndex(null);
    setSlots({ PG: null, SG: null, SF: null, PF: null, C: null, Joker: null });
    setGameStatus('playing');
    setScoreSubmitted(false);
  };

  const calculateTotal = (currentSlots?: SlotMap) => {
    let t = 0;
    const slotsToUse = currentSlots || slots;
    Object.entries(slotsToUse).forEach(([s, p]) => {
      if (!p) return; t += p.Score;
      if (s !== "Joker" && p.Pos.split('-').includes(s)) t += 5;
    });
    return parseFloat(t.toFixed(1));
  };

  const submitScore = async (initials: string, finalSlots?: SlotMap) => {
    const slotsToProcess = finalSlots || slots;
    const slotPayload: { [key: string]: string } = {};
    Object.entries(slotsToProcess).forEach(([slot, player]) => {
      if (player) slotPayload[slot] = player.id;
    });

    const { data, error } = await supabase.rpc('submit_final_score', {
      p_initials: initials.toUpperCase(),
      p_user_id: user?.id || null,
      p_slots: slotPayload
    });

    if (error || !data || (data as any).length === 0) {
      alert(`Submission failed: ${error?.message || "Unknown error"}`);
      return;
    }

    const { new_rank } = (data as any)[0];
    setCurrentRank(new_rank);
    setScoreSubmitted(true);
    fetchLeaderboard();
  };

  const placeCard = (slotName: SlotName, idx?: number) => {
    const cardIdx = idx !== undefined ? idx : selectedIndex;
    if (cardIdx === null) return;
    const player = hand[cardIdx];
    if (!player || slots[slotName]) return;
    
    const isValid = slotName === "Joker" || player.Pos.split('-').some(p => SLOT_RULES[slotName].includes(p));
    if (!isValid) return alert(`Invalid! ${slotName} accepts: ${SLOT_RULES[slotName].join(', ')}`);
    
    const newSlots = { ...slots, [slotName]: player };
    setSlots(newSlots);
    const newHand = [...hand];
    newHand.splice(cardIdx, 1);
    setHand(newHand);
    setSelectedIndex(null);
    
    const newRevealed = new Set<number>();
    revealedIndices.forEach(i => {
      if (i > cardIdx) newRevealed.add(i - 1);
      else if (i < cardIdx) newRevealed.add(i);
    });
    setRevealedIndices(newRevealed);

    if (Object.values(newSlots).filter(Boolean).length === 6) {
      setGameStatus('finished');
      if (user && profile) {
        submitScore(profile.nickname, newSlots);
      }
    }
  };

  const removeCard = (slotName: SlotName) => {
    const p = slots[slotName];
    if (!p) return;
    setSlots({ ...slots, [slotName]: null });
    const newHand = [...hand, p];
    setHand(newHand);
    const newRev = new Set(revealedIndices);
    newRev.add(newHand.length - 1);
    setRevealedIndices(newRev);
    if (gameStatus === 'finished') {
      setGameStatus('playing');
      setScoreSubmitted(false);
    }
  };

  return {
    hand, revealedIndices, slots, selectedIndex, gameStatus, scoreSubmitted,
    currentRank, layoutSize, slotRefs, totalScoresCount,
    setSelectedIndex, setRevealedIndices,
    dealHand, placeCard, removeCard, calculateTotal, submitScore, setTotalScoresCount, setCurrentRank
  };
};
