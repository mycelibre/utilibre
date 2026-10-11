"""Read-only/network-none candidate container; synthetic files only in tmpfs."""
import json
import os
import pathlib
import subprocess
import tempfile

def run(args):
    return subprocess.run(args, check=True, capture_output=True, timeout=30).stdout

assert os.getuid() == 1001 and os.getgid() == 1001
for tool in ['/opt/jre/bin/java', '/opt/imagick/bin/magick', '/usr/bin/fontforge', '/usr/bin/prlimit', '/usr/bin/woff2_decompress', '/usr/bin/sfnt2woff']:
    assert os.access(tool, os.X_OK), tool
run(['java', '-version'])
with tempfile.TemporaryDirectory(prefix='fictional-penpot-') as tmp:
    target = pathlib.Path(tmp)
    source = target/'fictional.png'
    run(['magick', '-size', '320x240', 'xc:#1248ac', str(source)])
    assert run(['magick','identify','-format','%m %w %h',str(source)]).decode() == 'PNG 320 240'
    for fmt in ['jpeg','webp','png']:
        output=target/('thumbnail.'+fmt)
        run(['prlimit','--as=1073741824','--cpu=20','--','magick',str(source),'-strip','-thumbnail','100x100>','-quality','85',str(output)])
        assert run(['magick','identify','-format','%w %h',str(output)]).decode() == '100 75'
    # Create an original one-glyph font, not third-party or user content.
    ttf=target/'fictional.ttf'
    ff="""import fontforge
font=fontforge.font()
font.fontname='UtilibreFictional'
font.familyname='Utilibre Fictional'
font.fullname='Utilibre Fictional'
g=font.createChar(65,'A')
p=g.glyphPen()
p.moveTo((100,0));p.lineTo((300,700));p.lineTo((500,0));p.closePath()
del p
g.width=600
font.generate(%r)
font.close()
""" % str(ttf)
    run(['fontforge','-lang=py','-c',ff])
    run(['sfnt2woff',str(ttf)])
    woff=target/'fictional.woff'
    assert woff.read_bytes()[:4] == b'wOFF'
    restored=run(['woff2sfnt',str(woff)])
    assert restored[:4] == b'\x00\x01\x00\x00'
    run(['woff2_compress',str(ttf)])
    woff2=target/'fictional.woff2'
    assert woff2.read_bytes()[:4] == b'wOF2'
    ttf.unlink()
    run(['woff2_decompress',str(woff2)])
    assert ttf.read_bytes()[:4] == b'\x00\x01\x00\x00'
    run(['fontforge','-lang=ff','-c',"Open('%s'); Generate('%s')" % (ttf,target/'fictional.otf')])
    assert (target/'fictional.otf').read_bytes()[:4] == b'OTTO'
print(json.dumps({'rasterGeneration':True,'pngJpegWebpThumbnails':True,'fontforgeTtfOtf':True,'woffRoundtrip':True,'woff2Roundtrip':True,'prlimitAvailable':True,'nativeUser':1001,'network':'none','scope':'Synthetic native command checks; not every font, raster codec or document format.'}))
