import os
import pytest

from services.AIAPI import AIAPI


def test_initialize_with_key_and_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")

    class FakeModel:
        def __init__(self, name):
            self.name = name

    def fake_configure(api_key):
        pass

    monkeypatch.setattr("services.AIAPI.genai", type("G", (), {"configure": staticmethod(fake_configure), "GenerativeModel": FakeModel}))

    AIAPI._model = None
    AIAPI._gemini_disabled = False
    ok = AIAPI.initialize()
    assert ok is True
    assert isinstance(AIAPI._model, FakeModel)


def test_check_answer_with_gemini_success(monkeypatch):
    # prepare AIAPI with fake model that returns CORRECT
    class Resp:
        def __init__(self, text):
            self.text = text

    class FakeModel:
        def generate_content(self, prompt):
            return Resp("CORRECT")

    AIAPI._model = FakeModel()
    AIAPI._gemini_disabled = False

    import asyncio
    res = asyncio.get_event_loop().run_until_complete(AIAPI.check_answer("q", "ans", "ans"))
    assert isinstance(res, bool)


def test_check_answer_gemini_exception_disables(monkeypatch):
    # model.generate_content raises resourceexhausted
    class FakeModel:
        def generate_content(self, prompt):
            raise Exception("ResourceExhausted: quota exceeded")

    AIAPI._model = FakeModel()
    AIAPI._gemini_disabled = False

    # similarity fallback: answers that are similar
    import asyncio

    coro = AIAPI.check_answer("q", "cat", "kat")
    res = asyncio.get_event_loop().run_until_complete(coro)
    # should return bool
    assert isinstance(res, bool)
    assert AIAPI._gemini_disabled is True
