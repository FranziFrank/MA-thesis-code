import requests
import os
import json

def get_crossref_works(orcid, save_dir=os.path.join("static", "crossref_data")):
    """
    Fetch works from Crossref for a given ORCID, save raw JSON,
    and return a parsed list of works with ISSNs and open access status.
    """
    url = "https://api.crossref.org/works"
    params = {'filter': f'orcid:{orcid}'}
    
    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = response.json()
        items = data.get("message", {}).get("items", [])
        # print(f"Retrieved {len(items)} works for ORCID {orcid}")

        # Save raw JSON
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, f"{orcid}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        # Parse works
        works = []
        for item in items:
            issns = [issn.strip() for issn in item.get("ISSN", []) if isinstance(issn, str)]
            
            # Heuristic for OA: check if license points to Creative Commons
            oa_status = False
            if "license" in item:
                for lic in item["license"]:
                    if "creativecommons.org" in lic.get("URL", "").lower():
                        oa_status = True
                        break

            works.append({
                "issns": issns,
                "doi": item.get("DOI"),
                "open_access": {
                    "is_oa": oa_status,
                    "source": "crossref"
                }
            })

        return works
        
    else:
        response.raise_for_status()
