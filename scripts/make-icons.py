"""Uygulama ikonu ve açılış görsellerini üretir (assets/ klasörüne yazar).

Çalıştırma: python3 scripts/make-icons.py   (Playwright + Chromium gerekir)
Logo, uygulamadaki src/components/Logo.tsx ile aynı yerleşimi kullanır.
"""
import asyncio
import os

from playwright.async_api import async_playwright

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')

# (x, y, döndürme, renk) — birim = blok boyu
LOGO = [
    (0.04, 0.73, -8, 1), (0.22, 1.75, -5, 1), (1.27, 1.6, -5, 1),
    (2.82, 1.67, -2, 3), (3.85, 1.56, -2, 3), (2.9, 2.73, -2, 3), (3.93, 2.6, -2, 3),
    (1.58, 0.04, -4, 2), (2.64, 0.13, 3, 2), (2.53, 1.16, -6, 2),
]
COLORS = {1: ('#7CCBFF', '#2C7BE5'), 2: ('#FFE680', '#F5B400'), 3: ('#FF93A6', '#E8405F')}
UW, UH = 4.95, 3.75


def logo_html(canvas, logo_width, mono=False):
    u = logo_width / UW
    s = u * 0.97
    left0 = (canvas - logo_width) / 2
    top0 = (canvas - UH * u) / 2 + u * 0.05
    out = []
    for x, y, rot, col in LOGO:
        light, dark = COLORS[col]
        if mono:
            style = f'background:#fff;'
        else:
            style = (
                f'background:linear-gradient({light},{dark});'
                f'box-shadow: inset 0 -{s*0.16:.1f}px 0 rgba(0,0,0,.18), inset 0 0 0 {max(2, s*0.012):.1f}px rgba(255,255,255,.22),'
                f' 0 {s*0.07:.1f}px {s*0.14:.1f}px rgba(0,0,0,.35);'
            )
        gloss = '' if mono else (
            f'<i style="position:absolute;top:{s*0.07:.1f}px;left:{s*0.1:.1f}px;right:{s*0.1:.1f}px;'
            f'height:{s*0.3:.1f}px;border-radius:{s*0.18:.1f}px;background:rgba(255,255,255,.3)"></i>'
        )
        out.append(
            f'<div style="position:absolute;left:{left0 + x*u:.1f}px;top:{top0 + y*u:.1f}px;width:{s:.1f}px;height:{s:.1f}px;'
            f'border-radius:{s*0.22:.1f}px;transform:rotate({rot}deg);{style}">{gloss}</div>'
        )
    return ''.join(out)


def page(canvas, body, bg):
    return (
        f'<html><body style="margin:0;width:{canvas}px;height:{canvas}px;position:relative;overflow:hidden;background:{bg}">'
        f'{body}</body></html>'
    )


async def render(browser, name, size, html, transparent=False):
    pg = await browser.new_page(viewport={'width': size, 'height': size})
    await pg.set_content(html)
    await pg.screenshot(path=os.path.join(ASSETS, name), omit_background=transparent)
    await pg.close()
    print('yazıldı:', name)


NAVY = 'linear-gradient(160deg,#1F4288 0%,#12295A 55%,#081633 100%)'
GLOW = '<div style="position:absolute;left:162px;top:162px;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(110,170,255,.28),rgba(110,170,255,0) 70%)"></div>'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # iOS/genel ikon: opak, tam çerçeve
        await render(b, 'icon.png', 1024, page(1024, GLOW + logo_html(1024, 640), NAVY))
        # Android adaptive: arka plan + ön plan (güvenli alan = ortadaki %66)
        await render(b, 'android-icon-background.png', 1024, page(1024, GLOW, NAVY))
        await render(b, 'android-icon-foreground.png', 1024, page(1024, logo_html(1024, 520), 'transparent'), transparent=True)
        await render(b, 'android-icon-monochrome.png', 1024, page(1024, logo_html(1024, 520, mono=True), 'transparent'), transparent=True)
        # Açılış (splash) görseli: sadece logo, şeffaf
        await render(b, 'splash-icon.png', 1024, page(1024, logo_html(1024, 760), 'transparent'), transparent=True)
        # Web favicon
        await render(b, 'favicon.png', 256, page(256, logo_html(256, 190), NAVY))
        await b.close()


asyncio.run(main())
