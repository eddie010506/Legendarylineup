export interface Player {
  id: string;
  Season: number;
  Player: string;
  Pos: string;
  PTS: number;
  TRB: number;
  AST: number;
  STL: number;
  BLK: number;
  WS: number;
  PER: number;
  Score: number;
  Grade: string;
}

export type SlotName = "PG" | "SG" | "SF" | "PF" | "C" | "Joker";
export type SlotMap = Record<SlotName, Player | null>;

export interface LeaderboardEntry {
  id: string;
  initials: string;
  score: number;
  created_at: string;
  user_id?: string;
  roster?: { name: string; grade: string }[];
}

export const SLOTS: SlotName[] = ["PG", "SG", "SF", "PF", "C", "Joker"];

export const SLOT_RULES: Record<string, string[]> = {
  "PG": ["PG", "SG"],
  "SG": ["PG", "SG", "SF"],
  "SF": ["SG", "SF", "PF"],
  "PF": ["SF", "PF", "C"],
  "C": ["PF", "C"],
  "Joker": ["PG", "SG", "SF", "PF", "C"]
};
