# Configuration — Publication Automatique Réseaux Sociaux

Ce guide explique comment configurer l'automatisation de publication quotidienne
sur Facebook et LinkedIn pour le Groupe Cohesif.

## Fonctionnement

- **Fréquence** : 1 post par jour à 9h (heure de Paris)
- **Rotation** : les 10 filiales du groupe + le groupe en général (11 entités)
- **Plateformes** : Facebook Page professionnelle + LinkedIn Organisation
- **Contenu** : généré par Claude (Anthropic) en français, adapté à chaque filiale
- **Déclenchement manuel** : possible depuis l'onglet Actions de GitHub

---

## Étape 1 — Créer une Application Facebook

1. Rendez-vous sur [developers.facebook.com](https://developers.facebook.com)
2. Créez une nouvelle application → type **Business**
3. Ajoutez le produit **Facebook Login** et **Pages API**
4. Dans "Paramètres" → "Avancés", passez l'app en mode **Live**
5. Générez un **Page Access Token permanent** :
   - Utilisez l'[Explorateur API Graph](https://developers.facebook.com/tools/explorer/)
   - Sélectionnez votre app et votre page
   - Ajoutez les permissions : `pages_manage_posts`, `pages_read_engagement`
   - Cliquez "Générer un token" puis échangez-le contre un token longue durée
6. Récupérez l'**ID de votre page** (visible dans les paramètres de la page Facebook)

---

## Étape 2 — Créer une Application LinkedIn

1. Rendez-vous sur [linkedin.com/developers](https://www.linkedin.com/developers/apps)
2. Créez une nouvelle application
3. Associez-la à votre **Page Organisation LinkedIn**
4. Dans "Auth" → ajoutez le scope : `w_organization_social`
5. Générez un **Access Token** via OAuth 2.0 (durée : 60 jours, renouvellement nécessaire)
6. Récupérez l'**Organization ID** : visible dans l'URL de votre page LinkedIn
   (ex: `https://www.linkedin.com/company/12345678/` → ID = `12345678`)

> **Note** : Le token LinkedIn expire après 60 jours. Pensez à le renouveler
> régulièrement ou à mettre en place un flux de renouvellement automatique.

---

## Étape 3 — Obtenir une clé API Anthropic (Claude)

1. Connectez-vous sur [console.anthropic.com](https://console.anthropic.com)
2. Allez dans **API Keys** → **Create Key**
3. Copiez la clé (commence par `sk-ant-...`)

---

## Étape 4 — Configurer les Secrets GitHub

Dans le dépôt GitHub **groupe-cohesif-** :

1. Allez dans **Settings** → **Secrets and variables** → **Actions**
2. Cliquez **New repository secret** et ajoutez les 5 secrets suivants :

| Nom du secret | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | Votre clé API Claude (`sk-ant-...`) |
| `FACEBOOK_PAGE_ID` | L'ID numérique de votre page Facebook |
| `FACEBOOK_ACCESS_TOKEN` | Le Page Access Token longue durée |
| `LINKEDIN_ORGANIZATION_ID` | L'ID numérique de votre organisation LinkedIn |
| `LINKEDIN_ACCESS_TOKEN` | Le token OAuth2 LinkedIn |

---

## Étape 5 — Activer le workflow

1. Allez dans l'onglet **Actions** du dépôt GitHub
2. Activez les GitHub Actions si demandé
3. Sélectionnez **"Publication Réseaux Sociaux Quotidienne"**
4. Cliquez **"Run workflow"** pour tester manuellement

---

## Publication manuelle

Vous pouvez déclencher une publication à tout moment :

1. Onglet **Actions** → **"Publication Réseaux Sociaux Quotidienne"**
2. Cliquez **"Run workflow"**
3. Choisissez optionnellement une filiale spécifique à mettre en avant
4. Cliquez **"Run workflow"**

---

## Rotation des filiales

Le système tourne automatiquement entre les 11 entités :

| Numéro | Filiale | Domaine |
|---|---|---|
| 1 | Cohesif Sport | Gestion clubs football |
| 2 | Cohesif BTP | Construction & Bâtiment |
| 3 | Cohesif Energy | Énergie & Transition écologique |
| 4 | Cohesif Agro | Agroalimentaire & Sourcing |
| 5 | Cohesif Auto | Automobile & Flotte |
| 6 | Cohesif Commerce | Commerce & Distribution |
| 7 | Cohesif Leasing | Financement & Location |
| 8 | Cohesif Access | Sécurité & Contrôle d'accès |
| 9 | Cohesif Net | Digital & Réseau |
| 10 | Cohesif Négoce | Matériaux & Négoce |
| 11 | Groupe Cohesif | Vision groupe |

---

## Logs et suivi

Après chaque publication :
- Un fichier `publication_log.json` est généré et archivé dans GitHub Actions
- Consultez l'onglet **Actions** pour voir l'historique et les logs détaillés
- En cas d'erreur, le workflow échoue et GitHub vous envoie une notification par email
