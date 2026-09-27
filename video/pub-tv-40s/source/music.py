import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000; DUR = 40.5; N = int(SR * DUR)
rng = np.random.default_rng(3)
t_all = np.arange(N) / SR
L = np.zeros(N); Rr = np.zeros(N)

def note(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)

def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)
def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x)

def add(sig, start, pan=0.0, gain=1.0):
    i0 = int(start * SR); i1 = min(N, i0 + len(sig)); s = sig[:i1 - i0] * gain
    L[i0:i1] += s * np.sqrt(0.5 * (1 - pan)); Rr[i0:i1] += s * np.sqrt(0.5 * (1 + pan))

def saw(f, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    ph = (f * (1 + detune) * t + phase) % 1.0
    return 2 * ph - 1

def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na)
    if na + nd < n: e[na:na + nd] = np.linspace(1, s, nd)
    if nr < n: e[n - nr:] *= np.linspace(1, 0, nr)
    return e

# --- progression (MIDI roots) : Ré mineur épique
chords = [  # start, end, notes
    (0.0, 5.0, [50, 57, 62, 65]),     # Dm
    (5.0, 9.0, [46, 53, 58, 62]),     # Bb
    (9.0, 14.0, [53, 57, 60, 65]),    # F
    (14.0, 19.0, [48, 55, 60, 64]),   # C
    (19.0, 24.0, [50, 57, 62, 65]),   # Dm
    (24.0, 28.0, [46, 53, 58, 65]),   # Bb
    (28.0, 30.8, [43, 50, 55, 58]),   # Gm
    (30.8, 33.0, [45, 52, 57, 61]),   # A (dominante)
    (33.0, 40.5, [38, 50, 57, 62, 65, 69]),  # Dm plein (drop)
]
def intensity(t):  # montée progressive
    return np.clip(0.25 + 0.75 * (t / 33.0) ** 1.4, 0, 1)

# 1) nappe de cordes (saws désaccordées + LP)
for (s, e, notes) in chords:
    n = int((e - s + 0.6) * SR)
    sig = np.zeros(n)
    for k, m in enumerate(notes):
        f = note(m + (12 if s >= 33 and k > 2 else 0))
        for d in (-0.006, -0.002, 0.003, 0.007):
            sig += saw(f, n, d, rng.random()) * 0.06
    tt = s + np.arange(n) / SR
    inten = intensity(tt)
    sig = lp(sig, 900 + 2600 * inten.mean(), 2)
    sig *= env_adsr(n, 0.9 if s < 33 else 0.05, 0.3, 1.0, 0.8) * (0.35 + 0.65 * inten)
    for pan, off in ((-0.6, 0), (0.6, 0.011)):
        add(np.concatenate([np.zeros(int(off * SR)), sig]), s, pan, 0.55)

# 2) drone grave
n = N; drone = (np.sin(2 * np.pi * note(26) * t_all) * 0.5 + lp(saw(note(26), n), 200) * 0.4)
drone *= np.clip(t_all / 3, 0, 1) * (0.5 + 0.5 * intensity(t_all)) * np.where(t_all > 32.6, np.where(t_all < 33, 0.0, 1.3), 1.0)
add(drone, 0, 0, 0.35)

# 3) ostinato spiccato (96 bpm, croches) à partir de 9 s
bpm = 96; eighth = 60 / bpm / 2
pattern = [0, 0, 12, 0, 7, 0, 12, 7]
t = 9.0; i = 0
while t < 32.6:
    ch = [c for c in chords if c[0] <= t < c[1]][0]
    root = ch[2][0] + 12
    m = root + pattern[i % 8]
    n = int(0.22 * SR)
    sig = (saw(note(m), n, 0.003) + saw(note(m), n, -0.004)) * 0.5
    sig = lp(sig, 1800 + 2500 * intensity(t)) * np.exp(-np.arange(n) / SR * 14)
    add(sig, t, -0.35 if i % 2 else 0.35, 0.22 * (0.4 + 0.8 * intensity(t)))
    t += eighth; i += 1

# 4) piano/célesta délicat en intro
for (tt, m) in [(0.6, 74), (1.8, 77), (3.0, 81), (4.2, 79), (5.4, 74), (6.6, 77), (7.8, 82), (9.0, 81)]:
    n = int(2.5 * SR); x = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * note(m) * x) + 0.3 * np.sin(2 * np.pi * note(m) * 2 * x) + 0.1 * np.sin(2 * np.pi * note(m) * 3 * x)) * np.exp(-x * 2.2)
    add(sig, tt, 0.2, 0.09)

# 5) percussions : taiko / impacts
def taiko(gain=1.0, f0=62, dec=5.0, n_s=1.4):
    n = int(n_s * SR); x = np.arange(n) / SR
    f = f0 * (1 + 1.5 * np.exp(-x * 30))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * dec)
    click = lp(rng.standard_normal(n), 2500) * np.exp(-x * 60) * 0.5
    return (body + click) * gain
