# Valid-token compatibility only. No key-confusion or bypass reproduction.
import json,secrets
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa,ec
from cryptography.hazmat.primitives import serialization
claims={'sub':'fictional-native-check'}
keys=[('HS256',secrets.token_bytes(32),None),('RS256',rsa.generate_private_key(public_exponent=65537,key_size=2048),None),('ES256',ec.generate_private_key(ec.SECP256R1()),None)]
for algorithm,private,_ in keys:
 public=private if algorithm=='HS256' else private.public_key()
 token=jwt.encode(claims,private,algorithm=algorithm)
 assert jwt.decode(token,public,algorithms=[algorithm])==claims
print(json.dumps({'passed':True,'version':jwt.__version__,'validAlgorithmRoundTrips':3,'network':'none','bypassReproduction':False}))
