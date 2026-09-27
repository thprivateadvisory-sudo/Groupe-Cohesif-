import sys, torch
from TTS.api import TTS
M='/tmp/vid/css10/tts_models--fr--css10--vits'
tts=TTS(model_path=M+'/model_file.pth.tar', config_path=M+'/config.json')
lines={
 'v1':"Construire. Importer. Produire. Innover.",
 'v2':"Partout en France, un groupe réunit les métiers qui font avancer l'économie réelle.",
 'v3':"Immobilier, BTP, commerce, automobile, énergie, sport, agroalimentaire, intelligence artificielle.",
 'v4':"Une seule exigence : l'excellence.",
 'v5':"Groupe Cohésif. Ensemble, plus loin.",
}
for k,v in lines.items():
    tts.tts_to_file(text=v, file_path=f'/tmp/vid/{k}.wav')