cuts = [5.0, 9.0, 12.0, 14.0, 16.2, 17.9, 19.0, 21.7, 24.0, 28.0, 30.6]
for c in cuts: add(taiko(0.8, 58, 4.0), c - 0.01, 0, 0.55 * (0.5 + intensity(c)))
beat = 60 / bpm
t = 14.0; k = 0
while t < 32.9:
    g = 0.25 + 0.35 * intensity(t)
    add(taiko(1.0, 70 if k % 2 else 55, 7), t, -0.2 if k % 2 else 0.2, g * (1.0 if k % 4 == 0 else 0.55))
    if t > 24: add(taiko(0.6, 110, 12, 0.5), t + beat / 2, 0.4, g * 0.5)
    t += beat; k += 1
# roulement final avant le drop
for j in range(16):
    tt = 31.4 + j * (1.6 / 16) * (1 - j / 40)
    add(taiko(0.7, 90, 10, 0.5), tt, (j % 2 - 0.5), 0.2 + j * 0.03)

# 6) riser + reverse cymbale
n = int(3.0 * SR); x = np.arange(n) / SR
riser = hp(rng.standard_normal(n), 800) * (x / 3) ** 3
sw = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (x * 1.6)) / SR) * (x / 3) ** 2 * 0.4
add(lp(riser, 9000) * 0.5 + sw, 30.0, 0, 0.35)

# 7) DROP à 33 s : braam cuivres + boom
n = int(4.2 * SR); x = np.arange(n) / SR
braam = np.zeros(n)
for m in (26, 38, 45, 50):
    for d in (-0.008, 0.0, 0.009):
        braam += saw(note(m), n, d, rng.random())
fc = 300 + 2600 * np.exp(-x * 1.2)
# filtre variable par blocs
out = np.zeros(n); blk = 2400
for b in range(0, n, blk):
    out[b:b + blk] = lp(braam[b:b + blk + 0], fc[b], 2)
braam = out * env_adsr(n, 0.02, 0.6, 0.6, 1.8) * 0.18
add(braam, 33.0, 0, 1.0)
boom = taiko(2.2, 42, 1.6, 3.5); add(boom, 33.0, 0, 0.9)
add(taiko(1.4, 38, 1.2, 3.5), 37.1, 0, 0.7)   # apparition du logo
# carillon doré sur le logo
for j, m in enumerate([86, 93, 98]):
    n = int(3 * SR); x = np.arange(n) / SR
    add((np.sin(2 * np.pi * note(m) * x) + 0.4 * np.sin(2 * np.pi * note(m) * 2.76 * x)) * np.exp(-x * 1.6), 37.15 + j * 0.12, 0.3 * (j - 1), 0.07)

# réverbération convolutive
ir_n = int(2.8 * SR); x = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-x * 2.3); irR = rng.standard_normal(ir_n) * np.exp(-x * 2.3)
irL = lp(irL, 6000); irR = lp(irR, 6000)
wetL = fftconvolve(L, irL)[:N]; wetR = fftconvolve(Rr, irR)[:N]
wetL /= np.abs(wetL).max(); wetR /= np.abs(wetR).max()
dry = max(np.abs(L).max(), np.abs(Rr).max())
L2 = L / dry * 0.75 + wetL * 0.35; R2 = Rr / dry * 0.75 + wetR * 0.35
# fin : fondu
fade = np.clip((40.3 - t_all) / 1.2, 0, 1); L2 *= fade; R2 *= fade
mus = np.stack([L2, R2], 1)
mus /= np.abs(mus).max() * 1.12
sf.write('/tmp/vid/music.wav', mus.astype(np.float32), SR)

# --- mix voix off avec ducking
vo = np.zeros(N)
for f, st in [('v1p', 0.9), ('v2p', 7.1), ('v3p', 14.2), ('v4p', 27.6), ('v5p', 36.0)]:
    v, sr = sf.read(f'/tmp/vid/{f}.wav'); v = v if v.ndim == 1 else v.mean(1)
    i0 = int(st * SR); vo[i0:i0 + len(v)] += v[:N - i0]
vo /= np.abs(vo).max()
# réverb légère sur la voix
ir = rng.standard_normal(int(1.2 * SR)) * np.exp(-np.arange(int(1.2 * SR)) / SR * 5); ir = lp(ir, 5000)
vw = fftconvolve(vo, ir)[:N]; vw /= np.abs(vw).max()
voice = vo * 0.92 + vw * 0.10
envv = np.abs(voice); k = int(0.25 * SR); envv = np.convolve(envv, np.ones(k) / k, 'same'); envv /= envv.max()
duck = 1 - 0.45 * np.clip(envv * 4, 0, 1)
mix = mus * duck[:, None] * 0.8 + voice[:, None] * 0.62
mix /= np.abs(mix).max() * 1.06
sf.write('/tmp/vid/mix.wav', mix.astype(np.float32), SR)
print('ok')
