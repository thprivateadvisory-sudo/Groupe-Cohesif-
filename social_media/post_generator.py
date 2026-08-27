#!/usr/bin/env python3
"""Générateur et publieur de posts quotidiens pour Groupe Cohesif.

Publie 2 posts par jour sur Facebook Page et LinkedIn Organization :
- 9h  : une première filiale en rotation
- 17h : une deuxième filiale différente

Secrets GitHub requis:
  ANTHROPIC_API_KEY        - Clé API Claude (Anthropic)
  FACEBOOK_PAGE_ID         - ID de la page Facebook professionnelle
  FACEBOOK_ACCESS_TOKEN    - Token d'accès Page Facebook
  LINKEDIN_ORGANIZATION_ID - ID de l'organisation LinkedIn (ex: 12345678)
  LINKEDIN_ACCESS_TOKEN    - Token OAuth2 LinkedIn (scope: w_organization_social)
"""

import os
import json
import sys
import requests
import anthropic
from datetime import date, datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Description des filiales Groupe Cohesif
# ---------------------------------------------------------------------------
BUSINESS_UNITS = [
    {
        "id": "sport",
        "name": "Cohesif Sport",
        "domain": "gestion et délégation de service pour clubs de football",
        "services": "Délégation de Service Sportif, affiliations FFF, subventions CNDS, Academy U6-U18, infrastructure sportive, flotte et transport",
        "audience": "présidents de clubs de football, collectivités locales, mairies",
        "url": "https://cohesifsport.fr",
        "interdit": "construction, énergie solaire, alimentaire, sécurité électronique, digital, négoce, leasing, automobile, nettoyage",
    },
    {
        "id": "btp",
        "name": "Cohesif BTP",
        "domain": "construction, rénovation et gestion de chantier",
        "services": "construction neuve, rénovation, extension, gros œuvre, second œuvre, gestion de chantier clé en main, réhabilitation énergétique de bâtiments",
        "audience": "promoteurs immobiliers, collectivités, entreprises, particuliers",
        "url": "https://cohesifbtp.fr",
        "interdit": "football, énergie solaire, alimentaire, sécurité électronique, digital, négoce de matières premières, leasing, automobile, nettoyage",
    },
    {
        "id": "energy",
        "name": "Cohesif Energy",
        "domain": "énergie solaire, bornes de recharge électrique et transition écologique",
        "services": "installation panneaux solaires, bornes de recharge électrique, audit énergétique, optimisation des consommations, mobilité électrique pour flottes",
        "audience": "entreprises, clubs sportifs, collectivités, particuliers",
        "url": "https://cohesifenergy.fr",
        "interdit": "football, construction de bâtiments, alimentaire, sécurité électronique, digital, négoce, leasing, automobile, nettoyage",
    },
    {
        "id": "agro",
        "name": "Cohesif Agro",
        "domain": "sourcing agroalimentaire et approvisionnement alimentaire",
        "services": "sourcing produits alimentaires, approvisionnement collectivités, circuits courts, gestion des stocks alimentaires, restauration collective",
        "audience": "restaurants, cantines scolaires, clubs sportifs, collectivités",
        "url": "https://cohesifagro.fr",
        "interdit": "football, construction, énergie solaire, sécurité électronique, digital, négoce de matières premières, leasing, automobile, nettoyage",
    },
    {
        "id": "auto",
        "name": "Cohesif Auto",
        "domain": "gestion de flottes automobiles et transport professionnel",
        "services": "gestion de flottes automobiles, véhicules électriques et hybrides, location longue durée, maintenance et entretien, transport sportif et événementiel",
        "audience": "entreprises, associations sportives, collectivités",
        "url": "https://cohesifauto.fr",
        "interdit": "football, construction, énergie solaire, alimentaire, sécurité électronique, digital, négoce, financement crédit-bail, nettoyage",
    },
    {
        "id": "commerce",
        "name": "Cohesif Commerce",
        "domain": "distribution commerciale et sourcing de produits",
        "services": "distribution de produits, sourcing et achats groupés, gestion des approvisionnements, e-commerce et logistique, merchandising",
        "audience": "commerçants, distributeurs, grandes surfaces, clubs",
        "url": "https://cohesifcommerce.fr",
        "interdit": "football, construction, énergie solaire, alimentaire, sécurité électronique, digital, négoce de matières premières, leasing, automobile, nettoyage",
    },
    {
        "id": "leasing",
        "name": "Cohesif Leasing",
        "domain": "leasing et financement de matériel professionnel",
        "services": "leasing matériel professionnel, location longue durée de véhicules, financement équipements sportifs, solutions de crédit-bail, rachat de matériel",
        "audience": "TPE, PME, associations, clubs sportifs",
        "url": "https://cohesifleasing.fr",
        "interdit": "football, construction, énergie solaire, alimentaire, sécurité électronique, digital, négoce, automobile, nettoyage",
    },
    {
        "id": "access",
        "name": "Cohesif Access",
        "domain": "contrôle d'accès, vidéosurveillance et sécurité électronique",
        "services": "systèmes de contrôle d'accès, vidéosurveillance, badges et biométrie, sécurité événementielle, gestion des flux et stades",
        "audience": "clubs sportifs, stades, entreprises, collectivités",
        "url": "https://cohesifaccess.fr",
        "interdit": "football sportif, construction, énergie solaire, alimentaire, digital web, négoce, leasing, automobile, nettoyage",
    },
    {
        "id": "net",
        "name": "Cohesif Net",
        "domain": "nettoyage professionnel à Nancy et en Meurthe-et-Moselle (Lorraine)",
        "services": "nettoyage de canapés et matelas (injection-extraction), nettoyage de vitres, remise en état locative entre locataires, nettoyage de locaux professionnels et bureaux (contrat mensuel), nettoyage fin de chantier, detailing intérieur de véhicules",
        "audience": "particuliers à Nancy et en Lorraine, agences immobilières, PME, restaurants, cabinets médicaux, propriétaires bailleurs",
        "url": "https://cohesifnet.fr",
        "interdit": "digital, réseau informatique, WiFi, cybersécurité, football, construction, énergie solaire, alimentaire, sécurité électronique, négoce, leasing, automobile",
    },
    {
        "id": "negoce",
        "name": "Cohesif Négoce",
        "domain": "négoce de matériaux de construction et sourcing de matières premières",
        "services": "négoce de matériaux de construction, sourcing matières premières, import-export, gestion des stocks, approvisionnement chantiers",
        "audience": "artisans, constructeurs, promoteurs, industriels",
        "url": "https://cohesifnegoce.fr",
        "interdit": "football, énergie solaire, alimentaire, sécurité électronique, digital, leasing, automobile, nettoyage",
    },
    {
        "id": "groupe",
        "name": "Groupe Cohesif",
        "domain": "groupe français multi-sectoriel avec 10 filiales spécialisées",
        "services": "sport, BTP, énergie, agro, auto, commerce, leasing, accès, nettoyage, négoce — expertise globale et accompagnement multi-secteur",
        "audience": "dirigeants, investisseurs, collectivités, grands comptes",
        "url": "https://groupecohesif.fr",
        "interdit": "",
    },
]

