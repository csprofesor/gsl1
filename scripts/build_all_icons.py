import math
import os
from PIL import Image, ImageDraw

BASE_DIR = "/Users/gokturksahan/.gemini/antigravity/scratch/gs_tv_launcher/src/assets/icons"
TOPBAR_DIR = os.path.join(BASE_DIR, "topbar")
SYSTEM_DIR = os.path.join(BASE_DIR, "system")
GLOSSY_DIR = os.path.join(BASE_DIR, "glossy")

CANVAS_SIZE = 1024
OUTPUT_SIZE = 256
STROKE_W = 64

WHITE = (255, 255, 255, 255)
WHITE_90 = (255, 255, 255, 230)
WHITE_70 = (255, 255, 255, 178)
WHITE_40 = (255, 255, 255, 102)

def new_canvas():
    return Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

def save_icon(img, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    resampled = img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    resampled.save(filepath, "PNG", optimize=True)

# ----------------- GEOMETRIC GLYPH HELPERS (Canvas: 1024x1024) -----------------

def draw_wifi(draw, cx=512, cy=660, color=WHITE, w=STROKE_W):
    draw.ellipse([cx - 44, cy - 44, cx + 44, cy + 44], fill=color)
    r1 = 150
    draw.arc([cx - r1, cy - r1, cx + r1, cy + r1], start=225, end=315, fill=color, width=w)
    r2 = 280
    draw.arc([cx - r2, cy - r2, cx + r2, cy + r2], start=225, end=315, fill=color, width=w)
    r3 = 410
    draw.arc([cx - r3, cy - r3, cx + r3, cy + r3], start=225, end=315, fill=color, width=w)

def draw_ethernet(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    box = [cx - 260, cy - 240, cx + 260, cy + 180]
    draw.rounded_rectangle(box, radius=48, outline=color, width=w)
    draw.rectangle([cx - 100, cy + 180, cx + 100, cy + 280], outline=color, width=w)
    for x in [-140, -46, 46, 140]:
        draw.line([(cx + x, cy - 140), (cx + x, cy - 10)], fill=color, width=w // 2)

def draw_search(draw, cx=470, cy=470, color=WHITE, w=STROKE_W):
    r = 210
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    rad = math.radians(45)
    x1 = cx + int(r * math.cos(rad)) + 12
    y1 = cy + int(r * math.sin(rad)) + 12
    x2 = x1 + 220
    y2 = y1 + 220
    draw.line([(x1, y1), (x2, y2)], fill=color, width=w + 14)

def draw_settings(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    inner_r = 130
    outer_r = 270
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], outline=color, width=w)
    teeth = 6
    for i in range(teeth):
        angle = i * (360 / teeth)
        rad = math.radians(angle)
        x1 = cx + int((inner_r + 30) * math.cos(rad))
        y1 = cy + int((inner_r + 30) * math.sin(rad))
        x2 = cx + int(outer_r * math.cos(rad))
        y2 = cy + int(outer_r * math.sin(rad))
        draw.line([(x1, y1), (x2, y2)], fill=color, width=w + 24)

def draw_power(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 250
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=130, end=50, fill=color, width=w)
    draw.line([(cx, cy - r - 40), (cx, cy - 30)], fill=color, width=w)

def draw_clock(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 290
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    draw.line([(cx, cy), (cx, cy - 180)], fill=color, width=w)
    draw.line([(cx, cy), (cx + 120, cy)], fill=color, width=w)
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=color)

def draw_calendar(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    box = [cx - 270, cy - 210, cx + 270, cy + 290]
    draw.rounded_rectangle(box, radius=48, outline=color, width=w)
    draw.line([(cx - 270, cy - 70), (cx + 270, cy - 70)], fill=color, width=w)
    draw.line([(cx - 140, cy - 270), (cx - 140, cy - 180)], fill=color, width=w)
    draw.line([(cx + 140, cy - 270), (cx + 140, cy - 180)], fill=color, width=w)
    for dx in [-130, 0, 130]:
        for dy in [40, 160]:
            draw.ellipse([cx + dx - 20, cy + dy - 20, cx + dx + 20, cy + dy + 20], fill=color)

def draw_cast(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.rounded_rectangle([cx - 300, cy - 220, cx + 300, cy + 220], radius=44, outline=color, width=w)
    # Mask out bottom-left corner cleanly
    draw.rectangle([cx - 315, cy + 20, cx - 90, cy + 235], fill=(0, 0, 0, 0))
    bx = cx - 290
    by = cy + 210
    draw.ellipse([bx - 22, by - 22, bx + 22, by + 22], fill=color)
    draw.arc([bx - 100, by - 100, bx + 100, by + 100], start=270, end=360, fill=color, width=w - 12)
    draw.arc([bx - 190, by - 190, bx + 190, by + 190], start=270, end=360, fill=color, width=w - 12)

def draw_notifications(draw, cx=512, cy=500, color=WHITE, w=STROKE_W):
    draw.arc([cx - 180, cy - 240, cx + 180, cy + 120], start=180, end=0, fill=color, width=w)
    draw.line([(cx - 180, cy - 60), (cx - 240, cy + 120)], fill=color, width=w)
    draw.line([(cx + 180, cy - 60), (cx + 240, cy + 120)], fill=color, width=w)
    draw.line([(cx - 270, cy + 120), (cx + 270, cy + 120)], fill=color, width=w)
    draw.arc([cx - 60, cy + 110, cx + 60, cy + 230], start=0, end=180, fill=color, width=w)
    draw.ellipse([cx - 32, cy - 270, cx + 32, cy - 206], outline=color, width=w - 20)

def draw_profile(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.ellipse([cx - 120, cy - 260, cx + 120, cy - 20], outline=color, width=w)
    draw.arc([cx - 260, cy + 70, cx + 260, cy + 450], start=180, end=0, fill=color, width=w)
    draw.line([(cx - 260, cy + 260), (cx - 260, cy + 320)], fill=color, width=w)
    draw.line([(cx + 260, cy + 260), (cx + 260, cy + 320)], fill=color, width=w)

def draw_more(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    for dx in [-240, 0, 240]:
        draw.ellipse([cx + dx - 44, cy - 44, cx + dx + 44, cy + 44], fill=color)

def draw_volume(draw, cx=440, cy=512, mute=False, color=WHITE, w=STROKE_W):
    points = [
        (cx - 180, cy - 90),
        (cx - 60, cy - 90),
        (cx + 90, cy - 220),
        (cx + 90, cy + 220),
        (cx - 60, cy + 90),
        (cx - 180, cy + 90),
    ]
    draw.line([(cx - 180, cy - 90), (cx - 60, cy - 90)], fill=color, width=w)
    draw.line([(cx - 60, cy - 90), (cx + 90, cy - 220)], fill=color, width=w)
    draw.line([(cx + 90, cy - 220), (cx + 90, cy + 220)], fill=color, width=w)
    draw.line([(cx + 90, cy + 220), (cx - 60, cy + 90)], fill=color, width=w)
    draw.line([(cx - 60, cy + 90), (cx - 180, cy + 90)], fill=color, width=w)
    draw.line([(cx - 180, cy + 90), (cx - 180, cy - 90)], fill=color, width=w)
    if mute:
        mx = cx + 220
        draw.line([(mx - 60, cy - 60), (mx + 60, cy + 60)], fill=color, width=w)
        draw.line([(mx + 60, cy - 60), (mx - 60, cy + 60)], fill=color, width=w)
    else:
        draw.arc([cx - 40, cy - 140, cx + 240, cy + 140], start=305, end=55, fill=color, width=w)
        draw.arc([cx - 40, cy - 230, cx + 330, cy + 230], start=305, end=55, fill=color, width=w)

def draw_weather_sun(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 160
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    rays = 8
    for i in range(rays):
        rad = math.radians(i * (360 / rays))
        x1 = cx + int((r + 40) * math.cos(rad))
        y1 = cy + int((r + 40) * math.sin(rad))
        x2 = cx + int((r + 120) * math.cos(rad))
        y2 = cy + int((r + 120) * math.sin(rad))
        draw.line([(x1, y1), (x2, y2)], fill=color, width=w - 12)

def draw_weather_cloud(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.line([(cx - 230, cy + 120), (cx + 200, cy + 120)], fill=color, width=w)
    draw.arc([cx - 300, cy - 20, cx - 120, cy + 160], start=90, end=270, fill=color, width=w)
    draw.arc([cx - 190, cy - 180, cx + 90, cy + 100], start=160, end=350, fill=color, width=w)
    draw.arc([cx + 50, cy - 60, cx + 250, cy + 140], start=240, end=90, fill=color, width=w)

def draw_weather_rain(draw, cx=512, cy=460, color=WHITE, w=STROKE_W):
    draw_weather_cloud(draw, cx=cx, cy=cy - 40, color=color, w=w)
    for dx in [-130, -10, 110]:
        x = cx + dx
        y = cy + 170
        draw.line([(x, y), (x - 36, y + 80)], fill=color, width=w - 18)

def draw_battery(draw, cx=512, cy=512, level=1.0, color=WHITE, w=STROKE_W):
    box = [cx - 250, cy - 140, cx + 210, cy + 140]
    draw.rounded_rectangle(box, radius=40, outline=color, width=w)
    draw.rounded_rectangle([cx + 220, cy - 60, cx + 264, cy + 60], radius=16, fill=color)
    if level > 0.5:
        for bx in [-190, -75, 40]:
            draw.rounded_rectangle([cx + bx, cy - 90, cx + bx + 75, cy + 90], radius=16, fill=color)
    else:
        draw.rounded_rectangle([cx - 190, cy - 90, cx - 95, cy + 90], radius=16, fill=color)

def draw_live(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.ellipse([cx - 36, cy - 140, cx + 36, cy - 68], fill=color)
    draw.line([(cx, cy - 90), (cx - 160, cy + 260)], fill=color, width=w)
    draw.line([(cx, cy - 90), (cx + 160, cy + 260)], fill=color, width=w)
    draw.line([(cx - 90, cy + 120), (cx + 90, cy + 120)], fill=color, width=w)
    draw.arc([cx - 180, cy - 250, cx + 180, cy + 110], start=210, end=330, fill=color, width=w - 10)
    draw.arc([cx - 300, cy - 370, cx + 300, cy + 230], start=210, end=330, fill=color, width=w - 10)

def draw_bluetooth(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Standard geometric bluetooth rune
    draw.line([(cx, cy - 300), (cx, cy + 300)], fill=color, width=w)
    draw.line([(cx - 160, cy - 150), (cx + 170, cy + 150)], fill=color, width=w)
    draw.line([(cx + 170, cy + 150), (cx, cy + 300)], fill=color, width=w)
    draw.line([(cx - 160, cy + 150), (cx + 170, cy - 150)], fill=color, width=w)
    draw.line([(cx + 170, cy - 150), (cx, cy - 300)], fill=color, width=w)

def draw_display(draw, cx=512, cy=500, color=WHITE, w=STROKE_W):
    # TV Screen & Stand
    draw.rounded_rectangle([cx - 300, cy - 230, cx + 300, cy + 170], radius=40, outline=color, width=w)
    draw.line([(cx, cy + 170), (cx, cy + 260)], fill=color, width=w)
    draw.line([(cx - 140, cy + 260), (cx + 140, cy + 260)], fill=color, width=w)

def draw_downloads(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Arrow down into tray
    draw.line([(cx, cy - 240), (cx, cy + 100)], fill=color, width=w)
    draw.line([(cx - 130, cy - 30), (cx, cy + 100)], fill=color, width=w)
    draw.line([(cx + 130, cy - 30), (cx, cy + 100)], fill=color, width=w)
    # Tray
    draw.line([(cx - 260, cy + 90), (cx - 260, cy + 230)], fill=color, width=w)
    draw.line([(cx - 260, cy + 230), (cx + 260, cy + 230)], fill=color, width=w)
    draw.line([(cx + 260, cy + 230), (cx + 260, cy + 90)], fill=color, width=w)

def draw_file_manager(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Folder
    tab = [
        (cx - 280, cy - 180),
        (cx - 60, cy - 180),
        (cx + 10, cy - 100),
        (cx + 280, cy - 100),
        (cx + 280, cy + 230),
        (cx - 280, cy + 230),
    ]
    draw.rounded_rectangle([cx - 280, cy - 100, cx + 280, cy + 230], radius=40, outline=color, width=w)
    # top tab outline
    draw.line([(cx - 280, cy - 100), (cx - 280, cy - 180)], fill=color, width=w)
    draw.line([(cx - 280, cy - 180), (cx - 60, cy - 180)], fill=color, width=w)
    draw.line([(cx - 60, cy - 180), (cx + 20, cy - 100)], fill=color, width=w)

def draw_info(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 280
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    draw.ellipse([cx - 30, cy - 150, cx + 30, cy - 90], fill=color)
    draw.line([(cx, cy - 30), (cx, cy + 160)], fill=color, width=w)
    draw.line([(cx - 50, cy - 30), (cx, cy - 30)], fill=color, width=w)
    draw.line([(cx - 60, cy + 160), (cx + 60, cy + 160)], fill=color, width=w)

def draw_keyboard(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.rounded_rectangle([cx - 290, cy - 190, cx + 290, cy + 190], radius=44, outline=color, width=w)
    # 2 rows of keys + spacebar
    for dx in [-190, -95, 0, 95, 190]:
        draw.ellipse([cx + dx - 16, cy - 90 - 16, cx + dx + 16, cy - 90 + 16], fill=color)
        draw.ellipse([cx + dx - 16, cy - 16, cx + dx + 16, cy + 16], fill=color)
    draw.line([(cx - 150, cy + 90), (cx + 150, cy + 90)], fill=color, width=w - 16)

def draw_lock(draw, cx=512, cy=530, color=WHITE, w=STROKE_W):
    # Shackle
    draw.arc([cx - 140, cy - 310, cx + 140, cy - 30], start=180, end=0, fill=color, width=w)
    draw.line([(cx - 140, cy - 170), (cx - 140, cy - 30)], fill=color, width=w)
    draw.line([(cx + 140, cy - 170), (cx + 140, cy - 30)], fill=color, width=w)
    # Body
    draw.rounded_rectangle([cx - 210, cy - 40, cx + 210, cy + 240], radius=40, outline=color, width=w)
    # Keyhole
    draw.ellipse([cx - 28, cy + 40, cx + 28, cy + 96], fill=color)
    draw.polygon([(cx - 18, cy + 80), (cx + 18, cy + 80), (cx + 26, cy + 150), (cx - 26, cy + 150)], fill=color)

def draw_memory(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Chip with pins
    draw.rounded_rectangle([cx - 190, cy - 190, cx + 190, cy + 190], radius=40, outline=color, width=w)
    draw.rectangle([cx - 100, cy - 100, cx + 100, cy + 100], outline=color, width=w // 2)
    # Pins top/bottom/left/right
    for d in [-110, 0, 110]:
        draw.line([(cx + d, cy - 260), (cx + d, cy - 190)], fill=color, width=w // 2)
        draw.line([(cx + d, cy + 190), (cx + d, cy + 260)], fill=color, width=w // 2)
        draw.line([(cx - 260, cy + d), (cx - 190, cy + d)], fill=color, width=w // 2)
        draw.line([(cx + 190, cy + d), (cx + 260, cy + d)], fill=color, width=w // 2)

def draw_network(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # 3 nodes connected
    # Top node
    draw.ellipse([cx - 60, cy - 240, cx + 60, cy - 120], outline=color, width=w)
    # Bottom left node
    draw.ellipse([cx - 240, cy + 120, cx - 120, cy + 240], outline=color, width=w)
    # Bottom right node
    draw.ellipse([cx + 120, cy + 120, cx + 240, cy + 240], outline=color, width=w)
    # Lines connecting
    draw.line([(cx, cy - 120), (cx - 150, cy + 130)], fill=color, width=w - 14)
    draw.line([(cx, cy - 120), (cx + 150, cy + 130)], fill=color, width=w - 14)
    draw.line([(cx - 120, cy + 180), (cx + 120, cy + 180)], fill=color, width=w - 14)

def draw_parental(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Shield
    shield = [
        (cx - 240, cy - 240),
        (cx + 240, cy - 240),
        (cx + 240, cy - 20),
        (cx, cy + 270),
        (cx - 240, cy - 20),
    ]
    draw.line([(cx - 240, cy - 240), (cx + 240, cy - 240)], fill=color, width=w)
    draw.line([(cx + 240, cy - 240), (cx + 240, cy - 20)], fill=color, width=w)
    draw.line([(cx + 240, cy - 20), (cx, cy + 270)], fill=color, width=w)
    draw.line([(cx, cy + 270), (cx - 240, cy - 20)], fill=color, width=w)
    draw.line([(cx - 240, cy - 20), (cx - 240, cy - 240)], fill=color, width=w)
    # Inside checkmark or figure
    draw.line([(cx - 90, cy), (cx - 20, cy + 70)], fill=color, width=w)
    draw.line([(cx - 20, cy + 70), (cx + 100, cy - 70)], fill=color, width=w)

def draw_refresh(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 240
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=45, end=315, fill=color, width=w)
    # arrow tip
    ax = cx + int(r * math.cos(math.radians(45)))
    ay = cy + int(r * math.sin(math.radians(45)))
    draw.line([(ax - 20, ay - 90), (ax + 30, ay + 10)], fill=color, width=w)
    draw.line([(ax + 80, ay - 40), (ax + 30, ay + 10)], fill=color, width=w)

def draw_remote(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Sleek Apple TV remote
    draw.rounded_rectangle([cx - 150, cy - 290, cx + 150, cy + 290], radius=50, outline=color, width=w)
    # D-pad circle
    draw.ellipse([cx - 90, cy - 200, cx + 90, cy - 20], outline=color, width=w - 18)
    draw.ellipse([cx - 24, cy - 110 - 24, cx + 24, cy - 110 + 24], fill=color)
    # buttons
    draw.ellipse([cx - 70, cy + 60, cx - 20, cy + 110], fill=color)
    draw.ellipse([cx + 20, cy + 60, cx + 70, cy + 110], fill=color)
    draw.rounded_rectangle([cx - 50, cy + 160, cx + 50, cy + 230], radius=20, outline=color, width=w - 24)

def draw_screenshot(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Crop / camera viewfinder corners + dot
    sz = 260
    cr = 80
    # 4 corners
    # TL
    draw.line([(cx - sz, cy - sz), (cx - sz + cr, cy - sz)], fill=color, width=w)
    draw.line([(cx - sz, cy - sz), (cx - sz, cy - sz + cr)], fill=color, width=w)
    # TR
    draw.line([(cx + sz, cy - sz), (cx + sz - cr, cy - sz)], fill=color, width=w)
    draw.line([(cx + sz, cy - sz), (cx + sz, cy - sz + cr)], fill=color, width=w)
    # BL
    draw.line([(cx - sz, cy + sz), (cx - sz + cr, cy + sz)], fill=color, width=w)
    draw.line([(cx - sz, cy + sz), (cx - sz, cy + sz - cr)], fill=color, width=w)
    # BR
    draw.line([(cx + sz, cy + sz), (cx + sz - cr, cy + sz)], fill=color, width=w)
    draw.line([(cx + sz, cy + sz), (cx + sz, cy + sz - cr)], fill=color, width=w)
    # center lens
    draw.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], outline=color, width=w - 14)

def draw_sleep(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Crescent moon
    draw.arc([cx - 220, cy - 240, cx + 180, cy + 240], start=90, end=270, fill=color, width=w)
    draw.arc([cx - 100, cy - 240, cx + 240, cy + 240], start=105, end=255, fill=color, width=w)
    # Star
    sx, sy = cx + 150, cy - 120
    draw.line([(sx, sy - 50), (sx, sy + 50)], fill=color, width=w - 20)
    draw.line([(sx - 50, sy), (sx + 50, sy)], fill=color, width=w - 20)

def draw_storage(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Server / drive tiers (2 stacked rounded rects)
    draw.rounded_rectangle([cx - 260, cy - 220, cx + 260, cy - 30], radius=32, outline=color, width=w)
    draw.ellipse([cx + 170, cy - 140, cx + 200, cy - 110], fill=color)
    draw.line([(cx - 200, cy - 125), (cx + 80, cy - 125)], fill=color, width=w - 20)
    
    draw.rounded_rectangle([cx - 260, cy + 30, cx + 260, cy + 220], radius=32, outline=color, width=w)
    draw.ellipse([cx + 170, cy + 110, cx + 200, cy + 140], fill=color)
    draw.line([(cx - 200, cy + 125), (cx + 80, cy + 125)], fill=color, width=w - 20)

def draw_update(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Circle arrow with dot inside
    r = 240
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=45, end=315, fill=color, width=w)
    ax = cx + int(r * math.cos(math.radians(45)))
    ay = cy + int(r * math.sin(math.radians(45)))
    draw.line([(ax - 20, ay - 90), (ax + 30, ay + 10)], fill=color, width=w)
    draw.line([(ax + 80, ay - 40), (ax + 30, ay + 10)], fill=color, width=w)
    # Up arrow inside
    draw.line([(cx, cy + 100), (cx, cy - 80)], fill=color, width=w - 14)
    draw.line([(cx - 60, cy - 20), (cx, cy - 80)], fill=color, width=w - 14)
    draw.line([(cx + 60, cy - 20), (cx, cy - 80)], fill=color, width=w - 14)

def draw_cleanup(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Magic wand / cleaner with sparks
    draw.line([(cx - 200, cy + 200), (cx + 140, cy - 140)], fill=color, width=w)
    # Star sparkles around tip
    for sx, sy in [(cx + 180, cy - 220), (cx + 70, cy - 240), (cx + 240, cy - 90)]:
        draw.line([(sx, sy - 30), (sx, sy + 30)], fill=color, width=w - 24)
        draw.line([(sx - 30, sy), (sx + 30, sy)], fill=color, width=w - 24)

def draw_apps_manager(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # 4 clean rounded tiles (2x2 grid)
    offsets = [(-150, -150), (150, -150), (-150, 150), (150, 150)]
    for dx, dy in offsets:
        draw.rounded_rectangle([cx + dx - 90, cy + dy - 90, cx + dx + 90, cy + dy + 90], radius=28, outline=color, width=w)

# Additional for Glossy tiles
def draw_star(draw, cx=512, cy=512, r_out=260, r_in=120, color=WHITE, w=STROKE_W):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        angle = -90 + i * 36
        rad = math.radians(angle)
        pts.append((cx + int(r * math.cos(rad)), cy + int(r * math.sin(rad))))
    for i in range(10):
        draw.line([pts[i], pts[(i + 1) % 10]], fill=color, width=w)

def draw_gallery(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    draw.rounded_rectangle([cx - 260, cy - 200, cx + 260, cy + 200], radius=44, outline=color, width=w)
    draw.ellipse([cx - 160, cy - 130, cx - 80, cy - 50], fill=color)
    # mountains
    pts1 = [(cx - 240, cy + 180), (cx - 80, cy), (cx + 60, cy + 180)]
    draw.line([(cx - 240, cy + 180), (cx - 80, cy)], fill=color, width=w)
    draw.line([(cx - 80, cy), (cx + 60, cy + 180)], fill=color, width=w)
    draw.line([(cx - 10, cy + 180), (cx + 120, cy + 50)], fill=color, width=w)
    draw.line([(cx + 120, cy + 50), (cx + 240, cy + 180)], fill=color, width=w)

def draw_music(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Beamed eighth notes
    draw.line([(cx - 100, cy - 180), (cx + 140, cy - 240)], fill=color, width=w + 14)
    draw.line([(cx - 100, cy - 180), (cx - 100, cy + 140)], fill=color, width=w)
    draw.line([(cx + 140, cy - 240), (cx + 140, cy + 80)], fill=color, width=w)
    draw.ellipse([cx - 180, cy + 90, cx - 60, cy + 210], fill=color)
    draw.ellipse([cx + 60, cy + 30, cx + 180, cy + 150], fill=color)

def draw_video(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Camcorder / video camera
    draw.rounded_rectangle([cx - 240, cy - 160, cx + 100, cy + 160], radius=40, outline=color, width=w)
    pts = [(cx + 100, cy - 70), (cx + 240, cy - 160), (cx + 240, cy + 160), (cx + 100, cy + 70)]
    draw.line(pts[0:2], fill=color, width=w)
    draw.line(pts[1:3], fill=color, width=w)
    draw.line(pts[2:4], fill=color, width=w)

def draw_screen_mirror(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # TV in back, phone in front right
    # TV
    draw.rounded_rectangle([cx - 280, cy - 220, cx + 160, cy + 120], radius=32, outline=color, width=w)
    # Phone
    draw.rounded_rectangle([cx + 40, cy - 40, cx + 260, cy + 240], radius=32, outline=color, width=w)
    draw.ellipse([cx + 140, cy + 190, cx + 160, cy + 210], fill=color)

def draw_subtitles(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # [CC] box
    draw.rounded_rectangle([cx - 280, cy - 180, cx + 280, cy + 180], radius=40, outline=color, width=w)
    # Left C
    draw.arc([cx - 190, cy - 100, cx - 50, cy + 100], start=45, end=315, fill=color, width=w)
    # Right C
    draw.arc([cx + 30, cy - 100, cx + 170, cy + 100], start=45, end=315, fill=color, width=w)

def draw_record(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Outer ring + solid center REC
    draw.ellipse([cx - 260, cy - 260, cx + 260, cy + 260], outline=color, width=w)
    draw.ellipse([cx - 140, cy - 140, cx + 140, cy + 140], fill=color)

def draw_exit(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Door frame + arrow pointing right
    draw.line([(cx - 160, cy + 240), (cx - 240, cy + 240)], fill=color, width=w)
    draw.line([(cx - 240, cy + 240), (cx - 240, cy - 240)], fill=color, width=w)
    draw.line([(cx - 240, cy - 240), (cx - 60, cy - 240)], fill=color, width=w)
    draw.line([(cx - 60, cy - 240), (cx - 60, cy - 140)], fill=color, width=w)
    # Arrow
    draw.line([(cx - 160, cy), (cx + 220, cy)], fill=color, width=w)
    draw.line([(cx + 110, cy - 110), (cx + 220, cy)], fill=color, width=w)
    draw.line([(cx + 110, cy + 110), (cx + 220, cy)], fill=color, width=w)

def draw_language(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r = 270
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    draw.line([(cx - r, cy), (cx + r, cy)], fill=color, width=w - 14)
    # vertical meridian ellipse
    draw.ellipse([cx - 120, cy - r, cx + 120, cy + r], outline=color, width=w - 14)

def draw_youtube(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Rounded rectangle + centered equilateral play triangle
    draw.rounded_rectangle([cx - 270, cy - 180, cx + 270, cy + 180], radius=80, outline=color, width=w)
    # Play triangle
    tri = [(cx - 70, cy - 90), (cx - 70, cy + 90), (cx + 90, cy)]
    draw.polygon(tri, fill=color)

def draw_netflix(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Elegant geometric 'N' ribbon
    h = 240
    w_n = 160
    # Left bar
    draw.line([(cx - w_n, cy - h), (cx - w_n, cy + h)], fill=color, width=w + 14)
    # Right bar
    draw.line([(cx + w_n, cy - h), (cx + w_n, cy + h)], fill=color, width=w + 14)
    # Diagonal bar
    draw.line([(cx - w_n, cy - h), (cx + w_n, cy + h)], fill=color, width=w + 20)

def draw_spotify(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Circle + 3 curved sound wave arcs
    r = 270
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)
    # 3 arcs (slanted slightly)
    for dy, rad, span in [(-70, 190, 60), (30, 160, 55), (120, 130, 50)]:
        draw.arc([cx - rad, cy + dy - rad, cx + rad, cy + dy + rad], start=205, end=335, fill=color, width=w - 10)

def draw_google_play(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Play triangle with sleek internal facets
    tri = [(cx - 160, cy - 240), (cx - 160, cy + 240), (cx + 200, cy)]
    draw.line([(cx - 160, cy - 240), (cx - 160, cy + 240)], fill=color, width=w)
    draw.line([(cx - 160, cy + 240), (cx + 200, cy)], fill=color, width=w)
    draw.line([(cx + 200, cy), (cx - 160, cy - 240)], fill=color, width=w)
    draw.line([(cx - 160, cy - 240), (cx + 20, cy + 70)], fill=color, width=w - 18)
    draw.line([(cx - 160, cy + 240), (cx + 20, cy - 70)], fill=color, width=w - 18)

def draw_chrome(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    r_out = 270
    r_in = 110
    draw.ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], outline=color, width=w)
    draw.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], fill=color)
    # 3 division lines
    draw.line([(cx, cy - r_out), (cx + 150, cy - 60)], fill=color, width=w - 14)
    draw.line([(cx + 220, cy + 130), (cx - 20, cy + 170)], fill=color, width=w - 14)
    draw.line([(cx - 220, cy + 130), (cx - 130, cy - 80)], fill=color, width=w - 14)

def draw_prime_video(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Play button + signature curved arrow smile
    draw.polygon([(cx - 70, cy - 140), (cx - 70, cy + 40), (cx + 90, cy - 50)], fill=color)
    # Smile curve
    draw.arc([cx - 220, cy - 60, cx + 220, cy + 220], start=25, end=155, fill=color, width=w)
    # Arrow head
    draw.line([(cx + 170, cy + 100), (cx + 230, cy + 150)], fill=color, width=w)
    draw.line([(cx + 150, cy + 180), (cx + 230, cy + 150)], fill=color, width=w)

def draw_disney_plus(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Elegant sweeping arc + Plus sign
    draw.arc([cx - 300, cy - 260, cx + 300, cy + 300], start=160, end=350, fill=color, width=w)
    # Plus sign on right
    px, py = cx + 160, cy - 40
    draw.line([(px - 60, py), (px + 60, py)], fill=color, width=w + 10)
    draw.line([(px, py - 60), (px, py + 60)], fill=color, width=w + 10)
    # 'D' form on left
    draw.arc([cx - 240, cy - 120, cx, cy + 160], start=270, end=90, fill=color, width=w)
    draw.line([(cx - 120, cy - 120), (cx - 120, cy + 160)], fill=color, width=w)

def draw_hbo_max(draw, cx=512, cy=512, color=WHITE, w=STROKE_W):
    # Sleek MAX 'M' geometry
    h = 160
    w_m = 180
    pts = [
        (cx - w_m, cy + h),
        (cx - w_m, cy - h),
        (cx, cy + 30),
        (cx + w_m, cy - h),
        (cx + w_m, cy + h)
    ]
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i+1]], fill=color, width=w + 10)

# ----------------- SQUIRCLE TILE GENERATOR FOR GLOSSY -----------------

def create_obsidian_tile(glyph_func, filename, tint_bg=(20, 24, 34), accent=None):
    # Apple TV Obsidian Glass Squircle
    img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Subtle smooth gradient squircle base
    pad = 80
    box = [pad, pad, CANVAS_SIZE - pad, CANVAS_SIZE - pad]
    radius = 240
    
    # Draw dark satin squircle
    base_col = (14, 18, 25, 255)
    top_col = (tint_bg[0], tint_bg[1], tint_bg[2], 255)
    
    # Create mask for squircle
    mask = Image.new("L", (CANVAS_SIZE, CANVAS_SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(box, radius=radius, fill=255)
    
    # Gradient layer
    grad = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad)
    for y in range(CANVAS_SIZE):
        t = y / CANVAS_SIZE
        r = int(top_col[0] * (1 - t) + base_col[0] * t)
        g = int(top_col[1] * (1 - t) + base_col[1] * t)
        b = int(top_col[2] * (1 - t) + base_col[2] * t)
        grad_draw.line([(0, y), (CANVAS_SIZE, y)], fill=(r, g, b, 255))
    
    img.paste(grad, (0, 0), mask)
    
    # 2. Ultra-fine glass hairline border (10px at 1024, ~2.5px at 256)
    border_color = (255, 255, 255, 36)
    draw.rounded_rectangle(box, radius=radius, outline=border_color, width=12)
    
    # Optional subtle top inner specular hairline
    draw.arc([pad + 30, pad + 10, CANVAS_SIZE - pad - 30, pad + 200], start=210, end=330, fill=(255, 255, 255, 25), width=8)

    # 3. Draw Centered Minimalist Glyph
    glyph_func(draw, cx=512, cy=512, color=WHITE)
    
    save_icon(img, os.path.join(GLOSSY_DIR, filename))

# ----------------- MAIN BUILD EXECUTION -----------------

def build_all():
    print("Generating Topbar Icons (19)...")
    topbar_icons = {
        "battery_full.png": lambda d: draw_battery(d, level=1.0),
        "battery_low.png": lambda d: draw_battery(d, level=0.2),
        "calendar.png": lambda d: draw_calendar(d),
        "cast.png": lambda d: draw_cast(d),
        "clock.png": lambda d: draw_clock(d),
        "ethernet.png": lambda d: draw_ethernet(d),
        "live.png": lambda d: draw_live(d),
        "more.png": lambda d: draw_more(d),
        "notifications.png": lambda d: draw_notifications(d),
        "power.png": lambda d: draw_power(d),
        "profile.png": lambda d: draw_profile(d),
        "search.png": lambda d: draw_search(d),
        "settings.png": lambda d: draw_settings(d),
        "volume.png": lambda d: draw_volume(d, mute=False),
        "volume_mute.png": lambda d: draw_volume(d, mute=True),
        "weather_cloud.png": lambda d: draw_weather_cloud(d),
        "weather_rain.png": lambda d: draw_weather_rain(d),
        "weather_sun.png": lambda d: draw_weather_sun(d),
        "wifi.png": lambda d: draw_wifi(d),
    }
    for fname, func in topbar_icons.items():
        img = new_canvas()
        draw = ImageDraw.Draw(img)
        func(draw)
        save_icon(img, os.path.join(TOPBAR_DIR, fname))

    print("Generating System Icons (23)...")
    system_icons = {
        "apps_manager.png": lambda d: draw_apps_manager(d),
        "bluetooth.png": lambda d: draw_bluetooth(d),
        "cast.png": lambda d: draw_cast(d),
        "cleanup.png": lambda d: draw_cleanup(d),
        "display.png": lambda d: draw_display(d),
        "downloads.png": lambda d: draw_downloads(d),
        "file_manager.png": lambda d: draw_file_manager(d),
        "info.png": lambda d: draw_info(d),
        "keyboard.png": lambda d: draw_keyboard(d),
        "lock.png": lambda d: draw_lock(d),
        "memory.png": lambda d: draw_memory(d),
        "network.png": lambda d: draw_network(d),
        "parental.png": lambda d: draw_parental(d),
        "power.png": lambda d: draw_power(d),
        "refresh.png": lambda d: draw_refresh(d),
        "remote.png": lambda d: draw_remote(d),
        "screenshot.png": lambda d: draw_screenshot(d),
        "settings.png": lambda d: draw_settings(d),
        "sleep.png": lambda d: draw_sleep(d),
        "sound.png": lambda d: draw_volume(d, mute=False),
        "storage.png": lambda d: draw_storage(d),
        "update.png": lambda d: draw_update(d),
        "wifi.png": lambda d: draw_wifi(d),
    }
    for fname, func in system_icons.items():
        img = new_canvas()
        draw = ImageDraw.Draw(img)
        func(draw)
        save_icon(img, os.path.join(SYSTEM_DIR, fname))

    print("Generating Glossy App Squircle Tiles (36)...")
    glossy_icons = {
        "apps.png": (lambda d, cx, cy, color: draw_apps_manager(d, cx, cy, color, w=56), (28, 34, 46)),
        "bluetooth.png": (lambda d, cx, cy, color: draw_bluetooth(d, cx, cy, color, w=56), (20, 32, 54)),
        "cast.png": (lambda d, cx, cy, color: draw_cast(d, cx, cy, color, w=56), (24, 30, 42)),
        "chrome.png": (lambda d, cx, cy, color: draw_chrome(d, cx, cy, color, w=56), (26, 32, 44)),
        "cleanup.png": (lambda d, cx, cy, color: draw_cleanup(d, cx, cy, color, w=56), (36, 28, 44)),
        "disney_plus.png": (lambda d, cx, cy, color: draw_disney_plus(d, cx, cy, color, w=56), (18, 28, 56)),
        "exit.png": (lambda d, cx, cy, color: draw_exit(d, cx, cy, color, w=56), (36, 22, 26)),
        "favorites.png": (lambda d, cx, cy, color: draw_star(d, cx, cy, color=color, w=56), (42, 34, 20)),
        "files.png": (lambda d, cx, cy, color: draw_file_manager(d, cx, cy, color, w=56), (22, 32, 42)),
        "gallery.png": (lambda d, cx, cy, color: draw_gallery(d, cx, cy, color, w=56), (24, 34, 34)),
        "google_play.png": (lambda d, cx, cy, color: draw_google_play(d, cx, cy, color, w=56), (20, 36, 42)),
        "hbo_max.png": (lambda d, cx, cy, color: draw_hbo_max(d, cx, cy, color, w=56), (32, 20, 48)),
        "info.png": (lambda d, cx, cy, color: draw_info(d, cx, cy, color, w=56), (22, 28, 38)),
        "keyboard.png": (lambda d, cx, cy, color: draw_keyboard(d, cx, cy, color, w=56), (24, 28, 36)),
        "language.png": (lambda d, cx, cy, color: draw_language(d, cx, cy, color, w=56), (20, 32, 42)),
        "live_tv.png": (lambda d, cx, cy, color: draw_live(d, cx, cy, color, w=56), (44, 24, 26)),
        "media.png": (lambda d, cx, cy, color: draw_video(d, cx, cy, color, w=56), (28, 24, 44)),
        "more.png": (lambda d, cx, cy, color: draw_more(d, cx, cy, color, w=56), (26, 28, 34)),
        "music.png": (lambda d, cx, cy, color: draw_music(d, cx, cy, color, w=56), (38, 22, 40)),
        "netflix.png": (lambda d, cx, cy, color: draw_netflix(d, cx, cy, color, w=56), (44, 18, 22)),
        "network.png": (lambda d, cx, cy, color: draw_network(d, cx, cy, color, w=56), (20, 30, 46)),
        "parental_control.png": (lambda d, cx, cy, color: draw_parental(d, cx, cy, color, w=56), (24, 34, 28)),
        "power.png": (lambda d, cx, cy, color: draw_power(d, cx, cy, color, w=56), (44, 20, 24)),
        "prime_video.png": (lambda d, cx, cy, color: draw_prime_video(d, cx, cy, color, w=56), (18, 34, 48)),
        "profile.png": (lambda d, cx, cy, color: draw_profile(d, cx, cy, color, w=56), (28, 32, 40)),
        "record.png": (lambda d, cx, cy, color: draw_record(d, cx, cy, color, w=56), (42, 20, 24)),
        "screen_mirror.png": (lambda d, cx, cy, color: draw_screen_mirror(d, cx, cy, color, w=56), (22, 30, 44)),
        "search.png": (lambda d, cx, cy, color: draw_search(d, cx, cy, color, w=56), (24, 28, 38)),
        "settings.png": (lambda d, cx, cy, color: draw_settings(d, cx, cy, color, w=56), (28, 30, 36)),
        "spotify.png": (lambda d, cx, cy, color: draw_spotify(d, cx, cy, color, w=56), (18, 40, 28)),
        "storage.png": (lambda d, cx, cy, color: draw_storage(d, cx, cy, color, w=56), (24, 30, 38)),
        "subtitles.png": (lambda d, cx, cy, color: draw_subtitles(d, cx, cy, color, w=56), (26, 30, 40)),
        "update.png": (lambda d, cx, cy, color: draw_update(d, cx, cy, color, w=56), (20, 34, 38)),
        "video.png": (lambda d, cx, cy, color: draw_video(d, cx, cy, color, w=56), (36, 24, 38)),
        "wifi.png": (lambda d, cx, cy, color: draw_wifi(d, cx, cy, color, w=56), (20, 34, 50)),
        "youtube.png": (lambda d, cx, cy, color: draw_youtube(d, cx, cy, color, w=56), (46, 20, 24)),
    }
    for fname, (func, tint) in glossy_icons.items():
        create_obsidian_tile(func, fname, tint_bg=tint)

    print(f"DONE! Generated {len(topbar_icons)} Topbar, {len(system_icons)} System, {len(glossy_icons)} Glossy icons.")

if __name__ == "__main__":
    build_all()
