"""Mechanical extraction of the named upstream security changes only.

No dependency upgrades or wholesale module replacement. Inputs are the exact
image source plus recorded immutable upstream commits. All other AST definitions
remain byte-identical; the resulting unified patch is retained for review.
"""
import ast, difflib, hashlib, json, pathlib, sys
d=pathlib.Path(sys.argv[1]); upstream=d/'upstream/nltk'; original=d/'original'; out=d/'context/nltk'
out.mkdir(parents=True,exist_ok=True)
def read(root,name): return (root/name).read_text()
def nodes(text):
    result={}
    def walk(items,prefix=''):
        for n in items:
            if isinstance(n,(ast.FunctionDef,ast.ClassDef)):
                result[prefix+n.name]=n
                if isinstance(n,ast.ClassDef):walk(n.body,prefix+n.name+'.')
            elif isinstance(n,ast.Assign):
                for target in n.targets:
                    if isinstance(target,ast.Name):result[prefix+target.id]=n
    walk(ast.parse(text).body);return result
def fragment(text,n):
    start=min([n.lineno]+[a.lineno for a in getattr(n,'decorator_list',[])])-1
    return ''.join(text.splitlines(True)[start:n.end_lineno])
def replace(text,target,new):
    n=nodes(text)[target];start=min([n.lineno]+[a.lineno for a in getattr(n,'decorator_list',[])])-1
    lines=text.splitlines(True);return ''.join(lines[:start])+new+''.join(lines[n.end_lineno:])
changes={}
def finish(name,text):
    ast.parse(text);p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
    old=read(original,name);assert old!=text
    changes[name]={'before':hashlib.sha256(old.encode()).hexdigest(),'after':hashlib.sha256(text.encode()).hexdigest()}
    with (d/'backport.patch').open('a') as f:f.writelines(difflib.unified_diff(old.splitlines(True),text.splitlines(True),fromfile='a/nltk/'+name,tofile='b/nltk/'+name))
(d/'backport.patch').write_text('')
# Exact upstream dependencies of the public API fixes; existing hardened opener
# and its prior patches are intentionally not replaced.
name='pathsec.py';old=read(original,name);src=read(upstream,name);ns=nodes(src)
helpers=['_WINDOWS_DEVICE_NAMES','_REFUSING_ERRNOS','_URL_SCHEME_RE','_FILE_SCHEME_RE','_as_path_text','_reject_bad_name_syntax','_reject_url_shaped','_reject_aliased_or_special','_reject_unsafe_open','validate_tool_path','validate_tool_dir']
assert all(n not in nodes(old) for n in helpers)
finish(name,old+'\n\n# Upstream model-path security backport; see Utilibre source offer.\nimport errno\nimport re\n\n'+'\n\n'.join(fragment(src,ns[n]) for n in helpers))
name='data.py';old=read(original,name);src=read(upstream,name);assert 'make_staging_dir' not in nodes(old)
finish(name,old+'\n\n# Exact upstream private model staging primitive.\nimport atexit\nimport shutil\nimport tempfile\nfrom nltk.pathsec import validate_path as _validate_path\n\n'+fragment(src,nodes(src)['make_staging_dir']))
name='tag/perceptron.py';old=read(original,name);src=read(upstream,name);text=old
text=replace(text,'_authorize_private_dir',fragment(src,nodes(src)['_validate_name_component']))
for n in ['_open_private_model_dir','AveragedPerceptron.save','AveragedPerceptron.load','PerceptronTagger.__init__','PerceptronTagger.param_files','PerceptronTagger.save_to_json','PerceptronTagger.load_from_json']:
    text=replace(text,n,fragment(src,nodes(src)[n]))
needle=fragment(text,nodes(text)['PerceptronTagger.param_files']);text=text.replace(needle,fragment(src,nodes(src)['PerceptronTagger.save_dir'])+'\n'+needle,1)
text+='\n\n# Dependencies of the exact upstream model-path API backport.\nimport errno\nfrom nltk.data import make_staging_dir\nfrom nltk.pathsec import _fd_realpath, validate_path, validate_tool_dir, validate_tool_path\nfrom nltk.pathsec import open as pathsec_open\n'
finish(name,text)
name='classify/maxent.py';old=read(original,name);src=read(upstream,name)
text=replace(old,'save_maxent_params',fragment(src,nodes(src)['save_maxent_params']))
finish(name,text+'\n\n# Dependencies of upstream private model persistence.\nimport os\nfrom nltk.data import make_staging_dir\nfrom nltk.pathsec import open as pathsec_open\nfrom nltk.pathsec import validate_path\nfrom nltk.tabdata import MaxentEncoder\n')
name='parse/transitionparser.py';old=read(original,name);src=read(upstream,name);text=old
# The existing exact pickle allowlist remains unchanged. Only the two public
# model read/write methods take their upstream sandboxed implementation.
for n in ['TransitionParser.train','TransitionParser.parse']:text=replace(text,n,fragment(src,nodes(src)[n]))
finish(name,text+'\n\nfrom nltk.pathsec import open as pathsec_open\n')
(d/'backport.json').write_text(json.dumps({'files':changes,'exactUpstreamBodies':True,'pythonDependenciesChanged':False,'passed':True},indent=2)+'\n')
