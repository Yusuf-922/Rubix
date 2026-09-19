from pathlib import Path
from PIL import Image, ImageOps
import json

source = Path(r'C:/Users/EXCALİBUR/Downloads/küp')
destination = Path(__file__).parent / 'fixtures' / 'real'
destination.mkdir(parents=True, exist_ok=True)
files = ['5bd01c08-2394-45db-a770-1df2cf45cd9f.jpg','a54ea07e-c6b3-4253-9a88-779d76c609c0.jpg','7e2ea2de-aae3-4ded-90cf-9ba9974757d2.jpg','bf406459-8154-449e-b3c3-4c23da46bf96.jpg','2efe0f64-a859-4ddf-b639-961b9100a40d.jpg','3e7c9352-8a80-4b1c-acaf-25879556868b.jpg']
manifest=[]
for name in files:
    image=ImageOps.exif_transpose(Image.open(source/name)).convert('RGBA')
    image.thumbnail((640,640))
    target=name.replace('.jpg','.rgba')
    (destination/target).write_bytes(image.tobytes())
    manifest.append(dict(name=name,file=target,width=image.width,height=image.height))
(destination/'manifest.json').write_text(json.dumps(manifest),encoding='utf-8')
print('Altı gerçek fotoğraf test için hazırlandı.')
