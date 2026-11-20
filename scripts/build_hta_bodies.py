"""Add every European HTA body to data/countries.json.

Sources, cross-checked (each body lists the sources that name it):
  EC     - European Commission, Members of the HTA Coordination Group (HTACG),
           medicinal products configuration (EU 27 + Iceland, Liechtenstein, Norway)
           https://health.ec.europa.eu/document/download/63a56ee2-bdaa-47ac-87a6-397eeb8c8e80_en?filename=hta_htacg_mp_members_en.pdf
  INAHTA - INAHTA members list, https://www.inahta.org/members/members_list/
  CPE    - Cancer Patients Europe HTA patient-involvement map (checked by hand, Oct 2026)

Countries that already have decisions tracked (DE, FR, IT) keep their hand-written
details; only missing bodies and source tags are added. Run again after editing
the lists below:  python scripts/build_hta_bodies.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "data" / "countries.json"
INAHTA = "https://www.inahta.org/members/"


def b(name, url, *sources, role=""):
    d = {"name": name, "url": url, "sources": list(sources)}
    if role:
        d["role"] = role
    return d


# code: (name, group, [bodies])  group: EU / EEA / Other
EUROPE = {
    "AT": ("Austria", "EU", [
        b("Federal Ministry of Labour, Social Affairs, Health, Care and Consumer Protection / Gesundheit Österreich GmbH (GÖG)", "https://www.sozialministerium.at/en.html", "EC", "INAHTA", "CPE"),
        b("Austrian Institute for Health Technology Assessment (AIHTA)", "https://aihta.at/page/homepage/en", "EC", "INAHTA"),
        b("Dachverband der Sozialversicherungsträger (DVSV)", "https://www.sozialversicherung.at/cdscontent/?contentid=10007.845634", "EC", "INAHTA"),
    ]),
    "BE": ("Belgium", "EU", [
        b("National Institute for Health and Disability Insurance (RIZIV / INAMI / NIHDI)", "https://www.inami.fgov.be/fr/Pages/default.aspx", "EC", "CPE"),
        b("Belgian Health Care Knowledge Centre (KCE)", "https://kce.fgov.be/en", "EC", "INAHTA"),
    ]),
    "BG": ("Bulgaria", "EU", [
        b("National Council on Prices and Reimbursement of Medicinal Products (NCPR)", "https://ncpr.bg/en/ncprmp/about-council.html", "EC"),
    ]),
    "HR": ("Croatia", "EU", [
        b("Ministry of Health", "https://zdravlje.gov.hr/", "EC"),
        b("Croatian Institute of Public Health (HZJZ)", "https://www.hzjz.hr/en/", "EC"),
    ]),
    "CY": ("Cyprus", "EU", [
        b("Department of Pharmaceutical Services, Ministry of Health", "https://www.moh.gov.cy/moh/phs/phs.nsf/home_en/home_en?openform", "EC"),
    ]),
    "CZ": ("Czech Republic", "EU", [
        b("State Institute for Drug Control (SÚKL)", "https://www.sukl.eu/", "EC"),
        b("Ministry of Health – advisory body on reimbursement of rare-disease medicines", "https://ppo.mzcr.cz/workGroup/172", "CPE"),
    ]),
    "DK": ("Denmark", "EU", [
        b("Danish Medicines Agency", "https://laegemiddelstyrelsen.dk/en/about/", "EC"),
        b("Danish Medicines Council (Medicinrådet)", "https://medicinraadet.dk/om-os/in-english", "EC", "CPE"),
        b("Danish Healthcare Quality Institute (DHQI)", "https://www.sundk.dk/about/", "EC", "INAHTA", "CPE"),
    ]),
    "EE": ("Estonia", "EU", [
        b("Estonian Health Insurance Fund (EHIF)", "https://tervisekassa.ee/en", "EC"),
        b("Centre for Health Technology Assessment, University of Tartu", "https://ut.ee/en/unit-health-information-analysis", "EC"),
    ]),
    "FI": ("Finland", "EU", [
        b("Finnish Medicines Agency (Fimea)", "https://fimea.fi/en/frontpage", "EC"),
        b("Ministry of Social Affairs and Health", "https://stm.fi/en/frontpage", "EC"),
        b("Finnish Coordinating Center for Health Technology Assessment (FinCCHTA)", INAHTA + "fincchta/", "INAHTA"),
    ]),
    "GR": ("Greece", "EU", [
        b("Ministry of Health", "https://www.moh.gov.gr/", "EC"),
    ]),
    "HU": ("Hungary", "EU", [
        b("National Center for Public Health and Pharmacy (NCPHP)", "", "EC"),
    ]),
    "IE": ("Ireland", "EU", [
        b("National Centre for Pharmacoeconomics (NCPE)", "https://www.ncpe.ie/about/", "EC", "CPE"),
        b("Health Information and Quality Authority (HIQA)", "https://www.hiqa.ie/", "INAHTA", "CPE"),
    ]),
    "LV": ("Latvia", "EU", [
        b("State Agency of Medicines of the Republic of Latvia", "http://www.zva.gov.lv/", "EC"),
    ]),
    "LT": ("Lithuania", "EU", [
        b("State Medicines Control Agency under the Ministry of Health", "https://www.vvkt.lt/Front-Page", "EC"),
    ]),
    "LU": ("Luxembourg", "EU", [
        b("Ministry of Health, Directorate of Health – Division of Pharmacy and Medicines", "https://msan.gouvernement.lu/en.html", "EC"),
    ]),
    "MT": ("Malta", "EU", [
        b("Ministry for Health and Active Ageing – Directorate for Pharmaceutical Affairs", "https://healthservices.gov.mt/en/pharmaceutical/Pages/pharmaceutical-affairs.aspx", "EC"),
    ]),
    "NL": ("Netherlands", "EU", [
        b("National Health Care Institute (Zorginstituut Nederland, ZIN)", "https://www.zorginstituutnederland.nl/", "EC", "INAHTA", "CPE"),
        b("Ministry of Health, Welfare and Sport", "https://www.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport", "EC"),
        b("Netherlands Organisation for Health Research and Development (ZonMw)", INAHTA + "zonmw/", "INAHTA"),
    ]),
    "PL": ("Poland", "EU", [
        b("Agency for Health Technology Assessment and Tariff System (AOTMiT)", "https://www.aotm.gov.pl/en/about-us/", "EC", "INAHTA", "CPE"),
    ]),
    "PT": ("Portugal", "EU", [
        b("National Authority of Medicines and Health Products (INFARMED)", "https://www.infarmed.pt/", "EC", "CPE"),
    ]),
    "RO": ("Romania", "EU", [
        b("National Agency for Medicines and Medical Devices of Romania (NAMMDR)", "https://www.anm.ro/en/", "EC"),
    ]),
    "SK": ("Slovakia", "EU", [
        b("National Institute for Value and Technologies in Healthcare (NIHO)", "https://niho.sk/", "EC", "INAHTA"),
    ]),
    "SI": ("Slovenia", "EU", [
        b("Slovenian Quality Health Care Agency", "https://www.gov.si/drzavni-organi/organi-v-sestavi/urad-za-nadzor-kakovost-in-investicije-v-zdravstvu/", "EC"),
    ]),
    "ES": ("Spain", "EU", [
        b("Spanish Agency of Medicines and Medical Devices (AEMPS)", "https://www.aemps.gob.es/", "EC"),
        b("General Directorate of Common Portfolio of Services of the NHS and Pharmacy, Ministry of Health", "https://www.sanidad.gob.es/en/directoa/home.htm", "EC"),
        b("Spanish Network of HTA Agencies (RedETS)", "https://redets.sanidad.gob.es/", "CPE"),
        b("AETS-ISCIII – Agencia de Evaluación de Tecnologías Sanitarias", INAHTA + "aets/", "INAHTA"),
        b("AETSA – Andalusian Agency for HTA", INAHTA + "aetsa/", "INAHTA"),
        b("AQuAS – Agency for Health Quality and Assessment of Catalonia", INAHTA + "aquas/", "INAHTA"),
        b("AVALIA-T – Galician Agency for HTA", INAHTA + "avalia-t/", "INAHTA"),
        b("IACS – Health Sciences Institute in Aragon", INAHTA + "iacs/", "INAHTA"),
        b("OSTEBA – Basque Office for HTA", INAHTA + "osteba/", "INAHTA"),
    ]),
    "SE": ("Sweden", "EU", [
        b("Dental and Pharmaceutical Benefits Agency (TLV)", "https://www.government.se/government-agencies/dental-and-pharmaceutical-benefits-agency-tandvards--och-lakemedelsformansverket-tlv/", "EC", "CPE"),
        b("Swedish Agency for HTA and Assessment of Social Services (SBU)", "https://www.sbu.se/en/", "EC", "INAHTA"),
    ]),
    "IS": ("Iceland", "EEA", [
        b("Icelandic Medicines Agency", "https://www.ima.is/", "EC"),
        b("Ministry of Health", "https://www.government.is/ministries/ministry-of-health/", "EC"),
    ]),
    "LI": ("Liechtenstein", "EEA", [
        b("Office of Public Health", "https://www.llv.li/inhalt/1908/amtsstellen/amt-fur-gesundheit", "EC"),
    ]),
    "NO": ("Norway", "EEA", [
        b("Norwegian Medical Products Agency (NOMA)", "https://legemiddelverket.no/english", "EC"),
        b("Norwegian Regional Health Authorities (Nye Metoder)", "https://www.helse-sorost.no/south-eastern-norway-regional-health-authority", "EC"),
        b("Norwegian Institute of Public Health (NIPH)", INAHTA + "niph/", "INAHTA"),
    ]),
    "GB": ("United Kingdom", "Other", [
        b("National Institute for Health and Care Excellence (NICE) – England", "https://www.nice.org.uk/", "INAHTA", "CPE"),
        b("Scottish Medicines Consortium (SMC) – Scotland", "https://scottishmedicines.org.uk/", "CPE"),
        b("All Wales Medicines Strategy Group (AWMSG) – Wales", "https://awttc.nhs.wales/", "CPE"),
        b("Healthcare Improvement Scotland (HIS)", INAHTA + "his/", "INAHTA"),
        b("Health Technology Wales (HTW)", INAHTA + "htw/", "INAHTA"),
        b("National Institute for Health and Care Research (NIHR)", INAHTA + "nihr/", "INAHTA"),
    ]),
    "CH": ("Switzerland", "Other", [
        b("Swiss Federal Office of Public Health (FOPH)", INAHTA + "sfoph/", "INAHTA"),
    ]),
}

# Extra bodies / source tags for the countries already tracked in detail
TRACKED_EXTRA = {
    "DE": {"tags": {"G-BA": ["EC", "INAHTA", "CPE"], "IQWiG": ["EC", "INAHTA"]},
           "add": [b("Federal Ministry of Health", "https://www.bundesgesundheitsministerium.de/en/ministry/the-federal-ministry-of-health.html", "EC")]},
    "FR": {"tags": {"HAS": ["EC", "INAHTA", "CPE"]},
           "add": [b("Ministry of Health, Families, Autonomy and Disabled People", "https://solidarites-sante.gouv.fr/", "EC")]},
    "IT": {"tags": {"AIFA": ["EC", "CPE"]},
           "add": [b("Ministry of Health – Directorate General Medical Devices and Pharmaceutical Services", "https://www.salute.gov.it/portale/ministro/p4_5_2_4_1.jsp?lingua=italiano&menu=uffCentrali&label=uffCentrali&id=1153", "EC"),
                   b("Agenas – Agency for Regional Healthcare", INAHTA + "agenas/", "INAHTA")]},
}


def flag(code):
    return "".join(chr(0x1F1E6 + ord(ch) - 65) for ch in code)


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    for code, extra in TRACKED_EXTRA.items():
        c = data[code]
        c["tracked"] = True
        c["group"] = "EU"
        for body in c["bodies"]:
            for key, tags in extra["tags"].items():
                if body["name"].startswith(key):
                    body["sources"] = tags
        names = {x["name"] for x in c["bodies"]}
        c["bodies"] += [x for x in extra["add"] if x["name"] not in names]
    for code, (name, group, bodies) in EUROPE.items():
        c = data.setdefault(code, {})
        c.update({"name": name, "flag": flag(code), "group": group, "tracked": False, "bodies": bodies})
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(data) - 1} countries (+ EU) in countries.json")


if __name__ == "__main__":
    main()
