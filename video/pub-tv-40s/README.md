# Publicité TV 40 s — Groupe Cohesif

`groupe-cohesif-pub-tv-40s.mp4` : 1920×1080, 24 i/s, cadre anamorphique 2.39:1, étalonnage or / noir profond / blanc cassé.

Tout a été généré sans frais et sans banque d'images :

- **Image** : 8 plans en 3D temps réel (three.js), rendus image par image dans Chromium headless (`source/`).
- **Voix off** : synthèse neuronale française (Coqui TTS, modèle VITS CSS10), grave, ralentie et abaissée d'environ 2 demi-tons.
- **Musique** : orchestrale épique synthétisée en Python (`music.py`), avec un drop sur le plan 8 et un impact à l'apparition du logo. Libre de droits.

## Régénérer

```bash
cd source
npm i three playwright-core
node server.js &                                  # sert index.html sur :8765
node render.js full video.mp4 24 0 40             # rendu vidéo
python tts.py                                     # v1..v5.wav
for f in v1 v2 v3 v4 v5; do ffmpeg -i $f.wav -af "rubberband=pitch=0.9:tempo=0.93,highpass=f=70,acompressor=threshold=-20dB:ratio=3,aresample=48000" -ac 1 ${f}p.wav; done
python music.py                                   # musique + mix voix (mix.wav)
ffmpeg -i video.mp4 -i mix.wav -c:v copy -c:a aac -b:a 256k -shortest out.mp4
```

`./prev.sh <plan> t1 t2 t3 t4` produit une planche d'aperçu d'un plan (temps globaux).
