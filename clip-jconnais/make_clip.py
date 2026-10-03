#!/usr/bin/env python3
"""Clip « J'connais » — montage automatique à partir de vidéos libres de droits.

Sources (toutes autorisent l'usage sur YouTube, y compris monétisé) :
  - Pexels   (clé gratuite : https://www.pexels.com/api/)  -> PEXELS_API_KEY
  - Pixabay  (clé gratuite : https://pixabay.com/api/docs/) -> PIXABAY_API_KEY
  - Mixkit   (sans clé, lecture des pages publiques)
  - un dossier local de rushs (--local-dir), un sous-dossier par section

Usage :
  python3 make_clip.py --audio morceau.mp3            # clip calé sur ta prod
  python3 make_clip.py                                # sans audio : 3:20, 88 BPM
  python3 make_clip.py --audio morceau.mp3 --sections sections.json
"""
import argparse, hashlib, json, os, random, re, shutil, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
W, H, FPS = 1920, 1080, 30

# --- Traitement du clip : ambiance par section --------------------------------
# share = part de la durée totale (utilisée si aucun sections.json n'est fourni)
# beats = longueur d'un plan en temps (plus petit = montage plus nerveux)
TREATMENT = [
    {"name": "intro", "share": 0.08, "beats": 8, "speed": 0.8, "fade_in": True,
     "queries": ["city night aerial", "empty street night", "man walking alone night",
                 "street lights night", "crows flying"]},
    {"name": "refrain1", "share": 0.12, "beats": 2, "speed": 1.0, "flash": True,
     "queries": ["crowd slow motion", "people faces city", "car driving night city",
                 "neon lights city", "man hoodie night"]},
    {"name": "couplet1", "share": 0.22, "beats": 4, "speed": 1.0,
     "queries": ["quiet city night", "phone screen dark", "writing notebook night",
                 "recording studio microphone", "empty concert hall", "man walking street",
                 "city timelapse night"]},
    {"name": "refrain2", "share": 0.12, "beats": 2, "speed": 1.0, "flash": True,
     "queries": ["crowd slow motion", "neon city night", "highway timelapse night",
                 "subway train", "man silhouette city"]},
    {"name": "couplet2", "share": 0.22, "beats": 4, "speed": 1.0,
     "queries": ["driving car night interior", "city lights through car window",
                 "rooftop night city", "rain window night", "man thinking night",
                 "tunnel driving"]},
    {"name": "pont", "share": 0.08, "beats": 8, "speed": 0.6,
     "queries": ["eye close up", "hands close up", "smoke dark", "man standing still city",
                 "sunrise city"]},
    {"name": "refrain3", "share": 0.12, "beats": 1, "speed": 1.0, "flash": True,
     "queries": ["neon city night", "highway timelapse night", "crowd concert lights",
                 "car night speed", "city aerial night"]},
    {"name": "outro", "share": 0.04, "beats": 8, "speed": 0.7, "fade_out": True,
     "queries": ["empty road night", "road at dawn", "man walking away"]},
]

# Étalonnage : sombre, désaturé, teinte froide / peau chaude, vignette, grain, cinémascope
GRADE = ("eq=contrast=1.12:brightness=-0.04:saturation=0.72,"
         "colorbalance=rs=-0.06:bs=0.08:rh=0.05:bh=-0.04,"
         "curves=master='0/0.04 0.5/0.46 1/0.96',"
         "vignette=PI/4.5,noise=alls=7:allf=t")
SCOPE = "drawbox=x=0:y=0:w=iw:h=132:color=black:t=fill,drawbox=x=0:y=ih-132:w=iw:h=132:color=black:t=fill"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Échec : {' '.join(cmd[:6])}...\n{r.stderr[-1500:]}")
    return r.stdout


def http_get(url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def probe_duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.strip() or 0)


# --- Recherche de rushs ---------------------------------------------------------
def search_pexels(q, n):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(
        {"query": q, "orientation": "landscape", "per_page": n, "size": "medium"})
    data = json.loads(http_get(url, {"Authorization": key}))
    out = []
    for v in data.get("videos", []):
        files = [f for f in v["video_files"] if f.get("width") and f["width"] >= 1280 and f["file_type"] == "video/mp4"]
        files.sort(key=lambda f: abs(f["width"] - 1920))
        if files:
            out.append({"url": files[0]["link"], "credit": f"Pexels — {v['user']['name']} — {v['url']}"})
    return out


