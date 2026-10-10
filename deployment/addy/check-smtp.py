"""Read-only SMTP recipient checks, never DATA or an outside delivery."""
import datetime,json,pathlib,smtplib
q=json.load(open('/opt/utilibre/addy/private/qa-alias.json'))
s=smtplib.SMTP('127.0.0.1',2527,timeout=10)
ehlo=s.ehlo('qa.utilibre.org')[0];sender=s.mail('')[0];known=s.rcpt(q['email'])[0];s.rset();s.mail('');unrelated=s.rcpt('fictional@example.invalid')[0];s.quit()
assert ehlo==250 and sender==250 and known==250,(ehlo,sender,known)
assert unrelated>=400,unrelated
p=pathlib.Path('/opt/utilibre/reports/addy-20261009/smtp-result.json');p.write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'knownRecipientAccepted':True,'unrelatedDomainNotAccepted':True,'unrelatedRecipientCode':unrelated,'dataSent':False,'externalDeliveryTested':False},indent=2)+'\n');print('Addy accepts its native alias and rejects unrelated relay recipients; no message DATA sent.')
