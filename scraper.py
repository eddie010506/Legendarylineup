import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import time
import re
import os

async def get_stats_from_page(page, url, table_id, search_keywords):
    print(f"  -> Loading {url}...")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3) 
        
        html = await page.content()
        clean_html = re.sub(r"<!--|-->", "", html)
        soup = BeautifulSoup(clean_html, 'html.parser')
        
        table = soup.find('table', id=table_id)
        
        if not table:
            for t in soup.find_all('table'):
                header_text = t.get_text().lower()
                if all(k.lower() in header_text for k in search_keywords):
                    table = t
                    break
        
        if not table:
            return pd.DataFrame()

        header_row = table.find('thead')
        if header_row:
            rows = header_row.find_all('tr')
            best_row = max(rows, key=lambda r: len(r.find_all('th')))
            headers = [th.get_text().strip() for th in best_row.find_all('th')]
        else:
            headers = [th.get_text().strip() for th in table.find_all('tr')[0].find_all(['th', 'td'])]

        data = []
        body = table.find('tbody')
        rows = body.find_all('tr') if body else table.find_all('tr')[1:]
        
        for row in rows:
            if 'class' in row.attrs and 'thead' in row.attrs['class']:
                continue
            cells = row.find_all(['td', 'th'])
            if len(cells) > 0:
                row_vals = [c.get_text().strip() for c in cells]
                if headers[0] == 'Rk':
                    data.append(row_vals[1:])
                else:
                    data.append(row_vals)

        if headers[0] == 'Rk':
            headers = headers[1:]

        seen = {}
        unique_headers = []
        for h in headers:
            if h in seen:
                seen[h] += 1
                unique_headers.append(f"{h}_{seen[h]}")
            else:
                seen[h] = 0
                unique_headers.append(h)

        return pd.DataFrame(data, columns=unique_headers)
    except Exception as e:
        print(f"  [!] Error loading page: {e}")
        return pd.DataFrame()

def assign_grades(df):
    """
    Assigns grades based on the calculated Score.
    Distribution: 2% Legendary, 8% Epic, 20% Super Rare, 30% Rare, 40% Common
    """
    if df.empty:
        return df
        
    # Ensure stats are numeric
    cols_to_fix = ['PTS', 'AST', 'TRB', 'STL', 'BLK', 'WS', 'PER']
    for col in cols_to_fix:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
    # Calculate Score
    # Multipliers: ASTx2, TRBx2, WSx2, STLx5, BLKx5. PTS and PER assumed x1.
    df['Score'] = (
        df['PTS'] + 
        (df['AST'] * 2) + 
        (df['TRB'] * 2) + 
        (df['WS'] * 2) + 
        (df['STL'] * 5) + 
        (df['BLK'] * 5) + 
        df['PER']
    )
    
    # Sort by Score descending
    df = df.sort_values(by='Score', ascending=False)
    
    # Calculate Percentiles
    num_players = len(df)
    
    def get_grade(rank_ratio):
        if rank_ratio <= 0.02: return "Legendary"
        if rank_ratio <= 0.10: return "Epic"
        if rank_ratio <= 0.30: return "Super Rare"
        if rank_ratio <= 0.60: return "Rare"
        return "Common"
    
    df['Rank_Ratio'] = np.arange(1, num_players + 1) / num_players
    df['Grade'] = df['Rank_Ratio'].apply(get_grade)
    
    # Drop helper columns
    return df.drop(columns=['Rank_Ratio'])

async def scrape_year(year):
    print(f"\n--- SCRAPING NBA SEASON: {year} ---")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        pg_url = f"https://www.basketball-reference.com/leagues/NBA_{year}_per_game.html"
        df_pg = await get_stats_from_page(page, pg_url, 'per_game_stats', ['PTS', 'AST', 'MP'])

        if df_pg.empty:
            print(f"  [!] Per Game data missing for {year}.")
            await browser.close()
            return None

        adv_url = f"https://www.basketball-reference.com/leagues/NBA_{year}_advanced.html"
        df_adv = await get_stats_from_page(page, adv_url, 'advanced_stats', ['PER', 'WS', 'BPM'])

        await browser.close()

        if df_adv.empty:
            print(f"  [!] Advanced data missing for {year}.")
            return None

        df_pg['Player'] = df_pg['Player'].str.replace('*', '', regex=False)
        df_adv['Player'] = df_adv['Player'].str.replace('*', '', regex=False)

        try:
            merged = pd.merge(
                df_pg[['Player', 'Age', 'Pos', 'PTS', 'TRB', 'AST', 'STL', 'BLK']], 
                df_adv[['Player', 'Age', 'WS', 'PER']], 
                on=['Player', 'Age'], 
                how='inner'
            )
            merged = merged.drop_duplicates(subset=['Player'], keep='first')
            
            merged['Season'] = year
            
            # Apply Grading per season
            graded_df = assign_grades(merged)
            
            final_df = graded_df[['Season', 'Player', 'Pos', 'PTS', 'TRB', 'AST', 'STL', 'BLK', 'WS', 'PER', 'Score', 'Grade']]
            print(f"  [+] Success! Processed {len(final_df)} players.")
            return final_df
            
        except KeyError as e:
            print(f"  [!] Column error in {year}: {e}")
            return None

async def main():
    current_year = 2026
    all_data = []
    output_file = "nba_player_stats_combined.csv"

    while True:
        year_df = await scrape_year(current_year)
        if year_df is None:
            print(f"\nReached the end of available data at year {current_year}. Stopping.")
            break
        
        all_data.append(year_df)
        
        # Incremental save
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        current_year -= 1
        print("Waiting 5 seconds to avoid rate limits...")
        await asyncio.sleep(5)

    print(f"\nDone! All data saved to {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
