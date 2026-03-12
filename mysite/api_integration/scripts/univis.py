import pandas as pd
import requests
from bs4 import BeautifulSoup
import time

# Excel-Datei laden
df = pd.read_excel("media/fis_personen.xlsx")  # Pfad zur Datei anpassen

# Neue Spalten erstellen
df["Lehrstuhl"] = ""
#df["Fakultät"] = ""

# Basis-URL für UnivIS-Personensuche
search_url = "https://univis.uni-bamberg.de/form"

def search_person(name):
    """
    Sucht die Person auf Univis und gibt Lehrstuhl und Fakultät zurück.
    """
    try:
        # Suchparameter
        params = {"dsc": "go", "to": "search/persons", "what": name}
        response = requests.get(search_url, params=params)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Prüfen, ob Treffer existieren
        person_link = soup.select_one("a[href*='/de/person/']")  # erster Treffer
        if not person_link:
            return "", ""

        # Detailseite abrufen
        detail_url = "https://univis.uni-bamberg.de" + person_link['href']
        detail_resp = requests.get(detail_url)
        detail_resp.raise_for_status()
        detail_soup = BeautifulSoup(detail_resp.text, "html.parser")

        # Lehrstuhl & Fakultät extrahieren
        lehrstuhl_tag = detail_soup.find(lambda tag: tag.name == "dt" and "Lehrstuhl" in tag.text)
        lehrstuhl = lehrstuhl_tag.find_next_sibling("dd").text.strip() if lehrstuhl_tag else ""  
        
        # Fakultät extrahieren
        #fakultät_tag = soup_page.find("div", class_="fakultät")  # anpassen, falls Klasse anders
        #fakultät = fakultät_tag.text.strip() if fakultät_tag else ""
        
        return lehrstuhl
    except Exception as e:
        print(f"Fehler bei {name}: {e}")
        return "", ""

# Schleife über alle Namen
for i, row in df.iterrows():
    name = row["dc.title"]
    lehrstuhl = ""
    if name != "N.N.":
        lehrstuhl = search_person(name)
    df.at[i, "Lehrstuhl"] = lehrstuhl
    #df.at[i, "Fakultät"] = fakultät
    time.sleep(1)  # polite delay, um die Webseite nicht zu überlasten

# Excel speichern
df.to_excel("media/fis_persons.xlsx", index=False)
# print("Fertig! Datei gespeichert.")
