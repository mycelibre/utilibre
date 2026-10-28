"""Real path validation; intercepted Weka lookup, no JVM or user files."""
import json,os,pathlib,sys,tempfile
import nltk
from nltk import data,pathsec
from nltk.classify import weka
assert nltk.__version__==sys.argv[1]
fixed=sys.argv[2]=='fixed'
original=list(data.path)
class LookupReached(Exception):pass
def lookup():raise LookupReached()
weka.config_weka=lookup
with tempfile.TemporaryDirectory(prefix='utilibre-weka-') as work:
 root=pathlib.Path(work);allowed=root/'allowed';outside=root/'outside'
 allowed.mkdir();outside.mkdir();(outside/'model').write_text('fictional')
 (allowed/'link').symlink_to(outside/'model')
 data.path[:]=[str(allowed)];os.environ['NLTK_DATA']=''
 pathsec.ENFORCE=True;pathsec._ALLOWED_ROOTS_CACHE=None;pathsec._LAST_DATA_PATHS=None
 bad=[str(outside/'model'),str(outside/'new'),str(allowed/'link'),'../escape','-loadModel','https://example.invalid/model']
 denied=[]
 for path in bad:
  obj=object.__new__(weka.WekaClassifier);obj._model=path;obj._formatter=None
  for call in [lambda:weka.WekaClassifier(None,path),lambda:obj.classify_many([{'a':1}]),lambda:weka.WekaClassifier.train(path,[({'a':1},'yes')])]:
   try:call();blocked=False
   except LookupReached:blocked=False
   except (PermissionError,ValueError):blocked=True
   denied.append(blocked)
 assert denied==[fixed]*18,denied
 normal=0
 new=str(allowed/'new');existing=allowed/'existing';existing.write_text('fictional')
 assert weka.WekaClassifier(None,new)._model==new;normal+=1
 assert weka.WekaClassifier(None,str(existing))._model==str(existing);normal+=1
 for call in [lambda:weka.WekaClassifier(None,new).classify_many([{'a':1}]),lambda:weka.WekaClassifier.train(new,[({'a':1},'yes')])]:
  try:call();raise AssertionError('Native Weka lookup was not reached')
  except LookupReached:normal+=1
 formatter=weka.ARFF_Formatter.from_train([({'a':1},'yes'),({'a':0},'no')])
 output=str(allowed/'fictional.arff');formatter.write(output,[({'a':1},'yes')])
 assert '@DATA' in pathlib.Path(output).read_text().upper();normal+=1
 data.path[:]=original;os.environ.pop('NLTK_DATA',None)
 pathsec._ALLOWED_ROOTS_CACHE=None;pathsec._LAST_DATA_PATHS=None
 from ingredient_parser import parse_ingredient
 parsed=parse_ingredient('2 cups all-purpose flour')
 assert parsed.name and 'flour' in parsed.name[0].text and float(parsed.amount[0].quantity)==2;normal+=1
print(json.dumps({'passed':True,'normalChecks':normal,'modelPathsRejected':all(denied),'rejectionChecks':len(denied),'wekaLookupIntercepted':True,'actualIngredientParser':True,'network':'none','limitation':'Weka JVM execution is not exercised; validation and ARFF generation are native.'}))
