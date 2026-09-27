"""Prépare les logos pour fond sombre : fond blanc retiré (bords lissés)
et encre sombre (noir, bleu marine, vert foncé) passée en blanc cassé.
Usage : python3 tools/logos_clairs.py   (depuis videos/film-groupe, dépôts voisins requis)
"""
import numpy as np, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[4]   # /home/user
OUT = pathlib.Path(__file__).resolve().parents[1] / 'assets/logos-clairs'
OUT.mkdir(parents=True, exist_ok=True)
INK = np.array([245, 243, 238], float)                # blanc cassé

# clé : (fichier source, seuil de luminance sous lequel l'encre devient claire)
SRC = {
    'groupe':   ('Cohesif-agro/logo-groupe-cohesif.png', .42),
    'commerce': ('Cohesif-commerce/logo.png', .42),
    'access':   ('Cohesif-agro/logo-cohesif-access.png', .30),
    'btp':      ('Cohesif-agro/logo-cohesif-btp.png', .42),
    'auto':     ('Cohesif-auto-new/logo-cohesif-auto-white.png', 0),
    'energy':   ('Groupe-Cohesif-/7F1A72B0-745E-46AB-9AA7-CCD2D21BF461.png', .58),
    'agro':     ('Cohesif-agro/logo-cohesif-agro.png', .42),
    'negoce':   ('cohesifnegoce/img/logo-cohesif-negoce.png', .58),
    'sport':    ('cohesif-sport/logo-cohesif.png', 0),
    'net':      ('Cohesif-net-/logo.png', .42),
    'leasing':  ('Cohesif-leasing-/e2a5f6bc-a5b7-4ab2-a1aa-3129e8f78359.png', .42),
}

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

for key, (src, thr) in SRC.items():
    im = Image.open(ROOT / src)
    had_alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 250
    a = np.asarray(im.convert('RGBA'), float)
    rgb, alpha = a[..., :3], a[..., 3] / 255
    if not had_alpha:
        # retrait du fond blanc : alpha selon l'écart au blanc, puis « dé-mélange »
        diff = (255 - rgb).max(-1)
        alpha = np.clip((diff - 10) / 70, 0, 1)
        safe = np.maximum(alpha, 1e-3)[..., None]
        rgb = np.clip((rgb - (1 - alpha[..., None]) * 255) / safe, 0, 255)
    else:
        alpha = alpha * (rgb.max(-1) < 250) + alpha * (rgb.max(-1) >= 250) * (a[..., 3] > 40)
    if thr:
        lum = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]) / 255
        k = smoothstep(thr, thr - 0.14, lum)[..., None]
        rgb = rgb * (1 - k) + INK * k
    out = Image.fromarray(np.dstack([rgb, alpha * 255]).round().astype('uint8'), 'RGBA')
    out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
    out.thumbnail((1400, 1400), Image.LANCZOS)
    out.save(OUT / f'{key}.png')
    print(key, out.size)
