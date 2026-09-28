import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 38.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
BPM = 120; B = 60 / BPM
TG, TQ, TE = 23.0, 28.0, 32.0

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); verb_send = np.zeros((N, 2))

def t_(d): return np.arange(int(SR * d)) / SR
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def st(x, pan=0.0):
    if x.ndim == 2: return x
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)
def add(buf, t0, x, g=1.0, pan=0.0, send=0.0):
    x = st(x, pan) * g
    i = int(t0 * SR)
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n <= 0: return
    buf[i:i + n] += x[:n]
    if send: verb_send[i:i + n] += x[:n] * send
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def noise(d): return rng.standard_normal(int(SR * d))

# ---------------- instruments ----------------
def saw(f, t, ph=0): return signal.sawtooth(2 * np.pi * f * t + ph)

def pad_note(m, d, att=.6, rel=1.2, bright=1500):
    t = t_(d + rel); f = mtof(m)
    L = sum(saw(f * (1 + dt), t, rng.random() * 6) for dt in (-.006, -.002, .003))
    R = sum(saw(f * (1 + dt), t, rng.random() * 6) for dt in (-.004, .002, .007))
    env = np.minimum(1, t / att) * np.where(t < d, 1, np.exp(-(t - d) / (rel / 4)))
    x = np.stack([L, R], 1) * env[:, None] / 3
    return lp(x, bright, 2)

def pluck(m, d=1.2, bright=1.0):
    t = t_(d); f = mtof(m); x = np.zeros_like(t)
    for k in range(1, 9):
        x += np.sin(2 * np.pi * f * k * t) / k ** 1.3 * np.exp(-t * (3 + k * 2.2 / bright))
    x *= np.minimum(1, t / .002)
    return x * .5

def kick(g=1.0, d=.45):
    t = t_(d)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6.5)
    x += lp(noise(d), 5000) * np.exp(-t * 300) * .5
    return np.tanh(x * 1.6) * g

def clap():
    d = .35; t = t_(d); x = np.zeros_like(t); n = noise(d)
    for k, o in enumerate((0, .011, .023)):
        e = np.where(t >= o, np.exp(-(t - o) * (180 if k < 2 else 16)), 0)
        x += n * e
    return bp(x, 900, 3200) * .8

def hat(d=.06, dec=70):
    t = t_(d); return hp(noise(d), 7500, 4) * np.exp(-t * dec) * .5

def boom(g=1.0, d=3.2):
    t = t_(d)
    f = 26 + 50 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.3)
    x += lp(noise(d), 1200, 2) * np.exp(-t * 9) * .9
    x += lp(noise(d), 180, 2) * np.exp(-t * 2.2) * 1.2
    x += hp(noise(d), 3000) * np.exp(-t * 25) * .25
    x = np.tanh(x * 1.8) * np.minimum(1, t / .002)
    return x * g * .62

def whoosh(d=.6, f0=300, f1=4000, peak=.6, pan0=-.6, pan1=.6):
    n = noise(d); f, tt, Z = signal.stft(n, SR, nperseg=1024)
    tn = np.clip(tt / d, 0, 1)
    fc = f0 * (f1 / f0) ** tn
    lf = np.log(f[:, None] + 1); mask = np.exp(-((lf - np.log(fc[None, :])) ** 2) / (2 * .45 ** 2))
    _, x = signal.istft(Z * mask, SR, nperseg=1024); x = x[:len(n)]
    t = t_(d)[:len(x)]
    env = np.where(t / d < peak, (t / d / peak) ** 2, np.exp(-(t / d - peak) / (1 - peak) * 4))
    x = x * env; x /= np.abs(x).max() + 1e-9
    pan = pan0 + (pan1 - pan0) * t / d
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.2

def riser(d=1.5, f0=200, f1=2400):
    t = t_(d); p = t / d
    x = whoosh(d, 400, 9000, peak=.97, pan0=-.2, pan1=.2)[:, 0][:len(t)] * .7
    f = f0 * (f1 / f0) ** (p ** 1.6)
    s = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in (1, 1.5, 2.01))
    x = x + s * .25
    return x * p ** 2.2

