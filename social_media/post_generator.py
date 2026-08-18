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
    "retour_experience",
    "tendance_secteur",
    "question_engagement",
    "astuce_metier",
    "success_story",
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
    half = len(BUSINESS_UNITS) // 2 + 1  # décalage de 6 pour 11 filiales
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

    day_name = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"][
        today.weekday()
    ]
    month_name = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ][today.month - 1]

    theme_instructions = {
        "conseil_pratique": """Partage un conseil concret et opérationnel qu'un expert terrain donnerait à un professionnel du secteur.
Le conseil doit être précis, ancré dans une réalité vécue — pas une généralité.
Structure naturelle : observation terrain → conseil précis → pourquoi ça change vraiment les choses.
Evite les intro du type 'Voici nos conseils...' — entre directement dans le vif.""",

        "mise_en_avant_service": """Mets en lumière un aspect concret de l'activité avec une approche narrative.
Commence par un constat terrain (un problème réel rencontré par les clients de la filiale),
enchaîne sur la façon dont la filiale y répond, avec des détails précis.
Pas de liste à puces — raconte plutôt qu'énumère. Le lecteur doit se reconnaître dans la situation décrite.""",

        "retour_experience": """Rédige le retour d'expérience d'un client type (fictif, anonymisé, réaliste).
Utilise des détails crédibles : type de structure précis (club de N3, PME de 30 salariés, mairie de 12 000 hab...),
le défi concret rencontré, comment la filiale est intervenue, et le résultat tangible.
Ecris à la troisième personne. Pas de nom réel. Le réalisme des détails fait la crédibilité.""",

        "tendance_secteur": """Prends appui sur une tendance concrète du secteur pour ouvrir une réflexion professionnelle.
La donnée ou observation doit être plausible et ancrée dans l'actualité du métier.
Contextualise ensuite par rapport à ce que fait la filiale — sans vendre, juste éclairer.
Ton analytique, celui d'un praticien qui observe son marché.""",

        "question_engagement": """Pose une vraie question qui interpelle les professionnels du secteur.
Pas une question rhétorique creuse — une question sur un arbitrage difficile, un choix réel,
une tension connue dans ce métier. Développe le contexte en 2-3 phrases avant de poser la question,
pour que le lecteur comprenne l'enjeu. L'objectif : susciter des réponses sincères.""",

        "astuce_metier": """Partage une bonne pratique concrète issue de l'expérience terrain.
Quelque chose que peu de gens font, ou qui fait vraiment la différence dans ce secteur.
Ton expert et pédagogique — celui d'un professionnel qui partage ce qu'il a appris,
pas d'un commercial qui vend. Sois spécifique, pas générique.""",

        "success_story": """Raconte un mini-projet réussi avec une vraie structure narrative : contexte → enjeu → intervention → impact.
Donne des détails réalistes (type de client, envergure du projet, contrainte clé, résultat mesurable).
Fictif mais entièrement crédible. Pas de superlatifs — les faits parlent d'eux-mêmes.
Evite la formule 'nous sommes fiers de' — montre plutôt.""",
    }

    system_prompt = """Tu es directeur de la communication de Groupe Cohesif, un groupe français multi-sectoriel.
Tu as 15 ans d'expérience en communication B2B et tu maîtrises parfaitement les codes des réseaux sociaux professionnels en France.

Ton rôle : rédiger des posts qui font autorité dans leur secteur. Tes publications doivent avoir la qualité d'un community manager senior — humaines, expertes, engageantes, jamais commerciales.

Ce que tu évites absolument :
- Les formules vides : "Chez [nom], nous sommes fiers de...", "N'hésitez pas à nous contacter", "Des solutions innovantes", "Dans un monde en constante évolution", "Au cœur de vos enjeux"
- Les listes à puces qui remplacent un vrai propos rédigé
- Les emojis en début de chaque ligne, comme de la décoration
- Les superlatifs non justifiés : "leader", "expert incontournable", "numéro 1", "révolutionnaire"
- Le ton publicitaire ou les phrases de slogan
- Les introductions génériques avant d'entrer dans le sujet
- Le mot "solutions" employé de façon abstraite et creuse
- Les hashtags en milieu de texte (seulement en fin de post)

Ce qui caractérise un bon post professionnel :
- Une première phrase qui accroche parce qu'elle dit quelque chose de vrai et de précis
- Un développement qui apporte une vraie valeur : informationnelle, narrative ou réflexive
- Le ton d'un praticien qui partage son expertise, pas d'un commercial qui vend
- Des emojis utilisés avec parcimonie (3 à 5 maximum), placés naturellement dans le texte, jamais en décoration
- Un appel à l'action discret mais clair, qui donne envie — pas une injonction
- Des hashtags pertinents en fin de post, sur une ligne séparée"""

    user_prompt = f"""Filiale : {bu['name']}
Slogan : {bu['tagline']}
Secteur : {bu['domain']}
Services : {', '.join(bu['services'][:4])}
Cible professionnelle : {bu['audience']}
Site web : {bu['url']}

Date : {day_name} {today.day} {month_name} {today.year}

Type de post :
{theme_instructions[theme]}

Contraintes :
- Entre 150 et 280 mots, pas un mot de plus
- Rédigé en français, ton professionnel et humain
- Le lien {bu['url']} doit apparaître dans l'appel à l'action final, de façon naturelle
  (ex : "Plus d'informations sur {bu['url']}" ou "Retrouvez-nous sur {bu['url']}")
- Terminer par 5 à 8 hashtags pertinents sur une ligne séparée
  Inclure obligatoirement : #{bu['name'].replace(' ', '')} #GroupeCohesif
  Compléter avec des hashtags sectoriels pertinents pour {bu['domain']}
- Ne pas mentionner de tarifs, offres ou promotions
- Ne pas citer de noms de clients ou partenaires réels

Ecris uniquement le texte du post, sans titre, sans guillemets, sans commentaire."""

    message = client.messages.create(
        model="claude-opus-5",
        max_tokens=1200,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Le modèle peut retourner un ThinkingBlock avant le TextBlock
    post_text = next(
        block.text for block in message.content if hasattr(block, "text")
    ).strip()

    # Garantir que le lien est présent même si Claude l'a omis
    if bu["url"] not in post_text:
        post_text += f"\n\n🌐 {bu['url']}"

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
