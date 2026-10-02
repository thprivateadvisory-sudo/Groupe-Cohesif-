#!/usr/bin/env python3
"""Musique originale + sound design du film Groupe Cohesif, synthétisés (aucun sample externe).
Tempo 100 BPM (mesure = 2,4 s), Ré mineur : Dm - Bb - F - C.
Les effets d'interface sont placés sur les repères exportés par le moteur vidéo (renders/cues.json).
Usage : python3 tools/music.py renders/cues.json renders/audio.wav
"""
import json, sys
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 48000
BAR, BEAT = 2.4, 0.6
rng = np.random.default_rng(7)

cues = json.load(open(sys.argv[1]))
DUR = cues['duration'] + 1.5
N = int(DUR * SR)
music = np.zeros((2, N)); verb_send = np.zeros((2, N)); sfx = np.zeros((2, N)); sfx_verb = np.zeros((2, N))

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def S(t): return int(round(t * SR))
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)

def put(buf, t0, sig, pan=0.0, gain=1.0, send=None, sendgain=0.0):
    a = S(t0)
    if a >= N: return
    if a < 0: sig = sig[-a:]; a = 0
    sig = sig[:N - a] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, a:a + len(sig)] += sig * l * 1.414
    buf[1, a:a + len(sig)] += sig * r * 1.414
    if send is not None and sendgain:
        send[0, a:a + len(sig)] += sig * l * sendgain * 1.414
        send[1, a:a + len(sig)] += sig * r * sendgain * 1.414

def adsr(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5 * sus if na else e[:na]
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e

# ------------------------------------------------------------------ harmony
CH = {  # bass, pad voicing
    'Dm': (38, [57, 62, 65, 69]), 'Bb': (34, [58, 62, 65, 70]),
    'F': (41, [57, 60, 65, 69]), 'C': (36, [55, 60, 64, 67]),
}
PROG = ['Dm', 'Bb', 'F', 'C']
NBARS = int(np.ceil(DUR / BAR))
def chord(b):
    over = {56: 'C', 57: 'Dm', 58: 'C', 59: 'Bb', 60: 'C', 61: 'F', 62: 'F'}
    return over.get(b, PROG[b % 4])

# section helpers (seconds)
# Le film v2 ajoute 2 pôles (+7,2 s à partir de 50 s) et la scène contact (+12 s à partir de 115,2 s).
# Les repères ci-dessous restent écrits dans la grille d'origine et sont convertis par M() / Me().
def M(x): return x if x < 50 else (x + 7.2 if x < 115.2 else x + 19.2)        # début de section
def Me(x): return x if x <= 50 else (x + 7.2 if x <= 115.2 else x + 19.2)     # fin de section
CONTACT = (122.4, 134.4)
def sec(t, a, b): return M(a) <= t < Me(b)
def in_contact(t): return CONTACT[0] <= t < CONTACT[1]

# ------------------------------------------------------------------ instruments
def saw_add(f, d, maxh=14, bright=1.0):
    t = tt(d); x = np.zeros_like(t)
    nh = int(min(maxh, 9000 / f))
    for k in range(1, nh + 1):
        x += np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) / k * np.exp(-(k - 1) * 0.18 / bright)
    return x

def pad_note(m, d, bright=1.0, amp=1.0):
    f = mtof(m); out = np.zeros(int(d * SR))
    for det in (-6, 6):
        out += saw_add(f * 2 ** (det / 1200), d, bright=bright)
    t = tt(d)
    out *= (1 + 0.05 * np.sin(2 * np.pi * 0.3 * t))
    return out * adsr(len(out), 0.9, 1.4) * amp * 0.06

def piano(m, d=3.2, amp=1.0, decay=1.0):
    f = mtof(m); t = tt(d); x = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.00035 * k * k)
        x += np.sin(2 * np.pi * fk * t) * (1 / k ** 1.35) * np.exp(-t * (0.9 + 0.7 * k) * decay)
    x *= np.minimum(1, t / 0.004)
    x[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return x * amp * 0.16

def pluck(m, amp=1.0):
    f = mtof(m); d = 0.45; t = tt(d)
    x = saw_add(f, d, maxh=10) * np.exp(-t * 9)
    return lp(x, 2600) * amp * 0.12

def bass(m, d, amp=1.0, short=False):
    f = mtof(m); t = tt(d)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    x = np.tanh(1.6 * x)
    e = adsr(len(x), 0.008, 0.08 if short else 0.4) * (np.exp(-t * 3) * 0.5 + 0.5 if short else 1)
    return lp(x * e, 900) * amp * 0.22

def kick(amp=1.0):
    d = 0.5; t = tt(d)
    fr = 48 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t * 7) + 0.3 * np.exp(-t * 300) * rng.standard_normal(len(t))
    return np.tanh(1.5 * x) * amp * 0.5

