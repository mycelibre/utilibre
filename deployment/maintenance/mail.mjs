// Existing internal relay, verified STARTTLS, fixed operator recipient.
import {execFileSync} from 'node:child_process';
export function sendOperatorMail(subject,body){
 if(/[\r\n]/.test(subject)||subject.length>160||body.length>40000)throw Error('Invalid maintenance message');
 const program=`import smtplib,ssl,json,sys,socket
from email.message import EmailMessage
class Relay(smtplib.SMTP):
 def _get_socket(self,host,port,timeout):
  return socket.create_connection(('10.10.1.20',port),timeout)
data=json.load(sys.stdin)
m=EmailMessage();m['From']='no-reply@utilibre.org';m['To']='admin@utilibre.org';m['Subject']=data['subject'];m.set_content(data['body'])
with Relay('mx.mailgt.dev',26,timeout=15) as server:
 server.starttls(context=ssl.create_default_context());server.send_message(m)
`;
 execFileSync('python3',['-c',program],{input:JSON.stringify({subject,body}),stdio:['pipe','ignore','pipe'],timeout:25000});
}
