import requests
import os
import json

def get_openalex_data(orcid, save_dir=os.path.join("static", "alex_data")):
    url = f"https://api.openalex.org/authors/orcid:{orcid}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        works_api = data.get("works_api_url")
        
        # Create directory if it doesn't exist
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, f"{orcid}.json")
        
        # Save to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        return works_api
        
    else:
        response.raise_for_status()

def get_openalex_works(works_api, save_dir=os.path.join("static", "alex_works")):
    all_works = []
    cursor = "*"
    per_page = 200  # max allowed per page

    while cursor:
        paginated_url = f"{works_api}?per-page={per_page}&cursor={cursor}"
        response = requests.get(paginated_url)

        if response.status_code == 200:
            data = response.json()
            all_works.extend(data.get("results", []))
            cursor = data.get("meta", {}).get("next_cursor")
        else:
            response.raise_for_status()

    author_id = works_api.split(":")[2]
    os.makedirs(save_dir, exist_ok=True)
    filepath = os.path.join(save_dir, f"{author_id}.json")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({"results": all_works}, f, ensure_ascii=False, indent=4)

    issns = find_all_issn(all_works, "issn")
    return issns

def find_all_issn(obj, key_to_find):
    results = []

    def _search(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == key_to_find:
                    results.append(v)
                _search(v)
        elif isinstance(o, list):
            for item in o:
                _search(item)

    _search(obj)
    return results

def get_version_years_from_openalex(work: dict) -> dict:
    """
    Extracts publication-related years by version (submitted, accepted, published)
    from a single OpenAlex work record.
    Returns: {"submittedVersion": year, "acceptedVersion": year, "publishedVersion": year}
    """
    version_years = {}

    # base publication year (often corresponds to published version)
    if "publication_year" in work:
        version_years["publishedVersion"] = work["publication_year"]

    # check locations for other versions
    for loc in work.get("locations", []):
        vtype = loc.get("version")
        if vtype:
            # we only have publication_date at the work level, so fallback to that
            year = None
            if "publication_date" in work and work["publication_date"]:
                year = int(work["publication_date"].split("-")[0])
            elif "publication_year" in work:
                year = work["publication_year"]

            if year:
                version_years[vtype] = year

    return version_years

def get_issn_version_years(works: list) -> dict:
    """
    Build {ISSN: {version: year}} map.
    """
    issn_versions = {}
    for w in works:
        versions = get_version_years_from_openalex(w)
        for i in w.get("primary_location", {}).get("source", {}).get("issn", []) or []:
            issn_versions.setdefault(i, {}).update(versions)
    return issn_versions