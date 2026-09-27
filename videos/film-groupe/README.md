# Film de présentation — Groupe Cohesif

Film institutionnel de 65 s (1920×1080, 30 i/s) présentant le groupe et ses 10 pôles.
Les animations sont codées en HTML/CSS/JS (`film.html`) et exportées image par image en MP4, sans aucun service payant.

## Déroulé

| Temps | Scène |
|---|---|
| 0–7 s | « Bâtir. Connecter. Croître. » |
| 7–12 s | Logo Groupe Cohesif, « Dix pôles d'expertise · Une seule vision » |
| 12–16 s | Compteur « 10 pôles d'expertise complémentaires » |
| 16–51 s | Les 10 pôles, 3,5 s chacun (photo, secteur, accroche, logo) |
| 51–56 s | Citation de Thomas Hoenig |
| 56–60 s | Valeurs : Cohésion · Exigence · Durée |
| 60–65 s | Logo, devise, groupecohesif.fr |

## Modifier le film

- Textes des pôles : tableau `POLES` dans `film.html`.
- Photos : `assets/img/` ; logos : `assets/logos/`.
- Durées : objet `T` dans `film.html`.
- Aperçu : ouvrir `film.html` dans un navigateur, puis `seek(20)` dans la console pour afficher l'instant 20 s.

## Générer la vidéo

```bash
pip install playwright imageio-ffmpeg
python3 render.py groupe-cohesif-film-16x9.mp4 30
# vignettes de contrôle :
python3 render.py apercu 30 --stills=5,20,40
```

## Ajouter une musique

```bash
ffmpeg -i groupe-cohesif-film-16x9.mp4 -i musique.mp3 -c:v copy -c:a aac -b:a 192k \
  -af "afade=t=out:st=61:d=4" -shortest groupe-cohesif-film-16x9-musique.mp4
```
