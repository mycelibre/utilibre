"""Run inside native Django shell; removes only the documented fictional accounts."""
from django.contrib.auth.models import User
from bookmarks.models import Bookmark, ApiToken
from django.test import Client
users=[('linkding-fixture-a','linkding-fixture-a@example.invalid'),('linkding-fixture-b','linkding-fixture-b@example.invalid'),('utilibre-check-a','utilibre-check-a@utilibre.org')]
removed=0
for username,email in users:
 user=User.objects.get(username=username,email=email)
 assert not user.is_superuser
 token=ApiToken.objects.create(user=user,name='Fictional deletion verification')
 client=Client(HTTP_HOST='bookmarks.utilibre.org')
 for bookmark in Bookmark.objects.filter(owner=user):
  assert bookmark.url=='https://example.invalid/fictional-bookmark'
  response=client.delete('/api/bookmarks/'+str(bookmark.pk)+'/',HTTP_AUTHORIZATION='Token '+token.key)
  assert response.status_code==204;removed+=1
 # Native admin ORM account deletion is the upstream supported operator method.
 user.delete()
 assert not ApiToken.objects.filter(pk=token.pk).exists()
assert not Bookmark.objects.filter(url='https://example.invalid/fictional-bookmark').exists()
print('Fictional bookmarks removed:',removed,'; three synthetic accounts and API tokens removed through native Django models.')
