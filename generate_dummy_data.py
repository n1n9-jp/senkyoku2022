import csv
import random

parties = [
    {"name": "自由民主党", "color": "#d70035"},
    {"name": "立憲民主党", "color": "#004098"},
    {"name": "日本維新の会", "color": "#88c900"},
    {"name": "公明党", "color": "#f55883"},
    {"name": "日本共産党", "color": "#5a2e87"},
    {"name": "国民民主党", "color": "#fdbd02"},
    {"name": "れいわ新選組", "color": "#e954a4"},
    {"name": "社民党", "color": "#1ca9e9"},
    {"name": "無所属", "color": "#999999"}
]

with open('assets/kunames.txt', 'r') as f:
    kunames = [line.strip() for line in f if line.strip()]

with open('assets/dummy_candidates.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['kuname', 'candidate_name', 'party', 'color'])
    
    for kuname in kunames:
        # Randomly decide number of candidates (2 to 5)
        num_candidates = random.randint(2, 5)
        
        # Pick random parties (ensure unique parties for simplicity if desired, but collision is okay for dummy)
        selected_parties = random.sample(parties, k=min(num_candidates, len(parties)))
        
        for i, party in enumerate(selected_parties):
            candidate_name = f"候補者{chr(65+i)}" # Candidate A, B, C...
            writer.writerow([kuname, candidate_name, party['name'], party['color']])

print("Generated assets/dummy_candidates.csv")
