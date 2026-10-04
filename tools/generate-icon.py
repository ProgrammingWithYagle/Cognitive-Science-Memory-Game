from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
im = Image.new('RGBA', (256, 256), (246, 244, 237, 255))
d = ImageDraw.Draw(im)
for box, color in [((30,30,113,113),'#21695e'),((143,30,226,113),'#e8997d'),((30,143,113,226),'#dac669'),((143,143,226,226),'#293731')]:
    d.rounded_rectangle(box, radius=24, fill=color)
im.save(root / 'desktop/icon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
