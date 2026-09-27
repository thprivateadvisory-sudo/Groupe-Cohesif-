"""Rend film.html en MP4 image par image (déterministe).
Usage : python3 render.py [sortie.mp4] [fps] [--stills t1,t2,...]
"""
import sys, subprocess, pathlib, imageio_ffmpeg
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
args = [a for a in sys.argv[1:] if not a.startswith('--')]
out = args[0] if args else str(HERE / 'groupe-cohesif-film.mp4')
fps = int(args[1]) if len(args) > 1 else 30
stills = next((a.split('=')[1] for a in sys.argv if a.startswith('--stills=')), None)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CHROME)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((HERE / 'film.html').as_uri())
    pg.evaluate('document.fonts.ready')
    pg.wait_for_function('[...document.images].every(i=>i.complete)')
    pg.wait_for_timeout(500)
    if stills:
        for t in stills.split(','):
            pg.evaluate(f'seek({t})')
            pg.screenshot(path=f'{out}_{t}.jpg', type='jpeg', quality=85)
        sys.exit()
    dur = pg.evaluate('DURATION')
    n = int(dur * fps)
    ff = subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', str(fps), '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        pg.evaluate(f'seek({i / fps})')
        ff.stdin.write(pg.screenshot(type='png'))
        if i % 150 == 0: print(f'{i}/{n}', flush=True)
    ff.stdin.close(); ff.wait()
    print('ok', out)
