#!/usr/bin/env bash
# Rendu complet : vidéo (3 formats) + musique/sound design + mixage final.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p renders
node tools/render.js --format land --cues renders/cues.json
python3 tools/music.py renders/cues.json renders/_audio_raw.wav
# normalisation diffusion web / réseaux sociaux : -14 LUFS, crête -1,5 dBTP
ffmpeg -y -loglevel error -i renders/_audio_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 renders/audio_master.wav
for f in ${FORMATS:-land port sq}; do
  case $f in land) name=16x9;; port) name=9x16;; sq) name=1x1;; esac
  node tools/render.js --format $f --out renders/_video_$f.mp4 --workers ${WORKERS:-3}
  ffmpeg -y -loglevel error -i renders/_video_$f.mp4 -i renders/audio_master.wav -map 0:v -map 1:a \
    -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest renders/GroupeCohesif_Film_${name}.mp4
  rm -f renders/_video_$f.mp4
  echo "OK renders/GroupeCohesif_Film_${name}.mp4"
done
