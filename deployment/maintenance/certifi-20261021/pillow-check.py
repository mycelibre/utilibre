"""Synthetic normal image operations plus upstream's JPEG tile-boundary test.
Reference: Pillow 13.0.0 Tests/test_file_jpeg.py::test_wider_than_tile.
No exploit payload, files from users, or network. Run only in isolated containers.
"""
import io, json, sys
from PIL import Image, ImageOps, UnidentifiedImageError
import PIL
assert PIL.__version__ == sys.argv[1]
image=Image.new('RGB',(128,64),(45,120,180))
formats={}
for fmt in ['JPEG','PNG','WEBP']:
    data=io.BytesIO();image.save(data,format=fmt);data.seek(0)
    with Image.open(data) as reopened:
        assert reopened.size==(128,64);reopened.load()
        result=ImageOps.exif_transpose(reopened);result.thumbnail((32,32))
        assert result.size==(32,16)
        out=io.BytesIO();result.save(out,format=fmt);out.seek(0)
        with Image.open(out) as checked: checked.load();assert checked.size==(32,16)
        formats[fmt]=len(out.getvalue())
rgba=Image.new('RGBA',(8,8),(1,2,3,0));data=io.BytesIO();rgba.save(data,format='PNG');data.seek(0)
assert Image.open(data).getpixel((0,0))[3]==0
try: Image.open(io.BytesIO(b'not an image'))
except UnidentifiedImageError: pass
else: raise AssertionError('Invalid input accepted')
print(json.dumps({'version':PIL.__version__,'formats':formats,'transparency':True,'invalidInputRejected':True}),flush=True)
if len(sys.argv)>2 and sys.argv[2]=='regression':
    data=io.BytesIO();image.save(data,format='JPEG');data.seek(0)
    with Image.open(data) as im:
        im.tile=[im.tile[0]._replace(extents=(0,0,64,32))]
        try: im.load()
        except OSError as e: assert 'broken data stream' in str(e)
        else: raise AssertionError('JPEG wider than tile accepted')
    print(json.dumps({'jpegTileOverflowRejected':True}),flush=True)
