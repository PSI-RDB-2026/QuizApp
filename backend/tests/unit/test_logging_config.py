import importlib


def test_logging_config_importable():
    # ensure importing logging_config does not raise and has expected functions
    lc = importlib.import_module("logging_config")
    assert hasattr(lc, "configure_logging") or hasattr(lc, "get_logger")
