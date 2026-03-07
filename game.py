import pandas as pd
import random
import sys

def play_game():
    # 1. Load the card data
    try:
        df = pd.read_csv("nba_player_cards.csv")
    except FileNotFoundError:
        print("Error: 'nba_player_cards.csv' not found. Please run the scraper and processor first.")
        return

    print("=== NBA GACHA ROSTER CHALLENGE ===")
    
    # 2. Pull 7 unique cards
    if len(df) < 7:
        print("Not enough cards in the database to play.")
        return
        
    hand = df.sample(n=7).reset_index(drop=True)
    
    print("\nYou pulled the following 7 cards:")
    for i, row in hand.iterrows():
        print(f"[{i+1}] {row['Player']} ({row['Pos']}) | Score: {row['Score']:.1f} | Grade: {row['Grade']}")

    # 3. Define Slot Rules
    # Adjacent rules: PG takes PG/SG, SG takes PG/SG/SF, etc.
    # We define allowed positions for each slot
    slots_rules = {
        "PG": ["PG", "SG"],
        "SG": ["PG", "SG", "SF"],
        "SF": ["SG", "SF", "PF"],
        "PF": ["SF", "PF", "C"],
        "C":  ["PF", "C"],
        "Joker": ["PG", "SG", "SF", "PF", "C"] 
    }

    roster = {}
    used_indices = set()

    # 4. Assignment Loop
    print("\nFill your 6 slots (PG, SG, SF, PF, C, Joker). Choose the card number [1-7].")
    
    for slot_name in ["PG", "SG", "SF", "PF", "C", "Joker"]:
        allowed_pos = slots_rules[slot_name]
        while True:
            try:
                choice_str = input(f"Assign to {slot_name} Slot: ").strip()
                if not choice_str: continue
                choice = int(choice_str) - 1
                
                if choice < 0 or choice >= 7:
                    print("Invalid card number. Choose 1-7.")
                    continue
                if choice in used_indices:
                    print("That card is already in your roster! Choose a different one.")
                    continue
                
                card = hand.iloc[choice]
                card_pos = card['Pos']
                
                # Some players have dual positions like 'SG-SF'. We'll check if any part matches.
                # Splitting by dash handles Basketball Reference's dual-position notation.
                actual_positions = card_pos.split('-')
                
                is_valid = False
                if slot_name == "Joker":
                    is_valid = True
                else:
                    # If any part of the card's position is in the allowed list for the slot
                    if any(pos in allowed_pos for pos in actual_positions):
                        is_valid = True
                
                if is_valid:
                    roster[slot_name] = card
                    used_indices.add(choice)
                    break
                else:
                    print(f"Invalid position! {slot_name} slot only accepts adjacent positions: {', '.join(allowed_pos)}")
            except ValueError:
                print("Please enter a valid number.")

    # 5. Calculation
    total_score = 0
    bonus_points = 0
    print("\n--- FINAL ROSTER REPORT ---")
    
    for slot_name in ["PG", "SG", "SF", "PF", "C", "Joker"]:
        card = roster[slot_name]
        card_score = float(card['Score'])
        card_pos = card['Pos']
        actual_positions = card_pos.split('-')
        
        # Exact position bonus (+5)
        slot_bonus = 0
        if slot_name != "Joker" and slot_name in actual_positions:
            slot_bonus = 5
            bonus_points += 5
            
        total_score += (card_score + slot_bonus)
        
        bonus_str = "(+5 Exact Match Bonus!)" if slot_bonus > 0 else ""
        print(f"{slot_name.ljust(5)}: {card['Player'].ljust(25)} | Base: {card_score:>5.1f} {bonus_str}")

    print("-" * 50)
    print(f"Total Card Score Sum: {total_score - bonus_points:.1f}")
    print(f"Total Bonus Points:   {bonus_points}")
    print(f"FINAL TOTAL SCORE:    {total_score:.1f}")
    print("-" * 50)
    
    # Simple ranking based on typical score ranges
    if total_score > 350:
        print("RANK: GOAT STATUS! 🐐")
    elif total_score > 250:
        print("RANK: ALL-NBA FIRST TEAM! ⭐")
    else:
        print("RANK: SOLID STARTER 🏀")

if __name__ == "__main__":
    play_game()
