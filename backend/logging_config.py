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
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
except ImportError:  # pragma: no cover - optional dependency for OpenTelemetry instrumentation
    FastAPIInstrumentor = None
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
        try:
            FastAPIInstrumentor().instrument_app(
                app,
                client_request_hook=_client_request_hook,
                client_response_hook=_client_response_hook,
            )
        except Exception as error:
            logger.warning("Failed to instrument FastAPI: %s", error)

    # Auto-instrument requests library
    if RequestsInstrumentor is not None:
        try:
            RequestsInstrumentor().instrument()
        except Exception as error:
            logger.warning("Failed to instrument requests: %s", error)

    _azure_monitor_configured = True
    logger.info("application_insights_configured", extra={"distributed_tracing": True})


def _client_request_hook(span, environ=None, *args):
    """Hook to customize request spans. Accepts flexible signatures from
    different instrumentors (ASGI/WSGI). Exclude health checks from heavy
    instrumentation.

    The instrumentor may call this hook with (span, environ), (span, scope),
    or (span, request, response) etc. Be defensive and try to locate a
    mapping-like object with PATH_INFO or 'path' keys.
    """
    if not environ:
        # Try to find a mapping-like arg in *args
        for candidate in args:
            if isinstance(candidate, dict):
                environ = candidate
                break

    if not environ or not isinstance(environ, dict):
        return

    # Common keys across WSGI/ASGI
    path = environ.get("PATH_INFO") or environ.get("path") or ""
    if isinstance(path, str) and path.startswith("/api/health"):
        try:
            span.set_attribute("http.url.path.excluded", True)
        except Exception:
            # Never raise from hook
            return


def _client_response_hook(span, environ=None, response_status=None, *args):
    """Hook to customize response spans.

    Be defensive: some instrumentors/pass-throughs provide a dict, tuple
    or string. Avoid raising exceptions here which would break request
    handling inside the ASGI middleware.
    """
    # Try to be flexible with different instrumentor signatures. If
    # `response_status` wasn't provided, try to find it in args or in
    # `environ`-like objects.
    if response_status is None:
        for candidate in args:
            if candidate is None:
                continue
            if isinstance(candidate, (dict, list, tuple, str, int)):
                response_status = candidate
                break

    status_code = None
    try:
        if isinstance(response_status, dict):
            # common keys used by frameworks
            for key in ("status", "status_code", "statusCode", "status-code"):
                if key in response_status:
                    try:
                        status_code = int(response_status[key])
                    except Exception:
                        status_code = None
                    break
        elif isinstance(response_status, (list, tuple)) and len(response_status) > 0:
            # sometimes a tuple like (status, headers) may be passed
            try:
                status_code = int(response_status[0])
            except Exception:
                status_code = None
        elif isinstance(response_status, str):
            try:
                status_code = int(response_status.split()[0])
            except Exception:
                status_code = None
        else:
            try:
                status_code = int(response_status)
            except Exception:
                status_code = None
    except Exception:
        # Never raise from hook
        return

    if status_code is None:
        return

    span.set_attribute("http.status_code", status_code)
    if status_code >= 500:
        span.set_attribute("error", True)
