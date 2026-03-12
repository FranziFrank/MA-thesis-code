import os
import pandas as pd

# Go up two levels from the script: from scripts/ → api_integration/ → project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
file_path = os.path.join(BASE_DIR, 'media', 'fis_personen.xlsx')
# print(file_path)

def load_person_list():
    try:
        df = pd.read_excel(file_path, engine="openpyxl")
    except FileNotFoundError:
        print(f"[ERROR] File not found: {file_path}")
        return []
    except Exception as e:
        print(f"[ERROR] Could not load Excel file: {e}")
        return []

    people = []

    for _, row in df.iterrows():
        name = row.get("dc.title")
        orcid_raw = None

        if pd.notna(row.get("person.identifier.orcid")):
            orcid_raw = row.get("person.identifier.orcid")
        elif pd.notna(row.get("person.identifier.orcid[de_DE]")):
            orcid_raw = row.get("person.identifier.orcid[de_DE]")
        
        if pd.notna(name) and pd.notna(orcid_raw):
            orcid = str(orcid_raw).split("$$")[0].strip()

            people.append({
                "name": str(name).strip(),
                "orcid": orcid,
                "meta": row.to_dict(),  # Optional: for future use
            })

    return people

