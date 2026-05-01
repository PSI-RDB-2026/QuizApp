import pytest

from routers.multiplayer import _extract_user_data, _serialize_model
from services.MultiplayerMatchService import MultiplayerMatchService


def test_extract_user_data_none():
    with pytest.raises(Exception):
        _extract_user_data(None)


def test_extract_user_data_mapping():
    class R:
        def __init__(self):
            self._mapping = {"username": "u", "uid": "id1"}

    name, uid = _extract_user_data(R())
    assert name == "u" and uid == "id1"


def test_extract_user_data_dict():
    name, uid = _extract_user_data({"username": "a", "uid": "b"})
    assert name == "a"


def test_serialize_model_dict():
    class M:
        def dict(self):
            return {"x": 1}

    assert _serialize_model(M()) == {"x": 1}


def test_elo_delta():
    w, l = MultiplayerMatchService._elo_delta(1500, 1400)
    assert isinstance(w, int) and isinstance(l, int)
    assert w == -l
