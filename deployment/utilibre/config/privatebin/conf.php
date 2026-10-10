[main]
; Native custom template: only the empty homepage is discoverable.
template = "bootstrap5-utilibre"
name = "PrivateBin at Utilibre"
basepath = "https://paste.utilibre.org/"
info = "<a href='https://utilibre.org/es/'>Más herramientas de Utilibre</a> · <a href='https://utilibre.org/en/'>More tools from Utilibre</a> · <a href='https://privatebin.info/'>PrivateBin</a>"
discussion = false
opendiscussion = false
password = true
fileupload = false
burnafterreadingselected = false
defaultformatter = "plaintext"
sizelimit = 2097152
languageselection = true

[expire]
default = "1day"

[expire_options]
5min = 300
10min = 600
1hour = 3600
1day = 86400
1week = 604800

[formatter_options]
plaintext = "Plain Text"
syntaxhighlighting = "Source Code"
markdown = "Markdown"

[traffic]
limit = 10
header = "X_FORWARDED_FOR"

[purge]
limit = 300
batchsize = 10

[model]
class = Filesystem

[model_options]
dir = PATH "data"
