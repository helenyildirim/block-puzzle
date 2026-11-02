#!/usr/bin/env python3
"""Basit ses efektleri ve yumuşak bir müzik döngüsü üretir (telifsiz, kodla sentezlenmiş).
Çalıştırma: python3 scripts/make-sounds.py
Çıktı: assets/sounds/*.wav
"""
import math
import os
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
os.makedirs(OUT, exist_ok=True)


def write(name, samples):
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = b''.join(struct.pack('<h', max(-32767, min(32767, int(s * 32767)))) for s in samples)
        w.writeframes(frames)
    print(name, len(samples) / RATE, 's')


def env(t, dur, attack=0.005, release=0.08):
    if t < attack:
        return t / attack
    if t > dur - release:
        return max(0.0, (dur - t) / release)
    return 1.0


def tone(freq, dur, vol=0.5, decay=6.0, harmonics=((1, 1.0), (2, 0.25), (3, 0.08))):
    n = int(dur * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        v = 0.0
        for mult, amp in harmonics:
            v += amp * math.sin(2 * math.pi * freq * mult * t)
        v *= math.exp(-decay * t) * env(t, dur)
        out.append(v * vol)
    return out


def mix(*tracks):
    n = max(len(t) for t in tracks)
    out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    peak = max(1.0, max(abs(v) for v in out))
    return [v / peak for v in out]


def offset(track, seconds):
    return [0.0] * int(seconds * RATE) + track


# Yerleştirme: kısa, yumuşak "tok"
place = tone(330, 0.12, vol=0.7, decay=22, harmonics=((1, 1.0), (2, 0.4)))
write('place.wav', place)

# Geçersiz bırakma: alçak kısa
write('invalid.wav', tone(150, 0.15, vol=0.6, decay=14, harmonics=((1, 1.0), (1.5, 0.3))))

# Patlama: yükselen notalar (çizgi sayısına göre 3 seviye)
notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
for level in (1, 2, 3):
    tracks = []
    for k in range(level + 2):
        tracks.append(offset(tone(notes[k], 0.35, vol=0.5, decay=7), k * 0.07))
    write(f'clear{level}.wav', mix(*tracks))

# Oyun bitti: aşağı inen üç nota
over = []
for k, f in enumerate([392.0, 329.63, 261.63]):
    over.append(offset(tone(f, 0.6, vol=0.6, decay=4), k * 0.22))
write('gameover.wav', mix(*over))

# Yeni rekor: parlak arpej
rec = []
for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    rec.append(offset(tone(f, 0.5, vol=0.55, decay=5), k * 0.1))
write('record.wav', mix(*rec))

# Buton tıkı
write('tap.wav', tone(660, 0.07, vol=0.5, decay=30, harmonics=((1, 1.0), (2, 0.2))))

# Müzik döngüsü: 16 saniyelik yumuşak pad + arpej (C - Am - F - G)
chords = [
    [261.63, 329.63, 392.0],
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
    [196.0, 246.94, 293.66],
]
BAR = 4.0
total = BAR * len(chords)
n = int(total * RATE)
music = [0.0] * n
for bi, chord in enumerate(chords):
    start = bi * BAR
    for f in chord:
        for i in range(int(BAR * RATE)):
            t = i / RATE
            # yumuşak giriş/çıkış
            e = min(1.0, t / 0.8) * min(1.0, (BAR - t) / 0.8)
            idx = int((start + t) * RATE)
            if idx < n:
                music[idx] += 0.09 * e * (math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * f * 2 * t))
    # arpej (her bar 8 nota)
    for k in range(8):
        f = chord[k % 3] * 2
        s = tone(f, 0.5, vol=0.12, decay=5, harmonics=((1, 1.0), (2, 0.15)))
        base = int((start + k * 0.5) * RATE)
        for i, v in enumerate(s):
            if base + i < n:
                music[base + i] += v
peak = max(abs(v) for v in music)
music = [v / peak * 0.8 for v in music]
write('music.wav', music)
