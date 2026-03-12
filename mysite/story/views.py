import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api_integration.scripts.xlsx_loader import load_person_list
from api_integration.scripts.openalex import get_openalex_data, get_openalex_works, get_issn_version_years
from api_integration.scripts.opf import get_sherpa_journal, extract_green_oa_fields
from api_integration.scripts.crossref import get_crossref_works
from api_integration.scripts.bison import search_bison_by_title

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.http import JsonResponse

from itertools import chain

@csrf_exempt
def story_page(request):
    people = sorted(load_person_list(), key=lambda p: p["name"])
    selected = None
    data = {}
    selected_orcid = None

    # Handle dynamic BISON AJAX request
    if request.method == "POST" and request.headers.get("x-requested-with") == "XMLHttpRequest":
        bison_title = request.POST.get("bison_title")
        # print("AJAX request received. Title:", bison_title)  # <-- debug

        if not bison_title:
            return JsonResponse({"error": "Missing title"}, status=400)

        try:
            results = search_bison_by_title(bison_title)[:5]
        except Exception as e:
            print("BISON ERROR:", e)
            results = []

        return JsonResponse({"bison_results": results})

    if request.method == "POST":
        selected_orcid = request.POST.get("orcid")
        for person in people:
            if person["orcid"] == selected_orcid:
                selected = person
                break

        if selected:
            openalex_error = None
            try:
                works_api = get_openalex_data(selected_orcid)
                works = None
                issns = []

                if works_api:  
                    # ✅ OpenAlex branch
                    issns = get_openalex_works(works_api)  # assume list of strings
                    author_id = works_api.split(":")[2]
                    selected["author_id"] = author_id

                else:  
                    # ✅ Crossref fallback
                    works = get_crossref_works(selected_orcid)  # list of dicts
                    issns = []
                    for w in works:
                        for i in w.get("issns", []):
                            if isinstance(i, str):
                                issns.append(i.strip())
                    selected["author_id"] = f"crossref:{selected_orcid}"
                    selected["works"] = works 

                flat_issns = []
                for entry in issns:
                    if isinstance(entry, list):
                        flat_issns.extend([i for i in entry if isinstance(i, str)])
                    elif isinstance(entry, str):
                        flat_issns.append(entry)
                
                # deduplicate ISSNs
                valid_issns = set(i.strip() for i in flat_issns if i)

                 # Load OpenAlex works JSON if available
                works_data = None
                if works_api:
                    json_path = os.path.join(
                        settings.BASE_DIR,
                        "static", "alex_works",
                        f"{author_id}.json"
                    )
                    try:
                        with open(json_path, encoding="utf-8") as f:
                            works_data = json.load(f)
                    except Exception as e:
                        print(f"Could not load works data for author {author_id}: {e}")

                # Call Sherpa for up to 10 ISSNs
                sherpa_data = []
                issn_batches = [list(valid_issns)[i:i+10] for i in range(0, len(valid_issns), 10)]
                for batch in issn_batches:
                    for issn in batch:
                        try:
                            print(f"Calling Sherpa API for ISSN: {issn}")
                            result = get_sherpa_journal(issn)
                            if not result:
                                continue

                            # Extract green OA fields
                            green_oa = extract_green_oa_fields(result) or []

                            sherpa_data.append({
                                "issn": issn,
                                "result": result,
                                "green_oa": green_oa  # list of dicts
                            })

                        except Exception as e:
                            print(f"Error for ISSN {issn}: {e}")

                
                # create quick lookup: issn -> sherpa entry
                sherpa_lookup = { entry["issn"]: entry for entry in sherpa_data }
                # print("Sherpa ISSNs:", list(sherpa_lookup.keys()))

                def extract_issns_from_work(w):
                    """Try a few keys to extract possible ISSNs from a work dict."""
                    if not isinstance(w, dict):
                        return []
                    issns = set()

                    # handle simple keys
                    for key in ["issns", "container_issn"]:
                        vals = w.get(key)
                        if isinstance(vals, list):
                            issns.update(i.strip() for i in vals if isinstance(i, str))

                    # direct issn
                    if isinstance(w.get("issn"), str):
                        issns.add(w["issn"].strip())

                    # host venue
                    hv = w.get("host_venue")
                    if isinstance(hv, dict):
                        hv_issn = hv.get("issn_l") or hv.get("issn")
                        if isinstance(hv_issn, str):
                            issns.add(hv_issn.strip())

                    # primary_location.source.issn
                    pl = w.get("primary_location")
                    if isinstance(pl, dict):
                        source = pl.get("source")
                        if isinstance(source, dict):
                            pl_issn = source.get("issn")
                            if isinstance(pl_issn, list):
                                issns.update(i.strip() for i in pl_issn if isinstance(i, str))
                            elif isinstance(pl_issn, str):
                                issns.add(pl_issn.strip())

                    return list(issns)



                def attach_sherpa_to_work(work, sherpa_lookup):
                    """
                    Attach Sherpa data and green OA info directly to a work if ISSN matches.
                    Safely handle None or missing fields.
                    """
                    if not isinstance(work, dict):
                        return  # avoid NoneType errors
                    for issn in extract_issns_from_work(work):
                        entry = sherpa_lookup.get(issn)
                        if entry and isinstance(entry.get("green_oa"), list) and entry["green_oa"]:
                            work["sherpa"] = entry                        
                            green_dict = {}
                            for g in entry["green_oa"]:
                                article_versions = g.get("article_version") or ["unknown"]

                                # Pull URL from g["url"] or from first location if missing
                                location_url = g.get("url")
                                if not location_url:
                                    for loc in g.get("locations", []):
                                        if isinstance(loc, dict) and loc.get("url"):
                                            location_url = loc["url"]
                                            break
                                if not location_url:
                                    location_url = "#"  # fallback so tooltip always has a clickable link

                                for version in article_versions:
                                    green_dict[version] = {
                                        "url": location_url,
                                        "embargo": g.get("embargo", {}),
                                        "article_version": version,
                                    }
                            work["green_oa"] = green_dict
                            # print(f"Attaching Sherpa to work: {work.get('title')}")
                            # print("Available ISSNs in work:", extract_issns_from_work(work))
                            # print("Sherpa ISSNs:", list(sherpa_lookup.keys()))
                            break


                # Attach to OpenAlex works_data
                if works_data and isinstance(works_data, dict) and "results" in works_data:
                    works_data["results"] = [w for w in works_data["results"] if isinstance(w, dict)]
                    for w in works_data["results"]:
                        attach_sherpa_to_work(w, sherpa_lookup)

                data = {
                    "person_info": selected.get("meta", {}),
                    "works_api": works_api,
                    "issns": list(valid_issns),
                    "sherpa": sherpa_data,
                    "works_data": works_data,
                    "openalex_error": openalex_error
                }

            except Exception as e:
                print(f"Error processing ORCID {selected_orcid}: {e}")
                openalex_error = "Unfortunately, no data could be found for this person’s ORCID in OpenAlex."

                # Update data im Fehlerfall
                data.update({
                    "person_info": selected.get("meta", {}),
                    "works_api": None,
                    "works_data": None,
                    "issns": [],
                    "sherpa": {},
                    "openalex_error": openalex_error,
                })

            # return JSON if this is an AJAX request
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({
                    "data": data,
                    "selected_orcid": selected_orcid,
                    "selected_name": selected["name"],
                })
            

    return render(request, "story/story_page.html", {
        "people": people,
        "data": data,
        "selected_orcid": selected_orcid,
    })
