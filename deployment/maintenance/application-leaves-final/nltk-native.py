"""Six advisory APIs, old/new negative controls, and real native consumers.

Runs only in a disposable networkless image with an empty tmpfs /data.
"""
import json, os, pathlib, pickle, shutil, stat, sys, tempfile
assert os.environ.get('UTILIBRE_SECURITY_DISPOSABLE')=='yes'
import numpy as np
import nltk.data as data
from nltk import pathsec
from nltk.tag.perceptron import AveragedPerceptron, PerceptronTagger
from nltk.classify.maxent import save_maxent_params, load_maxent_params
from nltk.parse import DependencyGraph
from nltk.parse.transitionparser import TransitionParser
from nltk.data import FileSystemPathPointer
mode=sys.argv[1];assert mode in ('old','new')
original=list(data.path);original_env=os.environ.get('NLTK_DATA');base=pathlib.Path(tempfile.mkdtemp(prefix='nltk-security-'))
allowed=base/'allowed';outside=base/'outside';allowed.mkdir(mode=0o700);outside.mkdir(mode=0o700)
data.path[:]=[str(allowed)];os.environ['NLTK_DATA']='';pathsec.ENFORCE=True;pathsec._ALLOWED_ROOTS_CACHE=None;pathsec._LAST_DATA_PATHS=None
def denied(fn):
    try:fn()
    except (PermissionError,ValueError):return True
    return False
assert denied(lambda:pathsec.open(outside/'negative-control','w'))
weights={'bias':{'NOUN':1.0}};model=AveragedPerceptron(weights)
(outside/'read.json').write_text(json.dumps(weights))
graph=DependencyGraph('Economic JJ 2 ATT\nnews NN 3 SBJ\nhas VBD 0 ROOT\nlittle JJ 5 ATT\neffect NN 3 OBJ\non IN 5 ATT\nfinancial JJ 8 ATT\nmarkets NNS 6 PC\n. . 3 PU\n')
parser=TransitionParser('arc-standard');parser.train([graph],str(allowed/'model'),verbose=False)
shutil.copyfile(allowed/'model',outside/'model')
tagger=PerceptronTagger(load=False);tagger.classes={'NOUN'};tagger.model.classes={'NOUN'}
targets=[('averaged-save',lambda:model.save(str(outside/'write.json'))),('averaged-load',lambda:model.load(str(outside/'read.json'))),('transition-parse',lambda:parser.parse([],str(outside/'model'))),('transition-train',lambda:parser.train([graph],str(outside/'trained'),verbose=False)),('maxent-save',lambda:save_maxent_params(np.array([0.2]),{},[],{},str(outside/'maxent'))),('tagger-save',lambda:tagger.save_to_json('eng',str(outside/'tagger')))]
results={}
for name,fn in targets:results[name]=denied(fn)
assert all(v==(mode=='new') for v in results.values()),results
if mode=='new':
    assert not (outside/'write.json').exists();assert not (outside/'trained').exists();assert not (outside/'maxent').exists();assert not (outside/'tagger').exists();assert data.path==[str(allowed)]
    model.save(str(allowed/'weights.json'));copy=AveragedPerceptron();copy.load(str(allowed/'weights.json'));assert copy.weights==weights
    # Real SVC trained by upstream parser and loaded by its exact allowlist.
    parsed=parser.parse([graph],str(allowed/'model'));assert len(parsed)==1 and len(parsed[0].nodes)==len(graph.nodes)
    tagger=PerceptronTagger(load=False);tagger.train([[('fictional','JJ'),('apples','NNS')],[('fresh','JJ'),('pears','NNS')]],nr_iter=2);tagger.save_to_json('eng');assert pathlib.Path(tagger.save_dir).is_relative_to(allowed);assert stat.S_IMODE(os.stat(tagger.save_dir).st_mode)==0o700
    copy=PerceptronTagger(lang='eng',loc=tagger.save_dir);assert copy.tag(['fictional','apples'])==tagger.tag(['fictional','apples'])
    params=(np.array([0.5,-1.25,3.0]),{('word','cat','L1'):5,('shape','upcase','L2'):7},['L1','L2'],{})
    path=save_maxent_params(*params);reloaded=load_maxent_params(FileSystemPathPointer(path));assert np.allclose(reloaded[0],params[0]);assert reloaded[1:]==params[1:];assert stat.S_IMODE(os.stat(path).st_mode)==0o700
    for fragment in ['../escape','a/b','a\\b','x\x00y']:
        assert denied(lambda:tagger.save_to_json(fragment,str(allowed/'bad')))
    (allowed/'escape.json').symlink_to(outside/'read.json');assert denied(lambda:copy.model.load(allowed/'escape.json'))
    os.link(outside/'read.json',allowed/'hardlink.json');assert denied(lambda:copy.model.load(allowed/'hardlink.json'))
    os.mkfifo(allowed/'fifo');assert denied(lambda:copy.model.load(allowed/'fifo'))
    # Returning to the installed data roots is a test teardown, not a production
    # sandbox relaxation. No model/resource download is allowed in this network.
data.path[:]=original
if original_env is None:os.environ.pop('NLTK_DATA',None)
else:os.environ['NLTK_DATA']=original_env
pathsec._ALLOWED_ROOTS_CACHE=None;pathsec._LAST_DATA_PATHS=None
if mode=='new':
    from ingredient_parser import parse_ingredient
    parsed=parse_ingredient('2 cups all-purpose flour')
    assert parsed.name and 'flour' in parsed.name[0].text
    assert parsed.amount and float(parsed.amount[0].quantity)==2.0
shutil.rmtree(base)
print('NLTK_NATIVE_RESULT '+json.dumps({'passed':True,'mode':mode,'sixApiNegativeControls':results,'realTransitionSVC':True,'perceptronAndMaxentRoundtrips':mode=='new','symlinkHardlinkFifoDenied':mode=='new','ingredientParserConsumer':mode=='new','network':'none'}))