def rev_cymbal(d=1.2):
    t = t_(d); x = hp(noise(d), 4000, 2) * (t / d) ** 3
    return x * .6

def click(g=1.0, crisp=1.0):
    d = .12; t = t_(d); x = np.zeros_like(t)
    for o, a in ((0, 1), (.042, .55)):
        e = np.where(t >= o, np.exp(-(t - o) * 900), 0)
        x += bp(noise(d), 2500, 7500) * e * a * crisp
        x += np.sin(2 * np.pi * 1500 * (t - o)) * np.where(t >= o, np.exp(-(t - o) * 350), 0) * a * .5
    x += np.sin(2 * np.pi * 190 * t) * np.exp(-t * 60) * .45
    return x * g

def tick(m, g=1.0):
    d = .12; t = t_(d); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 90) * .4
    return x * g

def shimmer(d=2.2, g=1.0):
    t = t_(d); x = np.zeros((len(t), 2))
    for m in (86, 89, 93, 98, 101, 105, 110):
        for c in range(2):
            x[:, c] += np.sin(2 * np.pi * mtof(m) * (1 + .003 * (c - .5)) * t + rng.random() * 6) * np.exp(-t * (1.2 + rng.random())) * (1 + .5 * np.sin(t * 9 + rng.random() * 6))
    return x * np.minimum(1, t / .03)[:, None] * .08 * g

# ---------------- music ----------------
CH = {'Dm': [50, 53, 57, 62], 'Bb': [46, 50, 53, 58], 'F': [45, 48, 53, 57], 'C': [48, 52, 55, 60]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36}
PROG = ['Dm', 'Bb', 'F', 'C']
def chord_at(bar): return PROG[bar % 4]

# pad throughout
for bar in range(19):
    t0 = bar * 2.0
    if t0 >= 37: break
    c = chord_at(bar)
    if TQ <= t0 < TE: c = ['Bb', 'F'][bar % 2]
    if t0 >= TE: c = 'Dm'
    g = .10 if t0 < 4 else .13 if t0 < 8 else .16
    bright = 900 if t0 < 4 else 1500 if t0 < 23 else 2400
    if TQ <= t0 < TE: bright = 1300; g = .2
    d = 2.0 if t0 < TE else (38 - t0 - 1)
    for m in CH[c]:
        add(music, t0, pad_note(m, d, att=.5 if t0 else .05, rel=1.2, bright=bright), g, send=.4)

# sub drone intro
t = t_(4.0); add(music, 0.1, np.sin(2 * np.pi * mtof(26) * t) * np.minimum(1, t / .3) * np.minimum(1, (4 - t) / .3) * .25)
# heartbeat pulses intro
for k in range(1, 8):
    add(music, .5 * k + .12, kick(.35, .3), 1.0)

