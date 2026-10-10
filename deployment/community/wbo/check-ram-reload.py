from ram_history import *
NAME='utilibre-wbo-fictional-ram-rehearsal'
old_fd=None; data=None
assert NAME not in run('docker','ps','-a','--format','{{.Names}}').decode().splitlines(), 'Do not overwrite an existing container'

def start(image):
    run('docker','run','-d','--name',NAME,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','.5','--pids-limit','64','--log-driver','none','--tmpfs','/opt/app/server-data:rw,nosuid,nodev,noexec,size=64m,uid=1000,gid=1000','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=8m,uid=1000,gid=1000','-e','HOST=127.0.0.1',image)
    ready(NAME)

def draw(number):
    script = '''
const id='rfictional'+process.argv[1];
const ws=new WebSocket('ws://127.0.0.1:8080/socket.io/?EIO=4&transport=websocket&board=fictional-ram-rehearsal&baselineSeq='+(Number(process.argv[1])-1));
const timer=setTimeout(()=>process.exit(1),10000);
ws.addEventListener('message', e=>{
 const s=String(e.data);
 if(s.startsWith('0'))ws.send('40');
 else if(s.startsWith('40')) ws.send('42'+JSON.stringify(['broadcast',{tool:3,type:1,id,color:'#123456',size:10,opacity:1,x:20,y:20,x2:70,y2:70,clientMutationId:'cm'+id}]));
 else if(s==='2')ws.send('3');
 else if(s.startsWith('42["broadcast"')&&s.includes(id)){clearTimeout(timer);ws.close();setTimeout(()=>process.exit(0),100);}
});
'''
    run('docker','exec',NAME,'node','-e',script,str(number))

def count_expected(number):
    script = "fetch('http://127.0.0.1:8080/boards/fictional-ram-rehearsal').then(r=>r.text()).then(t=>{for(let i=1;i<=Number(process.argv[1]);i++)if(!t.includes('rfictional'+i))process.exit(1)})"
    run('docker','exec',NAME,'node','-e',script,str(number))

try:
    start('utilibre-wbo:2.9.0-p2'); draw(1)
    time.sleep(3); count_expected(1)
    old_fd=directory_fd(NAME)
    run('docker','stop','--time','30',NAME)
    assert inspect(NAME)['State']['ExitCode']==0
    data, expected=archive(old_fd)
    assert expected['files']==1 and expected['bytes']>0
    # Removing the stopped container must not free the held tmpfs filesystem.
    run('docker','rm',NAME)
    assert aggregate(old_fd)==expected
    start('utilibre-wbo:2.9.0-p3'); restore(NAME,data,expected)
    assert aggregate(old_fd)==expected
    count_expected(1); draw(2); count_expected(2)
    # Rehearse rollback into the original image from a new native final save.
    second_fd=directory_fd(NAME)
    run('docker','stop','--time','30',NAME)
    rollback, after=archive(second_fd)
    run('docker','rm',NAME)
    start('utilibre-wbo:2.9.0-p2'); restore(NAME,rollback,after); count_expected(2)
    os.close(second_fd)
    print(json.dumps({'result':'PASS','native_shutdown_exit':0,'network':'none','tmpfs_survives_stop_and_remove_while_descriptor_open':True,'original':expected,'native_reopen_and_new_mutation':True,'rollback_reopen':True,'regular_file_board_archives':0}))
finally:
    try: run('docker','rm','-f',NAME)
    except RuntimeError: pass
    if old_fd is not None: os.close(old_fd)
    data=None
