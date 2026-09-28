# Vidéo de présentation — Groupe Cohesif

`groupe-cohesif-presentation.mp4` : 38 s, 1080×1920 (9:16), 60 i/s, son AAC −14 LUFS.
Format prévu pour TikTok, Reels Instagram, Facebook, LinkedIn et YouTube Shorts.

## Déroulé
| Temps | Séquence |
|---|---|
| 0–4 s | Accroche : « 10 expertises. » → « 1 seul groupe. » |
| 4–8 s | Révélation du logo doré — Bâtir. Connecter. Croître. |
| 8–23 s | Les 10 pôles en slides (clic + transition à chaque pôle) |
| 23–28 s | Grille des 10 pôles reliés — « 10 pôles. Une seule vision. » |
| 28–32 s | Citation de Thomas Hoenig — « On construit pour que ça dure. » |
| 32–38 s | Écran final : groupecohesif.fr + « Suis l'aventure » |

## Régénérer
Sources dans `source/` : `index.html` (animation image par image), `audio.py` (bande-son et bruitages
synthétisés, sans droits tiers), `render.js` (capture Playwright à 120 i/s fusionnée en 60 i/s pour le flou de mouvement).

```bash
cd source
python3 audio.py                                   # -> music.wav
node render.js video raw.mp4 60 0 38 2             # -> vidéo sans son
ffmpeg -i raw.mp4 -i music.wav -filter_complex "[0:v]noise=c0s=5:c0f=t+u,eq=contrast=1.04:saturation=1.06,format=yuv420p[v];[1:a]acompressor=threshold=-18dB:ratio=2.5:attack=15:release=200:makeup=2,loudnorm=I=-14:TP=-1.2:LRA=9[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 17 -maxrate 14M -bufsize 28M -r 60 -c:a aac -b:a 256k -movflags +faststart groupe-cohesif-presentation.mp4
```
