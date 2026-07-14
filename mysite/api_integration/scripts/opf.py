import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Union


from api_integration.utils import safe_requests_get


SHERPA_API_KEY = os.getenv("SHERPA_API_KEY")
# print(SHERPA_API_KEY)

def get_sherpa_journal(issn, save_dir=os.path.join("static", "opf_data")):
    url = f"https://api.openpolicyfinder.jisc.ac.uk/retrieve_by_id"
    params = {
        'item-type': 'publication',
        "format": "Json",
        "identifier" : f"{issn}"
    }
    headers = {
    "x-api-key": SHERPA_API_KEY
    }
    
    response = safe_requests_get(url, params=params, headers=headers,)
    
    if response.status_code == 200:
        data = response.json()
        item_count = len(data.get('message', {}).get('items', []))
        print(f"Retrieved {item_count} works for ISSN {issn}")
        
        # Create directory if it doesn't exist
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, f"{issn}.json")
        
        # Save to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        # print(f"Data saved to {filepath}")
        return data
    else:
        response.raise_for_status()


def extract_green_oa_fields(json_obj: Union[Path, Dict[str, Any]], publication_years: Optional[Dict[str, int]] = None) -> List[Dict[str, Any]]:
    """
    Extract green OA relevant fields from an Open Policy Finder JSON file or dict.
    Returns a list of dicts, one per permitted_oa option.
    """

    # Load from file if path is provided
    if isinstance(json_obj, Path):
        with open(json_obj, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(json_obj, dict):
        data = json_obj
    else:
        raise ValueError("json_obj must be a Path or dict")

    results = []
    for item in data.get("items", []):
        journal_title = None
        titles = item.get("title")  # could be list or str
        if isinstance(titles, list) and titles:
            # try first entry with "title" key
            first = titles[0]
            if isinstance(first, dict):
                journal_title = first.get("title")
        elif isinstance(titles, str):
            journal_title = titles

        # fallback if still None
        if not journal_title:
            journal_title = item.get("journal_name") or item.get("display_name")

        publisher = (
            item.get("publishers", [{}])[0]
            .get("publisher", {})
            .get("name", [{}])[0]
            .get("name")
        )
        issns = [issn.get("issn") for issn in item.get("issns", [])]
        link = item.get("uri")

        for policy in item.get("publisher_policy", []):
            for perm in policy.get("permitted_oa", []):
                embargo_info = perm.get("embargo", {})
                embargo_months = embargo_info.get("amount") if embargo_info else None

                version = perm.get("article_version", [None])[0]
                pub_year = None
                embargo_expiry = None

                # Match publication year to article_version if available
                if publication_years and version in publication_years:
                    pub_year = publication_years[version]

                if pub_year and embargo_months:
                    embargo_years = embargo_months // 12
                    embargo_expiry = pub_year + embargo_years
                
                first_url = None
                locations = perm.get("location", {}).get("location", [])
                if locations:
                    for loc in locations:
                        if isinstance(loc, dict):
                            first_url = loc.get("url") or loc.get("link")
                            if first_url:
                                break

                result = {
                    "journal": journal_title,
                    "publisher": publisher,
                    "issns": issns,
                    "opf_link": link,
                    "url": first_url, 
                    "article_version": perm.get("article_version", []),
                    "locations": locations,
                    "embargo": embargo_info,
                    "publication_year": pub_year,
                    "embargo_expiry_year": embargo_expiry,
                    "licenses": [
                        l.get("license_phrases", [{}])[0].get("phrase")
                        for l in perm.get("license", [])
                    ],
                    "oa_fee": perm.get("additional_oa_fee"),
                    "conditions": perm.get("conditions", []),
                    "notes": perm.get("public_notes", []),
                    "funder_prerequisites": [
                        f["funder_metadata"].get("name", [{}])[0].get("name")
                        for f in perm.get("prerequisites", {}).get("prerequisite_funders", [])
                    ],
                }
                results.append(result)

    return results
