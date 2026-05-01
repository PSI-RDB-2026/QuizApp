import json
import logging
import os
import sys
from contextvars import ContextVar
from datetime import datetime, timezone

try:
    from azure.monitor.opentelemetry import configure_azure_monitor
except ImportError:  # pragma: no cover - optional dependency for Azure deployments
    configure_azure_monitor = None

try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
except ImportError:  # pragma: no cover - optional dependency for OpenTelemetry instrumentation
    FastAPIInstrumentor = None
    SQLAlchemyInstrumentor = None
    RequestsInstrumentor = None


request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
_azure_monitor_configured = False
logger = logging.getLogger(__name__)


_STANDARD_RECORD_FIELDS = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys())


def set_request_id(request_id: str):
    return request_id_var.set(request_id)


def reset_request_id(token) -> None:
    request_id_var.reset(token)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        for key, value in record.__dict__.items():
            if key in _STANDARD_RECORD_FIELDS or key.startswith("_"):
                continue
            if key not in payload:
                payload[key] = value

        return json.dumps(payload, ensure_ascii=True, default=str)


def configure_logging(log_level: str | None = None) -> None:
    resolved_level = (log_level or os.getenv("LOG_LEVEL", "INFO")).upper()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(resolved_level)
    root_logger.addHandler(handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.propagate = True
        logger.setLevel(resolved_level)


def configure_application_insights(app=None) -> None:
    """Configure Azure Application Insights with OpenTelemetry auto-instrumentation.
    
    Args:
        app: FastAPI application instance for FastAPI instrumentation (optional).
             If provided, will enable distributed tracing for FastAPI.
    """
    global _azure_monitor_configured

    if _azure_monitor_configured or configure_azure_monitor is None:
        return

    connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
    if not connection_string:
        return

    # Configure Azure Monitor with OpenTelemetry
    configure_azure_monitor(
        connection_string=connection_string,
        disable_offline_storage=True,
    )
    
    # Auto-instrument FastAPI for distributed tracing
    if FastAPIInstrumentor is not None and app is not None:
        FastAPIInstrumentor.instrument_app(
            app,
            client_request_hook=_client_request_hook,
            client_response_hook=_client_response_hook,
        )
    
    # Auto-instrument SQLAlchemy for database tracing
    if SQLAlchemyInstrumentor is not None:
        SQLAlchemyInstrumentor.instrument()
    
    # Auto-instrument requests library
    if RequestsInstrumentor is not None:
        RequestsInstrumentor.instrument()
    
    _azure_monitor_configured = True
    logger.info("application_insights_configured", extra={"distributed_tracing": True})


def _client_request_hook(span, environ):
    """Hook to customize request spans. Exclude health checks from heavy instrumentation."""
    path = environ.get("PATH_INFO", "")
    if path.startswith("/api/health"):
        span.set_attribute("http.url.path.excluded", True)


def _client_response_hook(span, environ, response_status):
    """Hook to customize response spans."""
    response_status_code = int(response_status.split()[0]) if isinstance(response_status, str) else response_status
    if response_status_code >= 500:
        span.set_attribute("error", True)