def clap(amp=1.0):
    d = 0.35; t = tt(d); n = rng.standard_normal(len(t))
    e = np.exp(-t * 18)
    for off in (0.0, 0.011, 0.022):
        e += 0.6 * np.exp(-np.maximum(t - off, 0) * 140) * (t >= off)
    x = bp(n, 900, 5200) * e + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return x * amp * 0.22

def hat(amp=1.0, open_=False):
    d = 0.25 if open_ else 0.08; t = tt(d)
    x = lp(hp(rng.standard_normal(len(t)), 7500), 11000) * np.exp(-t * (14 if open_ else 55))
    return x * amp * 0.12

def tom(amp=1.0, f0=110):
    d = 0.8; t = tt(d)
    fr = f0 * (0.75 + 0.25 * np.exp(-t * 10))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 5) + 0.25 * lp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 25)
    return np.tanh(1.3 * x) * amp * 0.38

def riser(d, amp=1.0):
    t = tt(d); k = t / d
    n = rng.standard_normal(len(t)); out = np.zeros_like(t)
    seg = int(0.05 * SR)
    for i in range(0, len(t), seg):
        c = 300 + 6000 * k[i] ** 2
        out[i:i + seg] = bp(n[max(0, i - 2048):i + seg], c * 0.7, min(c * 1.4, 20000))[-len(out[i:i + seg]):]
    sw = np.sin(2 * np.pi * np.cumsum(220 + 660 * k ** 2) / SR) * 0.15
    return (out * 0.5 + sw) * k ** 2.2 * amp * 0.35

def impact(amp=1.0):
    d = 3.0; t = tt(d)
    fr = 30 + 40 * np.exp(-t * 4)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 1.6)
    nz = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 6) * 0.6
    hi = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 22) * 0.15
    return np.tanh(1.4 * (sub + nz + hi)) * amp * 0.55

def reverse_swell(m_list, d=2.0, amp=1.0):
    x = sum(piano(m, d=d, amp=1, decay=0.6) for m in m_list)
    x = x[::-1] * np.linspace(0, 1, len(x)) ** 2
    return x * amp

# ------------------------------------------------------------------ arrangement
def level(t):
    """global music intensity envelope"""
    pts = [(0, .55), (12, .65), (19.2, .7), (33.6, .8), (52.8, .9), (86.4, .85), (96, 1.0), (98.4, 1.0), (105.6, .7), (115.2, .9), (117.6, 1.0), (122.4, .85), (130, .6)]
    pts = [(M(x), y) for x, y in pts if x < 115.2] + [(122.4, .72), (133.0, .8)] + [(M(x), y) for x, y in pts if x >= 115.2]
    xs, ys = zip(*pts); return np.interp(t, xs, ys)

MELODY = {'Dm': [(0, 69), (2, 74)], 'Bb': [(0, 77), (2.5, 74)], 'F': [(0, 72), (2, 69)], 'C': [(0, 67), (2, 76)]}

