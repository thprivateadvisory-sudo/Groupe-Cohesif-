# Clip « J'connais »

Ce script monte un clip YouTube à partir de vidéos libres de droits (Pexels, Pixabay, Mixkit). Il n'affiche aucune parole à l'écran.

```bash
pip install librosa soundfile        # pour caler les coupes sur le rythme
export PEXELS_API_KEY=xxxx           # gratuit : https://www.pexels.com/api/
python3 make_clip.py --audio morceau.mp3
```

Résultat : `jconnais_clip.mp4`, en 1080p, au format cinémascope, avec l'étalonnage, le grain et les coupes calés sur le BPM. Le fichier `jconnais_clip.credits.txt` liste la source de chaque vidéo utilisée.

## Le clip, section par section

| Section | Images | Montage |
|---|---|---|
| Intro | Ville de nuit vue du ciel, rue vide, silhouette seule, corbeaux | Lent, un plan toutes les 8 temps, ralenti |
| Refrains | Foules au ralenti, visages, néons, voiture de nuit | Nerveux, coupe toutes les 2 temps, flash blanc |
| Couplet 1 | Ville calme, téléphone, carnet, studio, petite salle vide | Une coupe toutes les 4 temps |
| Couplet 2 | Intérieur de voiture, lumières derrière la vitre, toit, pluie, tunnel | Une coupe toutes les 4 temps |
| Pont | Gros plans sur des yeux et des mains, fumée, lever du soleil | Très lent, ralenti à 0,6× |
| Dernier refrain | Néons, autoroute en accéléré, concert | Une coupe à chaque temps |
| Outro | Route vide, aube, silhouette qui s'éloigne | Fondu au noir |

## Options

- `--sections sections.json` : pour caler les sections à la seconde près, par exemple `{"intro":[0,18],"refrain1":[18,40],...}`.
- `--local-dir mes_rushs/` : pour utiliser tes propres images. Fais un sous-dossier par section (`intro/`, `refrain1/`…).
- `--seed 12` : produit un autre montage avec les mêmes rushs.
- Pour changer l'ambiance, modifie les mots-clés de recherche dans la liste `TREATMENT` en haut du script.
