import requests
import json

def search_bison_by_title(title):
    """
    Search BISON by title and return the top `size` journal titles and percentages.
    """

    url = "https://service.tib.eu/bison/api/public/v1/search"
    size = 5
    
    payload = {
        "title": title,      
        "abstract": "",
        "references": "",
    }

    headers = {"Content-Type": "application/json"}
    # print(payload)
    response = requests.post(url, json=payload)
    # response = requests.post(url, json=payload, headers=headers)
    # print(response)

    if response.status_code != 200:
        print("Error:", response.status_code, response.text)
        return []

    data = response.json()

    results = []
    # print(results)
    # Extract journal title & percentage
    for item in data.get("items", [])[:size]:
        results.append({
            "journal_title": item.get("journalTitle", "N/A"),
            "percentage": item.get("percentage", None)
        })
    
    # print("BISON API results:", results)

    return results
