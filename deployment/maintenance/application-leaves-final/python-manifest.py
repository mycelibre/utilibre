import hashlib,json,os,stat,sys
out={}
for root in json.loads(sys.argv[1]):
    for base,dirs,files in os.walk(root):
        dirs.sort();files.sort()
        for name in files:
            path=os.path.join(base,name);s=os.lstat(path)
            if stat.S_ISREG(s.st_mode):out[path]={'sha256':hashlib.file_digest(open(path,'rb'),'sha256').hexdigest(),'mode':stat.S_IMODE(s.st_mode),'uid':s.st_uid,'gid':s.st_gid}
            elif stat.S_ISLNK(s.st_mode):out[path]={'link':os.readlink(path)}
print(json.dumps(out,sort_keys=True))
