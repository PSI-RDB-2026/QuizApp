import pytest

from routers import multiplayer


def test_extract_user_data_variants():
    # exercise helper with dict and object
    d = {'uid': 'u', 'username': 'n'}
    res = multiplayer._extract_user_data(d)
    assert isinstance(res, tuple)
    assert res[0] == 'n' and res[1] == 'u'

    res2 = multiplayer._extract_user_data(['n2', 'u2'])
    assert res2[0] == 'n2' and res2[1] == 'u2'


def test_serialize_model_simple():
    # ensure serializer works for objects exposing .dict()
    class M:
        def dict(self):
            return {"id": 1, "players": []}

    obj = M()
    s = multiplayer._serialize_model(obj)
    assert isinstance(s, dict)
