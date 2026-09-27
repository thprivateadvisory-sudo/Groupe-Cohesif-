import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
SR=48000; DUR=40.5; N=int(SR*DUR); rng=np.random.default_rng(3)
def lp(x, fc, order=2):
    return sosfilt(butter(order, fc/(SR/2), 'low', output='sos'), x)
mus, _ = sf.read('/tmp/vid/music.wav')
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
duck = 1 - 0.32 * np.clip(envv * 4, 0, 1)
mix = mus * duck[:, None] * 1.25 + voice[:, None] * 0.55
mix /= np.abs(mix).max() * 1.06
sf.write('/tmp/vid/mix.wav', mix.astype(np.float32), SR)
print('ok')
