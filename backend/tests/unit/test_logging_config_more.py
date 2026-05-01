import importlib
import logging
import json

import os

import logging_config as lc


def test_json_formatter_and_request_id():
    # set request id and format a LogRecord with extra fields
    token = lc.set_request_id("req-1")
    record = logging.LogRecord(name="x", level=logging.INFO, pathname=__file__, lineno=1, msg="hello", args=(), exc_info=None)
    record.custom = "value"
    # simulate RequestIdFilter behavior
    record.request_id = lc.request_id_var.get()
    out = lc.JsonFormatter().format(record)
    parsed = json.loads(out)
    assert parsed["message"] == "hello"
    assert parsed["request_id"] == "req-1"
    lc.reset_request_id(token)


def test_configure_logging_changes_level():
    lc.configure_logging("DEBUG")
    assert logging.getLogger().level == logging.DEBUG


def test_configure_application_insights_no_env(monkeypatch):
    # ensure no exception when env not set
    monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)
    # monkeypatch configure_azure_monitor if present
    monkeypatch.setattr(lc, "configure_azure_monitor", None)
    # should be safe to call
    lc.configure_application_insights(app=None)

def test_configure_application_insights_with_mock(monkeypatch):
    # simulate configure_azure_monitor present
    called = {}

    def fake_configure(connection_string, disable_offline_storage=True):
        called['configured'] = True

    monkeypatch.setenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "connstr")
    monkeypatch.setattr(lc, "configure_azure_monitor", fake_configure)

    class FakeInstr:
        def instrument_app(self, app, client_request_hook=None, client_response_hook=None):
            called['app_instrumented'] = True

    monkeypatch.setattr(lc, "FastAPIInstrumentor", FakeInstr)

    class FakeReqInstr:
        def instrument(self):
            called['requests'] = True

    monkeypatch.setattr(lc, "RequestsInstrumentor", FakeReqInstr)

    lc._azure_monitor_configured = False
    lc.configure_application_insights(app=object())
    assert called.get('configured', False)
