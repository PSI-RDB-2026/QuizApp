import pytest

from db import database


def test_row_to_mapping_dummy():
    # Ensure that fetch_one/fetch_all wrappers are callable; we can't open DB here.
    # Validate that function names exist on module so importing is safe.
    assert hasattr(database, "fetch_one")
    assert hasattr(database, "fetch_all")
    assert hasattr(database, "execute")
    assert hasattr(database, "execute_on_connection")
    assert hasattr(database, "transaction")


def test_init_db_noop(monkeypatch):
    # Avoid calling init_db (which touches external DB). Instead test param normalization
    assert database._normalize_params(()) == {}
    assert database._normalize_params(({"a": 1},)) == {"a": 1}
    with pytest.raises(ValueError):
        database._normalize_params((1, 2))
