import pandas as pd
import numpy as np

def process_player_data(input_file, output_file):
    # 1. Read the player data file
    try:
        df = pd.read_csv(input_file)
        print(f"Reading {input_file}...")
    except FileNotFoundError:
        print(f"Error: {input_file} not found. Please run the scraper first.")
        return

    # 2. Clean and convert stats to numeric
    cols_to_fix = ['PTS', 'AST', 'TRB', 'STL', 'BLK', 'WS', 'PER']
    for col in cols_to_fix:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # 3. Calculate Score based on requested system
    df['Score'] = (
        df['PTS'] + 
        (df['AST'] * 2) + 
        (df['TRB'] * 2) + 
        (df['WS'] * 2) + 
        (df['STL'] * 5) + 
        (df['BLK'] * 5) + 
        df['PER']
    )

    processed_seasons = []

    # 4. Process by Season to assign Grades based on league-wide percentiles
    for season in df['Season'].unique():
        season_df = df[df['Season'] == season].copy()
        
        # Sort by Score descending
        season_df = season_df.sort_values(by='Score', ascending=False)
        
        num_players = len(season_df)
        
        # Calculate Rank Ratio (1/Total to 1.0)
        season_df['Rank_Ratio'] = np.arange(1, num_players + 1) / num_players
        
        def assign_rarity(ratio):
            if ratio <= 0.02: return "Legendary"    # Top 2%
            if ratio <= 0.10: return "Epic"         # Next 8% (up to 10%)
            if ratio <= 0.30: return "Super Rare"   # Next 20% (up to 30%)
            if ratio <= 0.60: return "Rare"         # Next 30% (up to 60%)
            return "Common"                        # Remaining 40%
        
        season_df['Grade'] = season_df['Rank_Ratio'].apply(assign_rarity)
        processed_seasons.append(season_df.drop(columns=['Rank_Ratio']))

    # Combine all processed seasons
    final_df = pd.concat(processed_seasons)

    # 5. Separate by Position and then Alphabetical Order within the position
    # This sorts the entire file so that PGs are together, SGs together, etc.
    final_df = final_df.sort_values(by=['Pos', 'Player'])

    # 6. Save to new data file
    final_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"Successfully processed and saved data to {output_file}")
    
    # Summary of grading for verification
    if not final_df.empty:
        last_season = df['Season'].max()
        summary = final_df[final_df['Season'] == last_season]['Grade'].value_counts()
        print(f"\nSample Grade Distribution for {last_season}:")
        for grade in ["Legendary", "Epic", "Super Rare", "Rare", "Common"]:
            count = summary.get(grade, 0)
            print(f"  {grade}: {count} players")

if __name__ == "__main__":
    # This program reads the combined stats file and produces the final card data
    INPUT = "nba_player_stats_combined.csv"
    OUTPUT = "nba_player_cards.csv"
    
    process_player_data(INPUT, OUTPUT)