# ---------------------------------------------------------------------------
# Thèmes de posts
# ---------------------------------------------------------------------------
POST_THEMES = [
    "pain_point",
    "service_concret",
    "hook_question",
    "chiffre_realite",
    "avant_apres",
    "astuce_directe",
    "contexte_moment",
]


def select_slot() -> str:
    """Détermine le créneau : morning (9h) ou evening (17h)."""
    override = os.environ.get("POST_SLOT", "auto").strip()
    if override in ("morning", "evening"):
        return override
    return "morning" if datetime.utcnow().hour < 12 else "evening"


def select_business_unit(today: date, slot: str) -> dict:
    """Sélectionne la filiale du jour — différente selon le créneau."""
    override = os.environ.get("BUSINESS_UNIT_OVERRIDE", "").strip()
    if override:
        for bu in BUSINESS_UNITS:
            if bu["id"] == override:
                return bu

    day_of_year = today.timetuple().tm_yday
    half = len(BUSINESS_UNITS) // 2 + 1
    offset = 0 if slot == "morning" else half
    return BUSINESS_UNITS[(day_of_year + offset) % len(BUSINESS_UNITS)]


def select_theme(today: date, slot: str) -> str:
    """Sélectionne le thème du post — différent selon le créneau."""
    day_of_year = today.timetuple().tm_yday
    offset = 0 if slot == "morning" else len(POST_THEMES) // 2
    return POST_THEMES[(day_of_year // len(BUSINESS_UNITS) + offset) % len(POST_THEMES)]


def generate_post_content(bu: dict, theme: str, today: date, slot: str) -> dict:
    """Génère le contenu du post via Claude API."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    theme_instructions = {
        "pain_point": "Commence par le coût ou le problème concret que vit la cible quand elle n'a pas ce service. 2-3 phrases sur le problème, puis la réponse directe de la filiale.",
        "service_concret": "Présente une offre ou un service concret de la filiale. Sois précis sur ce qui est inclus. Pas de généralité.",
        "hook_question": "Commence par une question qui cible directement le problème de la cible. Puis réponds en 2-3 phrases directes.",
        "chiffre_realite": "Commence par un chiffre ou une réalité terrain plausible. Puis fais le lien avec ce que fait la filiale.",
        "avant_apres": "Décris la situation sans la filiale (problème), puis avec (ce qui change). Court et percutant.",
        "astuce_directe": "Partage un réflexe ou une bonne pratique terrain en lien direct avec le service de la filiale. Expert et concret.",
        "contexte_moment": "Lie le post à une situation du moment (saison, actualité métier) en lien avec le domaine de la filiale.",
    }

    interdit_line = f"\nTu ne mentionnes JAMAIS : {bu['interdit']}" if bu["interdit"] else ""

    system_prompt = f"""Tu es community manager de Groupe Cohesif, un groupe français multi-sectoriel.

Tu rédiges un post pour la filiale : {bu['name']}
Son domaine UNIQUE : {bu['domain']}

RÈGLE ABSOLUE — COHÉRENCE :
Tu parles UNIQUEMENT de ce que fait {bu['name']}.{interdit_line}
Si le post parle d'un sujet hors de ce domaine, c'est une erreur grave. Reste strictement dans le périmètre.

STYLE OBLIGATOIRE :
- 60 à 120 mots maximum — pas un mot de plus
- Tutoiement STRICT : "tu", "toi", "ton", "ta" — JAMAIS "on", "nous", "notre", "votre"
- Tu t'adresses DIRECTEMENT à une seule personne : le client potentiel
- Phrases courtes et percutantes. Les fragments sont bienvenus.
- 1 à 2 emojis maximum, placés naturellement
- Zéro hashtag
- Zéro formule creuse : "n'hésitez pas", "nous sommes fiers", "solutions innovantes", "dans un monde"
- Termine TOUJOURS par : 👉 {bu['url']}

STRUCTURE :
1. Accroche forte (question OU constat choc OU chiffre)
2. 2 à 4 phrases courtes en "tu"
3. 👉 {bu['url']}"""

    user_prompt = f"""Filiale : {bu['name']}
Domaine : {bu['domain']}
Services : {bu['services']}
Cible : {bu['audience']}

Angle : {theme_instructions[theme]}

Écris le post. 60 à 120 mots. Tutoiement strict (tu/ton/ta, jamais on/nous). Pas de hashtags. Termine par 👉 {bu['url']}
Uniquement le texte du post, sans titre ni commentaire."""

    message = client.messages.create(
        model="claude-opus-5",
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    post_text = next(
        block.text for block in message.content if hasattr(block, "text")
    ).strip()

    if bu["url"] not in post_text:
        post_text += f"\n\n👉 {bu['url']}"

    return {
        "business_unit": bu["id"],
        "business_unit_name": bu["name"],
        "theme": theme,
        "slot": slot,
        "text": post_text,
        "date": today.isoformat(),
        "url": bu["url"],
    }


def post_to_facebook(content: dict) -> dict:
    """Publie le post sur la page Facebook professionnelle."""
    page_id = os.environ.get("FACEBOOK_PAGE_ID", "")
    access_token = os.environ.get("FACEBOOK_ACCESS_TOKEN", "")

    if not page_id or not access_token:
        print("[Facebook] Variables manquantes — publication ignorée")
        return {"skipped": True, "reason": "missing_credentials"}

    url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
    payload = {
        "message": content["text"],
        "access_token": access_token,
    }

    response = requests.post(url, data=payload, timeout=30)
    result = response.json()

    if response.status_code == 200 and "id" in result:
        print(f"[Facebook] ✓ Post publié avec succès — ID: {result['id']}")
        return {"success": True, "post_id": result["id"]}
    else:
        print(f"[Facebook] ✗ Échec de publication: {result}")
        return {"success": False, "error": result}


def post_to_linkedin(content: dict) -> dict:
    """Publie le post sur la page organisation LinkedIn."""
    org_id = os.environ.get("LINKEDIN_ORGANIZATION_ID", "")
    access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")

    if not org_id or not access_token:
        print("[LinkedIn] Variables manquantes — publication ignorée")
        return {"skipped": True, "reason": "missing_credentials"}

    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    payload = {
        "author": f"urn:li:organization:{org_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content["text"]},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code == 201:
        post_id = response.headers.get("x-restli-id", "unknown")
        print(f"[LinkedIn] ✓ Post publié avec succès — ID: {post_id}")
        return {"success": True, "post_id": post_id}
    else:
        print(f"[LinkedIn] ✗ Échec: {response.status_code} — {response.text}")
        return {"success": False, "error": response.text, "status_code": response.status_code}


def save_log(content: dict, fb_result: dict, li_result: dict) -> None:
    """Sauvegarde un log JSON de la publication."""
    log_path = Path("social_media/publication_log.json")
    log_path.parent.mkdir(parents=True, exist_ok=True)

    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": content["date"],
        "slot": content["slot"],
        "business_unit": content["business_unit_name"],
        "theme": content["theme"],
        "post_text": content["text"],
        "facebook": fb_result,
        "linkedin": li_result,
    }

    print("\n" + "=" * 60)
    print(f"DATE       : {content['date']}")
    print(f"CRÉNEAU    : {content['slot']}")
    print(f"FILIALE    : {content['business_unit_name']}")
    print(f"THÈME      : {content['theme']}")
    print(f"FACEBOOK   : {'✓' if fb_result.get('success') else ('— ignoré' if fb_result.get('skipped') else '✗')}")
    print(f"LINKEDIN   : {'✓' if li_result.get('success') else ('— ignoré' if li_result.get('skipped') else '✗')}")
    print("=" * 60)
    print("\nTEXTE DU POST:")
    print("-" * 60)
    print(content["text"])
    print("-" * 60 + "\n")

    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log_entry, f, ensure_ascii=False, indent=2)


def main() -> None:
    today = date.today()
    slot = select_slot()
    bu = select_business_unit(today, slot)
    theme = select_theme(today, slot)

    print(f"[{today}] Créneau: {slot} | Filiale: {bu['name']} | Thème: {theme}")

    content = generate_post_content(bu, theme, today, slot)
    fb_result = post_to_facebook(content)
    li_result = post_to_linkedin(content)
    save_log(content, fb_result, li_result)

    errors = [
        fb_result.get("success") is False and not fb_result.get("skipped"),
        li_result.get("success") is False and not li_result.get("skipped"),
    ]
    if any(errors):
        sys.exit(1)


if __name__ == "__main__":
    main()
