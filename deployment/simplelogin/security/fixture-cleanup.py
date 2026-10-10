"""Only the guarded fictional account in the networkless regression database."""
import json, os
assert os.environ['DB_URI'].startswith('postgresql+psycopg2://postgres@127.0.0.1:5432/simplelogin')
assert os.environ['URL'] == 'https://simplelogin.example.invalid'
from server import create_light_app
from app.models import User, Alias, DomainDeletedAlias
from app.alias_delete import perform_alias_deletion
with create_light_app().app_context():
    user = User.get_by(email='curator@example.org')
    assert user and user.name == 'Fictional museum curator'
    assert User.query().count() == 1 and Alias.query().count() == 2
    alias = Alias.get_by(email='exhibition@museum.example.org')
    assert alias and alias.user_id == user.id
    perform_alias_deletion(alias, user, commit=True)
    assert Alias.get_by(email='exhibition@museum.example.org') is None
    assert DomainDeletedAlias.get_by(email='exhibition@museum.example.org') is not None
    uid = user.id
    User.delete(uid, commit=True)
    assert User.query().count() == 0 and Alias.query().count() == 0
    print(json.dumps({'restored_fixture_checked': True, 'native_alias_delete': True, 'alias_reservation_observed': True, 'native_model_account_cleanup': True, 'remaining_users': 0, 'remaining_aliases': 0, 'confirmation_mail_ui_not_tested': True}))