for b in range(NBARS):
    t0 = b * BAR
    if t0 >= DUR - 0.5: break
    name = chord(b); bm, voic = CH[name]
    L = level(t0)
    calm = sec(t0, 0, 12) or sec(t0, 105.6, 115.2) or t0 >= M(122.4)
    final = b >= 61
    padlen = (BAR + 1.6) if not final else (DUR - t0)
    bright = 0.6 if sec(t0, 0, 12) else (0.8 if calm else 1.2)
    # pad
    for i, m in enumerate(voic):
        put(music, t0, pad_note(m, padlen, bright=bright, amp=L), pan=(-.5 + i / 3), send=verb_send, sendgain=.5)
    # strings (octave up) for big sections
    if sec(t0, 76.8, 86.4) or sec(t0, 98.4, 105.6) or sec(t0, 117.6, 122.4):
        for i, m in enumerate(voic[1:]):
            put(music, t0, pad_note(m + 12, BAR + 1.6, bright=0.8, amp=.55 * L), pan=(.6 - i * .6), send=verb_send, sendgain=.7)
    # sub / bass
    if t0 >= 12 or final:
        if sec(t0, 52.8, 86.4) or sec(t0, 88.8, 96) or sec(t0, 98.4, 105.6) or sec(t0, 117.6, 122.4) or sec(t0, 43.2, 52.8):
            for k in range(8):
                put(music, t0 + k * .3, bass(bm, .28, amp=L * (1 if k % 2 == 0 else .7), short=True))
        else:
            put(music, t0, bass(bm, BAR if not final else 4.0, amp=.8 * L))
    elif t0 >= 2.4:
        put(music, t0, bass(bm, BAR, amp=.45))
    # piano melody (intro, conf, ending)
    if calm and not sec(t0, 0, 2.4):
        for (bt, m) in MELODY[name]:
            put(music, t0 + bt * BEAT, piano(m, amp=.9 * L), pan=.15, send=verb_send, sendgain=.8)
    if final:
        for m in (65, 69, 72, 77):
            put(music, t0 + .02 * (m - 65), piano(m, d=5, amp=.8, decay=.5), pan=.1, send=verb_send, sendgain=1.0)
    # arpeggio 8ths
    if sec(t0, 19.2, 86.4) or sec(t0, 88.8, 98.4) or sec(t0, 98.4, 105.6) or sec(t0, 117.6, 122.4) or in_contact(t0):
        pat = [0, 1, 2, 3, 2, 1, 2, 3]
        for k in range(8):
            m = voic[pat[k]] + 12
            a = (.55 if sec(t0, 19.2, 33.6) else .75) * L * (1 if k % 2 == 0 else .75)
            put(music, t0 + k * .3, piano(m, d=1.2, amp=a, decay=1.6), pan=(-.35 if k % 2 else .35), send=verb_send, sendgain=.45)
    # soft pulse in "qui"
    if sec(t0, 12, 19.2):
        for k in range(8):
            put(music, t0 + k * .3, pluck(voic[0], amp=.8 if k % 2 == 0 else .5), pan=.2, send=verb_send, sendgain=.3)
        put(music, t0, kick(.45)); put(music, t0 + 1.2, kick(.35))
    # drums
    groove = sec(t0, 52.8, 86.4) or sec(t0, 98.4, 105.6) or sec(t0, 117.6, 122.4)
    light = sec(t0, 33.6, 52.8) or in_contact(t0)
    if groove or light or sec(t0, 88.8, 96):
        for bt in range(4):
            tb = t0 + bt * BEAT
            if bt in (0, 2) or (groove and sec(t0, 98.4, 105.6)):
                put(music, tb, kick(.9 if groove else .6))
            if bt in (1, 3) and (groove or sec(t0, 43.2, 52.8) or sec(t0, 88.8, 96)):
                put(music, tb, clap(.8 if groove else .5), send=verb_send, sendgain=.3)
            for s in range(4 if groove else 2):
                put(music, tb + s * BEAT / (4 if groove else 2), hat((.9 if s % 2 == 0 else .55) * (1 if groove else .7)), pan=.3)
        if groove:
            put(music, t0 + 3.5 * BEAT, kick(.55))
            put(music, t0 + 2 * BEAT + .3, hat(.6, open_=True), pan=-.3)

# toms on questions
for i in range(6): put(music, M(88.8 + 1.2 * i), tom(.9, 98), send=verb_send, sendgain=.4)
put(music, M(86.4), tom(.8, 80), send=verb_send, sendgain=.6)
# snare rolls into the drops
def roll(a, b, amp=.7):
    n = int((b - a) / (BEAT / 4))
    for k in range(n):
        put(music, a + k * BEAT / 4, clap(amp * (0.3 + 0.7 * k / n)), send=verb_send, sendgain=.25)
roll(M(96.6), M(98.0)); roll(M(116.4), M(117.5), .6)
# final questions hits
for a in map(M, (115.2, 115.8, 116.4, 117.0)):
    put(music, a, kick(1.0)); put(music, a, tom(.7, 90), send=verb_send, sendgain=.4)
# risers
for (a, b) in ((57.6, 60.0), (M(95.4), M(98.2)), (M(115.2), M(117.55))):
    put(music, a, riser(b - a), send=verb_send, sendgain=.5)
# short silence before the ecosystem drop (duck)
duck = np.ones(N)
for (a, b) in ((M(98.1), M(98.4)),):
    i0, i1 = S(a), S(b); duck[i0:i1] = np.linspace(1, .15, i1 - i0)
# reverse swells into logo moments
put(music, 2.4 - 2.0, reverse_swell([62, 69, 74], 2.0, .8), send=verb_send, sendgain=.6)
put(music, M(117.6) - 1.6, reverse_swell([62, 69, 74, 77], 1.6, .7), send=verb_send, sendgain=.6)

# ------------------------------------------------------------------ sound design
def click_s():
    t = tt(.05); x = np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 260) + 0.5 * hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 600)
    return x * .22
def tick_s():
    t = tt(.12); return (np.sin(2 * np.pi * 1760 * t) + .4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 45) * .12
def blip_s():
    t = tt(.15); return np.sin(2 * np.pi * (1300 + 300 * t) * t) * np.exp(-t * 35) * .1