# arps (16ths) from 4 to 28, and quote plucks
for i in range(int((TQ - 4) / (B / 4))):
    t0 = 4 + i * B / 4
    bar = int(t0 // 2); c = chord_at(bar)
    notes = CH[c]
    seq = [notes[0] + 12, notes[2] + 12, notes[1] + 24, notes[3] + 12]
    m = seq[i % 4] + (12 if (i // 8) % 2 and t0 >= 8 else 0)
    g = .05 if t0 < 8 else .075 if t0 < TG else .09
    if t0 < 6 and i % 2: continue
    add(music, t0, pluck(m, .5, .7), g, pan=.5 * np.sin(i * .7), send=.35)
# quote melody (half time)
mel = [(0, 69), (.75, 67), (1.0, 65), (1.5, 62), (2.0, 65), (2.75, 64), (3.0, 60), (3.5, 62)]
for o, m in mel:
    add(music, TQ + .5 + o, pluck(m, 2.0, 1.4), .26, pan=.2, send=.6)
    add(music, TQ + .5 + o, pluck(m - 12, 2.0, .8), .07, pan=-.2, send=.6)

# drums 8 -> 28
for i in range(int((TQ - 8) / (B / 4))):
    t0 = 8 + i * B / 4
    q = i % 4; beat = i // 4
    if t0 >= 21.5 and t0 < TG: # build: kick 8ths & snare roll
        if q % 2 == 0: add(music, t0, kick(.8), .9)
        add(music, t0, clap(), .10 + .35 * (t0 - 21.5) / 1.5, send=.3)
        continue
    if q == 0: add(music, t0, kick(1.0 if t0 >= TG else .9), 1.0)
    if q == 0 and beat % 2 == 1: add(music, t0, clap(), .45, send=.35)
    if q == 2 and t0 >= TG: add(music, t0, kick(.5, .25), .6) if beat % 4 == 3 else None
    add(music, t0, hat(.05 if q else .09, 90 if q else 45), .35 if q == 2 else .18, pan=.3)
# bass 8ths 8 -> 28
for i in range(int((TQ - 8) / (B / 2))):
    t0 = 8 + i * B / 2
    if 21.5 <= t0 < TG: continue
    c = chord_at(int(t0 // 2)); r = ROOT[c] + (12 if i % 2 else 0)
    t = t_(.22); f = mtof(r)
    x = saw(f, t) * .6 + np.sin(2 * np.pi * f * .5 * t) * (0 if i % 2 else .8)
    x = lp(x * np.exp(-t * 6), 700) * np.minimum(1, (0.22 - t) / .02)
    add(music, t0, x, .32)
# logo section: soft pulse kicks on beats 6-8
for k in range(4):
    add(music, 6 + k * B, kick(.5, .3), .8)
# final long bass
t = t_(5.5); add(music, TE, lp(saw(mtof(26), t) * .5 + np.sin(2 * np.pi * mtof(26) * t), 300) * np.exp(-t * .6), .35)

# ---------------- SFX ----------------
add(sfx, .12, boom(1.0), .9, send=.5); add(sfx, .06, whoosh(.5, 200, 3000, .3), .35)
add(sfx, .35, click(.4), 1, pan=-.2)
add(sfx, .5, whoosh(.5, 500, 5000, .5, .3, -.3), .2)
add(sfx, 1.95, whoosh(.45, 800, 6000, .25, -.2, .9), .45)
add(sfx, 2.0, boom(.6, 1.8), .55, send=.4); add(sfx, 2.0, click(.7), 1)
add(sfx, 2.5, riser(1.5), .5, send=.3); add(sfx, 2.8, rev_cymbal(1.2), .45, send=.3)
add(sfx, 3.45, whoosh(.6, 150, 6000, .9, -.1, .1), .6)
add(sfx, 4.0, boom(1.1), 1.0, send=.5); add(sfx, 4.0, shimmer(2.6), 1.0, send=.8)
add(sfx, 4.2, shimmer(1.6, .6), 1, send=.6)
for k, tt in enumerate((5.0, 5.5, 6.0)):
    add(sfx, tt - .01, click(.55), 1, pan=(k - 1) * .3); add(sfx, tt, kick(.4, .25), .5)
add(sfx, 6.4, shimmer(1.4, .5), 1, send=.6)
add(sfx, 6.5, riser(1.5, 250, 3000), .45, send=.3); add(sfx, 6.8, rev_cymbal(1.2), .5)
add(sfx, 7.35, whoosh(.65, 300, 5000, .5, .5, -.6), .4)
add(sfx, 8.0, boom(.8, 2.2), .8, send=.4); add(sfx, 7.99, click(1.0), 1.0)
wh = [(.5, 7000, 250, -.1, .1), (.35, 250, 6000, .9, -.9), (.4, 400, 5000, -.5, .5), (.4, 300, 7000, 0, 0)]
TRANS = ['zoom', 'whip', 'flip', 'rise']
for i in range(1, 10):
    tt = 8 + 1.5 * i
    add(sfx, tt - .015, click(.9), 1, pan=.1)
    ty = TRANS[i % 4]
    d, a, b_, p0, p1 = {'zoom': (.45, 200, 6000, 0, 0), 'whip': (.35, 400, 7000, .9, -.9), 'flip': (.4, 500, 5000, -.6, .6), 'rise': (.4, 250, 6500, -.1, .1)}[ty]
    add(sfx, tt - .08, whoosh(d, a, b_, .45, p0, p1), .42)
    add(sfx, tt + .03, tick(96 + (i % 5) * 2, .5), .12, send=.5)
add(sfx, 21.5, riser(1.5, 220, 3200), .55, send=.3); add(sfx, 21.8, rev_cymbal(1.2), .5)
add(sfx, TG, boom(1.1), 1.0, send=.5); add(sfx, TG - .02, click(1.0), 1)
for i in range(10):
    add(sfx, TG + .02 + i * .07 + .12, tick(84 + i, .8), .22, pan=(-.4 if i % 2 == 0 else .4), send=.3)
add(sfx, TG + .3, whoosh(.5, 400, 5000, .4, -.3, .3), .3)
add(sfx, TG + .8, shimmer(2.0, .8), 1, send=.7)
pent = [74, 77, 79, 81, 84, 86, 89, 91, 93, 98]
for j in range(10):
    add(sfx, TG + 2.8 + j * .13, pluck(pent[j], .9, 1.5), .16, pan=(-.5 + j / 9), send=.6)
add(sfx, TG + 2.7, whoosh(1.5, 1500, 9000, .6, -.8, .8), .12)
add(sfx, TQ - .05, whoosh(.45, 300, 7000, .4, .2, -.2), .5); add(sfx, TQ, boom(.4, 1.5), .45, send=.4); add(sfx, TQ - .02, click(.7), 1)
add(sfx, TE - 1.3, riser(1.3, 250, 3500), .5, send=.3); add(sfx, TE - 1.0, rev_cymbal(1.0), .5)
add(sfx, TE, boom(1.2, 4.5), 1.05, send=.55); add(sfx, TE, shimmer(3.5, 1.2), 1, send=.9)
add(sfx, TE + .5, whoosh(.5, 600, 5000, .5, -.2, .2), .2)
add(sfx, TE + 1.3, tick(81, 1), .25, send=.4)
add(sfx, TE + 2.1, whoosh(.9, 800, 4000, .5, .8, 0), .14)
click_t = TE + 3.0
add(sfx, click_t - .01, click(1.2, 1.4), 1.1)
t = t_(.25); blip = np.sin(2 * np.pi * np.cumsum(880 + 600 * np.minimum(1, t / .05)) / SR) * np.exp(-t * 14)
add(sfx, click_t + .02, blip, .18, send=.5); add(sfx, click_t + .05, shimmer(1.8, .8), 1, send=.7)
add(sfx, TE + 4.8, whoosh(1.0, 3000, 200, .5, 0, 0), .2)

# ---------------- reverb ----------------
def ir(d=2.6):
    t = t_(d)
    l = noise(d) * np.exp(-t * 2.6); r = noise(d) * np.exp(-t * 2.6)
    l = lp(l, 6000); r = lp(r, 6000)
    return np.stack([l, r], 1) / 30
IR = ir()
wet = np.stack([signal.fftconvolve(verb_send[:, c], IR[:, c])[:N] for c in range(2)], 1)

# sidechain duck music under booms
duck = np.ones(N)
for h in (0.12, 2.0, 4.0, 8.0, TG, TQ, TE):
    t = np.arange(N) / SR - h
    duck -= np.where(t >= 0, .55 * np.exp(-t * 3), 0)
duck = np.clip(duck, .35, 1)
mix = music * duck[:, None] * 1.0 + sfx * .9 + wet * .9
# fade out
t = np.arange(N) / SR
mix *= np.clip((DUR - .15 - t) / 1.3, 0, 1)[:, None]
mix = hp(mix, 25)
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6) * .95
wavfile.write('music.wav', SR, (mix * 32767).astype(np.int16))
print('ok', np.abs(mix).max())