def search_pixabay(q, n):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode({"key": key, "q": q, "per_page": max(n, 3)})
    data = json.loads(http_get(url))
    out = []
    for h in data.get("hits", []):
        v = h["videos"].get("large") or h["videos"].get("medium")
        if v and v.get("url"):
            out.append({"url": v["url"], "credit": f"Pixabay — {h['user']} — {h['pageURL']}"})
    return out


def search_mixkit(q, n):
    slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")
    try:
        html = http_get(f"https://mixkit.co/free-stock-video/{slug}/").decode("utf-8", "ignore")
    except Exception:
        return []
    urls = re.findall(r"https://assets\.mixkit\.co/videos/[^\"'\s]+?\.mp4", html)
    out, seen = [], set()
    for u in urls:
        m = re.search(r"/videos/(?:preview/)?(?:mixkit-.*?-)?(\d+)", u)
        vid = m.group(1) if m else u
        if vid in seen:
            continue
        seen.add(vid)
        hd = re.sub(r"-(360|small|medium)\.mp4$", lambda x: "-720.mp4" if x.group(1).isdigit() else "-large.mp4", u)
        out.append({"url": hd, "fallback": u, "credit": f"Mixkit — {u}"})
    return out[:n]


def download(item, cache):
    name = hashlib.md5(item["url"].encode()).hexdigest()[:12] + ".mp4"
    dst = cache / name
    if dst.exists() and dst.stat().st_size > 50_000:
        return dst
    for u in [item["url"], item.get("fallback")]:
        if not u:
            continue
        try:
            dst.write_bytes(http_get(u, timeout=120))
            if dst.stat().st_size > 50_000:
                return dst
        except Exception:
            pass
    dst.unlink(missing_ok=True)
    return None


def gather(section, cache, local_dir, per_query, credits):
    clips = []
    if local_dir:
        d = Path(local_dir) / section["name"]
        if d.is_dir():
            clips += sorted(p for p in d.iterdir() if p.suffix.lower() in {".mp4", ".mov", ".webm", ".mkv"})
        if clips:
            return clips
    for q in section["queries"]:
        found = []
        for engine in (search_pexels, search_pixabay, search_mixkit):
            try:
                found = engine(q, per_query)
            except Exception as e:
                print(f"  ! {engine.__name__} « {q} » : {e}")
            if found:
                break
        for item in found[:per_query]:
            p = download(item, cache)
            if p:
                clips.append(p)
                credits.append(item["credit"])
        print(f"  {section['name']:<9} « {q} » → {len(found[:per_query])} rush(s)")
    return clips


# --- Rythme ---------------------------------------------------------------------
def beat_grid(audio, total, bpm_default):
    if audio:
        try:
            import librosa
            y, sr = librosa.load(audio, sr=22050, mono=True)
            tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
            beats = librosa.frames_to_time(frames, sr=sr).tolist()
            if len(beats) > 16:
                print(f"Tempo détecté : {float(tempo):.0f} BPM, {len(beats)} temps")
                return beats
        except Exception as e:
            print(f"(détection de tempo indisponible : {e})")
    step = 60.0 / bpm_default
    return [i * step for i in range(int(total / step) + 2)]


def plan_cuts(sections, beats, total):
    """Liste de (section, début, fin) : un plan par groupe de N temps."""
    cuts = []
    for s in sections:
        bs = [b for b in beats if s["start"] <= b < s["end"]] or [s["start"]]
        if bs[0] - s["start"] > 0.05:
            bs.insert(0, s["start"])
        marks = bs[::s["beats"]] + [s["end"]]
        for a, b in zip(marks, marks[1:]):
            if b - a > 0.25:
                cuts.append((s, a, b))
            elif cuts:
                cuts[-1] = (cuts[-1][0], cuts[-1][1], b)
    return cuts


