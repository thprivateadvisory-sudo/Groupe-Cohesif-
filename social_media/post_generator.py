#!/usr/bin/env python3
"""Générateur et publieur de posts quotidiens pour Groupe Cohesif.

Publie 1 post par jour sur Facebook Page et LinkedIn Organization,
en rotation automatique entre les 10 filiales du groupe.

Secrets GitHub requis:
  ANTHROPIC_API_KEY        - Clé API Claude (Anthropic)
  FACEBOOK_PAGE_ID         - ID de la page Facebook professionnelle
  FACEBOOK_ACCESS_TOKEN    - Token d'accès Page Facebook (ne jamais expirer)
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
        "tagline": "Le partenaire intégral du football",
        "domain": "Gestion de clubs de football",
        "services": [
            "Délégation de Service Sportif",
            "Affiliations FFF & subventions CNDS",
            "Academy U6-U18",
            "Infrastructure sportive",
            "Transition énergétique des clubs",
            "Flotte & transport",
        ],
        "audience": "Présidents de clubs, collectivités locales, mairies",
        "url": "https://cohesifsport.fr",
    },
    {
        "id": "btp",
        "name": "Cohesif BTP",
        "tagline": "Construire, rénover, livrer",
        "domain": "Construction & Bâtiment",
        "services": [
            "Construction neuve",
            "Rénovation & extension",
            "Gros œuvre & second œuvre",
            "Gestion de chantier clé en main",
            "Réhabilitation énergétique",
        ],
        "audience": "Promoteurs, collectivités, entreprises, particuliers",
        "url": "https://cohesifbtp.fr",
    },
    {
        "id": "energy",
        "name": "Cohesif Energy",
        "tagline": "Énergie & mobilité durables",
        "domain": "Énergie & Transition Écologique",
        "services": [
            "Installation panneaux solaires",
            "Bornes de recharge électrique",
            "Audit énergétique",
            "Optimisation des consommations",
            "Mobilité électrique pour flottes",
        ],
        "audience": "Entreprises, clubs sportifs, collectivités, particuliers",
        "url": "https://cohesifenergy.fr",
    },
    {
        "id": "agro",
        "name": "Cohesif Agro",
        "tagline": "Sourcing agroalimentaire de qualité",
        "domain": "Agroalimentaire & Sourcing",
        "services": [
            "Sourcing produits alimentaires",
            "Approvisionnement collectivités",
            "Circuits courts & locaux",
            "Gestion des stocks alimentaires",
            "Restauration collective",
        ],
        "audience": "Restaurants, cantines, clubs sportifs, collectivités",
        "url": "https://cohesifagro.fr",
    },
    {
        "id": "auto",
        "name": "Cohesif Auto",
        "tagline": "Flotte & mobilité professionnelle",
        "domain": "Automobile & Transport",
        "services": [
            "Gestion de flottes automobiles",
            "Véhicules électriques & hybrides",
            "Location longue durée",
            "Maintenance & entretien",
            "Transport sportif & événementiel",
        ],
        "audience": "Entreprises, associations sportives, collectivités",
        "url": "https://cohesifauto.fr",
    },
    {
        "id": "commerce",
        "name": "Cohesif Commerce",
        "tagline": "Solutions commerciales sur mesure",
        "domain": "Commerce & Distribution",
        "services": [
            "Distribution de produits",
            "Sourcing & achats groupés",
            "Gestion des approvisionnements",
            "E-commerce & logistique",
            "Merchandising & PLV",
        ],
        "audience": "Commerçants, distributeurs, grandes surfaces, clubs",
        "url": "https://cohesifcommerce.fr",
    },
    {
        "id": "leasing",
        "name": "Cohesif Leasing",
        "tagline": "Financement & location professionnelle",
        "domain": "Leasing & Financement",
        "services": [
            "Leasing matériel professionnel",
            "Location longue durée véhicules",
            "Financement équipements sportifs",
            "Solutions de crédit-bail",
            "Rachat de matériel",
        ],
        "audience": "TPE, PME, associations, clubs sportifs",
        "url": "https://cohesifleasing.fr",
    },
    {
        "id": "access",
        "name": "Cohesif Access",
        "tagline": "Contrôle d'accès & sécurité",
        "domain": "Sécurité & Contrôle d'Accès",
        "services": [
            "Systèmes de contrôle d'accès",
            "Vidéosurveillance",
            "Badges & biométrie",
            "Sécurité événementielle",
            "Gestion des flux & stades",
        ],
        "audience": "Clubs sportifs, stades, entreprises, collectivités",
        "url": "https://cohesifaccess.fr",
    },
    {
        "id": "net",
        "name": "Cohesif Net",
        "tagline": "Digital & connectivité",
        "domain": "Digital & Réseau",
        "services": [
            "Infrastructure réseau & fibre",
            "Solutions WiFi & connectivité stades",
            "Sites web & applications",
            "Marketing digital",
            "Cybersécurité",
        ],
        "audience": "Clubs sportifs, entreprises, collectivités, startups",
        "url": "https://cohesifnet.fr",
    },
    {
        "id": "negoce",
        "name": "Cohesif Négoce",
        "tagline": "Matériaux & négoce professionnel",
        "domain": "Négoce & Matériaux",
        "services": [
            "Négoce de matériaux de construction",
            "Sourcing matières premières",
            "Import-export",
            "Gestion des stocks",
            "Approvisionnement chantiers",
        ],
        "audience": "Artisans, constructeurs, promoteurs, industriels",
        "url": "https://cohesifnegoce.fr",
    },
    {
        "id": "groupe",
        "name": "Groupe Cohesif",
        "tagline": "Un groupe, dix expertises",
        "domain": "Groupe multi-sectoriel",
        "services": [
            "Expertise multi-sectorielle",
            "Accompagnement global des projets",
            "Solutions intégrées",
            "Partenariat long terme",
            "Présence nationale",
        ],
        "audience": "Dirigeants, investisseurs, collectivités, grands comptes",
        "url": "https://groupecohesif.fr",
    },
]

# ---------------------------------------------------------------------------
# Thèmes de posts pour varier le contenu
# ---------------------------------------------------------------------------
POST_THEMES = [
    "conseil_pratique",
    "mise_en_avant_service",
    "temoignage_fictif",
    "statistique_secteur",
    "question_engagement",
    "astuce_metier",
    "success_story",
]


def select_business_unit(today: date) -> dict:
    """Sélectionne la filiale du jour par rotation ou par override."""
    override = os.environ.get("BUSINESS_UNIT_OVERRIDE", "").strip()
    if override:
        for bu in BUSINESS_UNITS:
            if bu["id"] == override:
                return bu

    day_of_year = today.timetuple().tm_yday
    return BUSINESS_UNITS[day_of_year % len(BUSINESS_UNITS)]


def select_theme(today: date) -> str:
    """Sélectionne le thème du post selon le jour."""
    day_of_year = today.timetuple().tm_yday
    return POST_THEMES[(day_of_year // len(BUSINESS_UNITS)) % len(POST_THEMES)]


def generate_post_content(bu: dict, theme: str, today: date) -> dict:
    """Génère le contenu du post via Claude API."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    day_name = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"][
        today.weekday()
    ]
    month_name = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ][today.month - 1]

    theme_instructions = {
        "conseil_pratique": "Donne un conseil pratique et actionnable lié à l'activité",
        "mise_en_avant_service": "Mets en avant un service spécifique avec ses bénéfices concrets",
        "temoignage_fictif": "Crée un témoignage client inspirant (fictif mais réaliste, sans nom réel)",
        "statistique_secteur": "Partage une statistique ou tendance du secteur (réaliste)",
        "question_engagement": "Pose une question engageante pour susciter des commentaires",
        "astuce_metier": "Partage une astuce métier experte",
        "success_story": "Raconte une mini success story d'un projet réussi (fictif mais réaliste)",
    }

    prompt = f"""Tu es le community manager du {bu['name']}, filiale du Groupe Cohesif.

Contexte de la filiale:
- Nom: {bu['name']}
- Slogan: {bu['tagline']}
- Domaine: {bu['domain']}
- Services: {', '.join(bu['services'])}
- Cible: {bu['audience']}
- Site web: {bu['url']}

Date du jour: {day_name} {today.day} {month_name} {today.year}
Thème demandé: {theme_instructions[theme]}

Crée UN post pour les réseaux sociaux professionnels (Facebook et LinkedIn).

Contraintes OBLIGATOIRES:
- Rédigé en français, ton professionnel mais accessible
- Entre 150 et 280 mots
- Commence par une accroche forte (1ère phrase percutante)
- Contient 3-5 emojis pertinents bien placés (pas en excès)
- Se termine OBLIGATOIREMENT par un appel à l'action incluant le lien du site web: {bu['url']}
  Exemple de formulation: "🌐 Découvrez nos solutions sur {bu['url']}" ou "Visitez {bu['url']} pour en savoir plus."
- Se termine par 5-8 hashtags pertinents (#CohesifSport, #{bu['name'].replace(' ', '')}, etc.)
- Adapté au secteur {bu['domain']}
- NE mentionne PAS de prix, promotions ou offres spécifiques
- NE cite PAS de clients réels

Réponds UNIQUEMENT avec le texte du post, sans introduction ni commentaire."""

    message = client.messages.create(
        model="claude-opus-5",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    # Le modèle peut retourner un ThinkingBlock avant le TextBlock
    post_text = next(
        block.text for block in message.content if hasattr(block, "text")
    ).strip()

    # Garantir que le lien est présent même si Claude l'a omis
    if bu["url"] not in post_text:
        post_text += f"\n\n🌐 Plus d’infos : {bu['url']}"

    return {
        "business_unit": bu["id"],
        "business_unit_name": bu["name"],
        "theme": theme,
        "text": post_text,
        "date": today.isoformat(),
        "url": bu["url"],
    }


def post_to_facebook(content: dict) -> dict:
    """Publie le post sur la page Facebook professionnelle."""
    page_id = os.environ.get("FACEBOOK_PAGE_ID", "")
    access_token = os.environ.get("FACEBOOK_ACCESS_TOKEN", "")

    if not page_id or not access_token:
        print("[Facebook] Variables FACEBOOK_PAGE_ID ou FACEBOOK_ACCESS_TOKEN manquantes — publication ignorée")
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
        print("[LinkedIn] Variables LINKEDIN_ORGANIZATION_ID ou LINKEDIN_ACCESS_TOKEN manquantes — publication ignorée")
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
                "shareCommentary": {
                    "text": content["text"]
                },
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
        print(f"[LinkedIn] ✗ Échec de publication: {response.status_code} — {response.text}")
        return {"success": False, "error": response.text, "status_code": response.status_code}


def save_log(content: dict, fb_result: dict, li_result: dict) -> None:
    """Sauvegarde un log JSON de la publication."""
    log_path = Path("social_media/publication_log.json")
    log_path.parent.mkdir(parents=True, exist_ok=True)

    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": content["date"],
        "business_unit": content["business_unit_name"],
        "theme": content["theme"],
        "post_text": content["text"],
        "facebook": fb_result,
        "linkedin": li_result,
    }

    print("\n" + "=" * 60)
    print(f"DATE       : {content['date']}")
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
    bu = select_business_unit(today)
    theme = select_theme(today)

    print(f"[{today}] Génération du post pour {bu['name']} (thème: {theme})...")

    content = generate_post_content(bu, theme, today)
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
