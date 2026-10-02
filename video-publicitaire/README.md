# Groupe Cohesif — Film publicitaire corporate

Film de 2 min 29 s, sans voix off, réalisé entièrement en code (motion design HTML/CSS/JS rendu image par image, musique et sound design synthétisés). Aucun générateur vidéo IA, aucune banque de sons externe.

## Fichiers livrés (`renders/`)

| Fichier | Format | Usage |
|---|---|---|
| `GroupeCohesif_Film_16x9.mp4` | 1920×1080, 30 i/s | Master : YouTube, site, LinkedIn, présentations |
| `GroupeCohesif_Film_9x16.mp4` | 1080×1920, 30 i/s | TikTok, Reels, Shorts, publicités mobiles |
| `GroupeCohesif_Film_1x1.mp4` | 1080×1080, 30 i/s | Formats sociaux carrés |

Chaque format a sa propre mise en page (navigation des pôles, boutique, étapes), pas un simple recadrage. Audio : AAC stéréo, normalisé à −14 LUFS.

## Déroulé

| Temps | Scène |
|---|---|
| 0:00 | Introduction : logo, « Un groupe. / Plusieurs expertises. / Des solutions pour vos projets. » |
| 0:12 | Qui sommes-nous : Construire · Approvisionner · Équiper · Transporter · Accompagner |
| 0:19 | Écosystème interactif : navigation dans les 10 pôles (BTP, Négoce, Energy, Auto, Commerce, Access, Agro, Sport, Net, Leasing) |
| 1:00 | Boutique en ligne, en 8 étapes : arrivée, catégorie, produit, fiche, panier, commande, confirmation |
| 1:24 | Comment ça se passe : choisir → commander → préparer → expédier → recevoir |
| 1:34 | Plus qu'une boutique : projet, chantier, approvisionnement, matériel, énergie, transport |
| 1:46 | Plusieurs activités. Un seul groupe. À votre écoute. |
| 1:53 | Confiance : identifier le besoin, orienter vers la solution adaptée |
| 2:02 | Nous contacter : chat en ligne des sites, demande de rappel par un agent, WhatsApp 07 56 85 57 27, e-mail |
| 2:14 | Final : Un besoin ? Un projet ? Un chantier ? Une commande ? → www.groupecohesif.fr · WhatsApp · contact@groupecohesif.fr |

## Sources des contenus

Toutes les informations affichées viennent des sites du groupe (dépôts `Groupe-Cohesif-`, `cohesif-energy`, `Cohesif-commerce`, etc.) :
- descriptions des pôles : section « Nos pôles » de groupecohesif.fr ;
- boutique : catalogue réel `cohesif-energy/data/boutique.json` (noms, prix TTC, « Livraison offerte en France métropolitaine », « Expédiée sous 7 à 12 jours ouvrés », « Garantie 2 ans ») et parcours réel `cohesifcommerce.fr/commande` (Récapitulatif → Livraison et paiement → Confirmation) ;
- chat en ligne et rappel : assistant des sites (Cohesif Energy, Commerce, Auto, Sport), parcours « Parler à un agent » → numéro de téléphone → « Demande enregistrée » ;
- photos et logos : ceux publiés sur les sites des pôles, affichés sans agrandissement au-delà de leur résolution d'origine.

Aucun nom de personne, SIREN/SIRET, chiffre, avis, partenaire ou certification n'apparaît dans le film.

**À vérifier avant diffusion :** les prix de la boutique (catalogue du 27/09/2026) sont visibles à l'écran. S'ils changent, modifiez `PR` et les montants dans `src/timeline.js`, puis relancez le rendu.

## Modifier et refaire le rendu

Prérequis : Node 18+ avec Playwright (Chromium), Python 3 avec numpy et scipy, ffmpeg.

```bash
./tools/build_all.sh                 # les 3 formats (~25 min sur 4 cœurs)
FORMATS=land ./tools/build_all.sh    # master 16:9 seul
node tools/render.js --format land --stills 10,40,70 --outdir previews   # images de contrôle
```

- `src/timeline.js` : toutes les scènes, textes et minutages (fonction `renderAt(t)`, déterministe) ;
- `src/style.css` : direction artistique (noir, bleu nuit, blanc, touches d'or ; Montserrat et Inter) ;
- `tools/music.py` : musique originale (Ré mineur, 100 BPM) et effets sonores, calés sur les repères `CUES` exportés par la timeline ;
- `tools/render.js` : capture image par image dans Chromium headless et encodage H.264.

On peut aussi prévisualiser une image dans un navigateur : servir `src/` puis ouvrir `index.html?t=42`.