# --- Rendu ----------------------------------------------------------------------
def render_shot(src, dur, out, speed, flash, rnd):
    src_dur = probe_duration(src)
    need = dur * speed
    start = rnd.uniform(0, max(0.0, src_dur - need - 0.2)) if src_dur > need else 0
    loop = ["-stream_loop", "-1"] if src_dur < need else []
    zoom = rnd.choice([True, False])
    vf = [f"setpts=PTS/{speed}" if speed != 1 else "null",
          f"scale={W}:{H}:force_original_aspect_ratio=increase", f"crop={W}:{H}",
          f"fps={FPS}"]
    if zoom:  # léger push-in, effet caméra vivante
        vf.append(f"scale=w='{W}*(1+0.06*t/{dur:.3f})':h=-2:eval=frame,crop={W}:{H}")
    vf.append(GRADE)
    if flash:
        vf.append("fade=t=in:st=0:d=0.25:color=white")
    vf.append(SCOPE)
    run(["ffmpeg", "-y", "-v", "error", *loop, "-ss", f"{start:.2f}", "-i", str(src),
         "-t", f"{dur:.3f}", "-vf", ",".join(vf), "-an", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", help="ta prod (mp3/wav)")
    ap.add_argument("--sections", help="JSON {nom_section: [début_s, fin_s]} pour caler précisément")
    ap.add_argument("--duration", type=float, default=200, help="durée sans audio (s)")
    ap.add_argument("--bpm", type=float, default=88)
    ap.add_argument("--local-dir", help="dossier de rushs perso (un sous-dossier par section)")
    ap.add_argument("--per-query", type=int, default=3)
    ap.add_argument("--out", default=str(HERE / "jconnais_clip.mp4"))
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()

    rnd = random.Random(a.seed)
    work, cache = HERE / "work", HERE / "rushs"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    cache.mkdir(exist_ok=True)

    total = probe_duration(a.audio) if a.audio else a.duration
    sections = [dict(s) for s in TREATMENT]
    if a.sections:
        times = json.loads(Path(a.sections).read_text())
        for s in sections:
            s["start"], s["end"] = times[s["name"]]
    else:
        t = 0
        for s in sections:
            s["start"], t = t, t + s["share"] * total
            s["end"] = t
        sections[-1]["end"] = total

    print("1/4  Récupération des rushs")
    credits, pools = [], {}
    for s in sections:
        pools[s["name"]] = gather(s, cache, a.local_dir, a.per_query, credits)
        if not pools[s["name"]]:
            sys.exit(f"Aucun rush pour « {s['name']} ». Vérifie l'accès réseau / la clé API / --local-dir.")

    print("2/4  Calage sur le rythme")
    cuts = plan_cuts(sections, beat_grid(a.audio, total, a.bpm), total)
    print(f"     {len(cuts)} plans")

    print("3/4  Rendu des plans (étalonnage ciné)")
    lst, last = [], None
    order = {k: rnd.sample(v, len(v)) for k, v in pools.items()}
    idx = {k: 0 for k in pools}
    for i, (s, t0, t1) in enumerate(cuts):
        pool = order[s["name"]]
        src = pool[idx[s["name"]] % len(pool)]
        if src == last and len(pool) > 1:
            idx[s["name"]] += 1
            src = pool[idx[s["name"]] % len(pool)]
        idx[s["name"]] += 1
        last = src
        first_of_section = i == 0 or cuts[i - 1][0] is not s
        out = work / f"shot_{i:04d}.mp4"
        render_shot(src, t1 - t0, out, s["speed"], s.get("flash") and first_of_section, rnd)
        lst.append(f"file '{out.name}'")
        print(f"     {i + 1}/{len(cuts)}", end="\r")
    (work / "list.txt").write_text("\n".join(lst))

    print("\n4/4  Assemblage final")
    fade_out = max(0, total - 3)
    vf = f"fade=t=in:st=0:d=2,fade=t=out:st={fade_out:.2f}:d=3"
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(work / "list.txt")]
    if a.audio:
        cmd += ["-i", a.audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "320k", "-shortest"]
    cmd += ["-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", a.out]
    run(cmd)

    Path(a.out).with_suffix(".credits.txt").write_text(
        "Rushs utilisés (licences Pexels / Pixabay / Mixkit, usage YouTube autorisé) :\n"
        + "\n".join(sorted(set(credits))) + "\n")
    shutil.rmtree(work, ignore_errors=True)
    print(f"OK → {a.out}")


if __name__ == "__main__":
    main()