def pop_s():
    t = tt(.12); f = 500 + 900 * np.minimum(1, t / .05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * .22
def chime(notes, gap=.07, d=1.2, amp=.2):
    out = np.zeros(int((d + gap * len(notes)) * SR))
    for i, m in enumerate(notes):
        t = tt(d); f = mtof(m)
        x = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 8)) * np.exp(-t * 4) * np.minimum(1, t / .003)
        a = int(i * gap * SR); out[a:a + len(x)] += x
    return out * amp
def whoosh_s(d=.7, amp=.3, lo=300, hi=3500):
    t = tt(d); k = t / d
    n = rng.standard_normal(len(t)); out = np.zeros_like(t); seg = int(.02 * SR)
    for i in range(0, len(t), seg):
        c = lo + (hi - lo) * np.sin(np.pi * k[i]) ** 2
        out[i:i + seg] = bp(n[max(0, i - 2048):i + seg], c * .6, min(c * 1.6, 20000))[-len(out[i:i + seg]):]
    return out * np.sin(np.pi * k) ** 1.5 * amp
def type_s():
    t = tt(.03); return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * .08
def swell_s(d=2.0, amp=.25):
    t = tt(d); k = t / d
    return lp(rng.standard_normal(len(t)), 2500) * k ** 2 * np.exp(-((k - .85) * 6) ** 2 * (k > .85)) * amp

SFX = {
    'click': lambda: (click_s(), 0, .15), 'tick': lambda: (tick_s(), 0, .3), 'blip': lambda: (blip_s(), 0, .4),
    'pop': lambda: (pop_s(), 0, .2), 'cart': lambda: (chime([88, 95], .08, .8, .14), 0, .4),
    'confirm': lambda: (chime([81, 85, 88, 93], .09, 1.6, .16), 0, .6),
    'whoosh': lambda: (whoosh_s(.7, .32), 0, .3), 'whoosh_soft': lambda: (whoosh_s(1.0, .2, 200, 2200), 0, .5),
    'whoosh_ui': lambda: (whoosh_s(.45, .16, 600, 5000), 0, .2), 'page': lambda: (whoosh_s(.35, .12, 800, 6000) + np.pad(click_s() * .6, (0, int(.35 * SR) - len(click_s()))), 0, .2),
    'open': lambda: (whoosh_s(.6, .2, 400, 4000), 0, .3), 'type': lambda: (type_s(), 0, 0),
    'step': lambda: (chime([81], 0, .9, .1) + 0, 0, .5), 'hit': lambda: (impact(.35), 0, .4),
    'impact': lambda: (impact(1.0), 0, .6), 'impact_soft': lambda: (impact(.45), 0, .6),
    'swell': lambda: (swell_s(2.0, .18), -1.9, .6), 'swell_short': lambda: (swell_s(1.0, .14), -.9, .5),
    'zoom': lambda: (whoosh_s(.7, .26, 200, 6000), -.1, .4), 'zoom_out': lambda: (whoosh_s(.8, .22, 6000, 300), 0, .4),
    'reverse': lambda: (swell_s(1.1, .25), -.0, .5),
}
for c in cues['cues']:
    if c['type'] not in SFX: continue
    sig, off, sv = SFX[c['type']]()
    pan = 0.0 if c['type'] not in ('click', 'tick', 'type', 'blip') else rng.uniform(-.25, .25)
    put(sfx, c['t'] + off, sig, pan=pan, gain=c.get('v', 1), send=sfx_verb, sendgain=sv)

# ------------------------------------------------------------------ reverb & mix
def make_ir(rt=2.6, pre=.02):
    n = int(rt * SR); t = np.arange(n) / SR
    ir = np.zeros((2, n + int(pre * SR)))
    for ch in range(2):
        x = rng.standard_normal(n) * np.exp(-t * 6.9 / rt)
        x = lp(x, 6000) ; x = hp(x, 180)
        ir[ch, int(pre * SR):] = x
    return ir / np.sqrt((ir ** 2).sum() / 2)
IR = make_ir()
def reverb(x): return np.stack([fftconvolve(x[c], IR[c])[:N] for c in range(2)])

mix = (music + 0.32 * reverb(verb_send)) * duck * 0.9
mix += sfx + 0.25 * reverb(sfx_verb)
# fade in/out
fade = np.ones(N); fade[:S(.3)] = np.linspace(0, 1, S(.3))
end = cues['duration']; i0 = S(end - 2.6); fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5
mix *= fade
mix = hp(mix, 25)
peak = np.abs(mix).max(); mix = mix / peak * 0.95
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix = mix[:, :S(end)]
from scipy.io import wavfile
wavfile.write(sys.argv[2], SR, (mix.T * 32000).astype(np.int16))
print('audio written', sys.argv[2], mix.shape[1] / SR, 's')
