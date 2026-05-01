import pytest

from services.QuestionsService import QuestionsService


class DummyRow:
    def __init__(self, mapping):
        self._mapping = mapping


@pytest.mark.asyncio
async def test_get_rand_question_standard(monkeypatch):
    async def fake(*args, **kwargs):
        return DummyRow({"id": 1, "question_text": "Q", "correct_answer": "A", "initials": None, "category": "C", "difficulty": 1})

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    q = await QuestionsService.get_rand_question("standard")
    assert q["question_type"] == "standard"
    assert q["id"] == 1


@pytest.mark.asyncio
async def test_get_rand_question_yes_no(monkeypatch):
    async def fake(*args, **kwargs):
        return DummyRow({"id": 10, "question_text": "Q2", "correct_answer": True, "category": "C2"})

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    q = await QuestionsService.get_rand_question("yes_no")
    assert q["question_type"] == "yes_no"
    assert q["id"] == 10


@pytest.mark.asyncio
async def test_get_rand_question_none(monkeypatch):
    async def fake(*args, **kwargs):
        return None

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    q = await QuestionsService.get_rand_question("standard")
    assert q is None


@pytest.mark.asyncio
async def test_check_question_standard(monkeypatch):
    async def fake(*args, **kwargs):
        return DummyRow({"question_text": "Q?", "correct_answer": "Yes"})

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    ok, ans = await QuestionsService.check_question(1, "yes", "standard")
    assert ok is True
    assert str(ans).lower() == "yes"


@pytest.mark.asyncio
async def test_check_question_yes_no(monkeypatch):
    async def fake(*args, **kwargs):
        return DummyRow({"question_text": "Is it?", "correct_answer": True})

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    ok, ans = await QuestionsService.check_question(2, True, "yes_no")
    assert ok is True
    assert ans is True


@pytest.mark.asyncio
async def test_check_question_not_found(monkeypatch):
    async def fake(*args, **kwargs):
        return None

    monkeypatch.setattr("services.QuestionsService.fetch_one", fake)
    res = await QuestionsService.check_question(99, "x", "standard")
    assert res is None
