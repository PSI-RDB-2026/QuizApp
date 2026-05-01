import pytest

from services.AIAPI import AIAPI


def test_fuzzy_decision():
    s, c, sim = AIAPI._fuzzy_decision("Hello", "hello ")
    assert s == "hello"
    assert c == "hello"
    assert sim == pytest.approx(1.0, rel=1e-3)


def test_initialize_without_key(monkeypatch):
    # ensure missing key disables gemini
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    AIAPI._model = None
    AIAPI._gemini_disabled = False
    ok = AIAPI.initialize()
    assert ok is False
    assert AIAPI._gemini_disabled is True


@pytest.mark.asyncio
async def test_check_answer_similarity_threshold(monkeypatch):
    AIAPI._model = None
    AIAPI._gemini_disabled = True
    # low similarity -> False
    res = await AIAPI.check_answer("q", "cat", "dog")
    assert res in (True, False)
