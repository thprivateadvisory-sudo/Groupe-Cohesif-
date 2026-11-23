"""Bande son originale générée (aucun droit tiers) : nappe + pulsation + impacts calés sur le montage."""
import numpy as np, wave, sys

SR = 44100
DUR = 52.0
N = int(SR * DUR)
t = np.arange(N) / SR
out = np.zeros((N, 2))

def midi(n): return 440 * 2 ** ((n - 69) / 12)

def env_adsr(n, a, r):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    out[i:j, 0] += s * (1 - max(0, pan))
    out[i:j, 1] += s * (1 + min(0, pan))

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x); acc = 0.0
    for k in range(len(x)):
        acc = (1 - a) * x[k] + a * acc; y[k] = acc
    return y

# Progression Am – F – C – G (accords de 2,4 s = 4 temps à 100 BPM)
BAR = 2.4
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
bass = [45, 41, 48, 43]

# Nappe (détune douce)
for b in range(int(DUR / BAR) + 1):
    st = b * BAR
    n = int(BAR * 1.15 * SR); tt = np.arange(n) / SR
    pad = np.zeros(n)
    for note in chords[b % 4]:
        f = midi(note)
        for d in (-0.12, 0.0, 0.12):
            pad += np.sin(2 * np.pi * f * (1 + d / 100) * tt + d * 3) * 0.5
            pad += np.sin(2 * np.pi * 2 * f * (1 + d / 100) * tt) * 0.12
    pad *= env_adsr(n, 0.5, 0.6) / 14
    add(pad, st, gain=0.55)

# Basse + kick + hi-hat dès l'entrée du slogan
BEAT = 0.6
start_groove = 3.6
k = 0
while start_groove + k * BEAT < DUR - 2.5:
    st = start_groove + k * BEAT
    bar = int(st / BAR)
    # kick
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 50 + 90 * np.exp(-tt * 28)
    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
    add(kick, st, gain=0.55 if st > 11 else 0.3)
    # basse sur les temps
    n = int(BEAT * 0.9 * SR); tt = np.arange(n) / SR
    fb = midi(bass[bar % 4] - 12)
    bs = (np.sin(2 * np.pi * fb * tt) + 0.3 * np.sin(4 * np.pi * fb * tt)) * env_adsr(n, 0.01, 0.2)
    add(bs, st, gain=0.22)
    # hi-hat sur les contretemps (section pôles)
    if 11 <= st < 40.5:
        n = int(0.06 * SR)
        hh = np.random.default_rng(k).standard_normal(n)
        hh = np.diff(np.concatenate([[0], hh])) * np.exp(-np.arange(n) / SR * 70)
        add(hh, st + BEAT / 2, pan=0.3, gain=0.07)
    k += 1

# Arpège léger pendant les pôles
for b in range(int(11 / BAR), int(40.5 / BAR)):
    for s16 in range(8):
        st = b * BAR + s16 * BAR / 8
        if st < 11 or st >= 40.5: continue
        notes = chords[b % 4]
        f = midi(notes[s16 % 4] + 12)
        n = int(0.25 * SR); tt = np.arange(n) / SR
        pl = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14)
        add(pl, st, pan=(-0.4 if s16 % 2 else 0.4), gain=0.06)

# Whoosh sur chaque transition de pôle + impacts
rng = np.random.default_rng(7)
def whoosh(length=0.45):
    n = int(length * SR); noise = rng.standard_normal(n)
    noise = lowpass(noise, 2500)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return noise * e
def impact():
    n = int(1.6 * SR); tt = np.arange(n) / SR
    f = 40 + 60 * np.exp(-tt * 12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.5)

W = whoosh()
for i in range(1, 10):
    add(W, 11 + i * 2.4 - 0.3, gain=0.25)
for st in (0.0, 3.6, 8.0, 11.0, 35.0, 45.5):
    add(impact(), st, gain=0.5)
    if st > 0: add(W, st - 0.4, gain=0.25)

# Mix : fade in/out, normalisation douce
fade = np.ones(N)
fade[: int(0.8 * SR)] = np.linspace(0, 1, int(0.8 * SR))
fade[-int(3.0 * SR):] = np.linspace(1, 0, int(3.0 * SR))
out *= fade[:, None]
out = np.tanh(out * 1.4)
out /= np.max(np.abs(out)) * 1.12
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
