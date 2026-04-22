import os
import time
import logging
import threading
from datetime import datetime

import psutil
import psycopg

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

POLL_INTERVAL = int(os.getenv("MONITOR_POLL_INTERVAL", 15))   # seconds
CONTAINER_PREFIX = "cloudx"                                     # filter containers

DB_CONFIG = {
    "host":             os.getenv("POSTGRES_HOST",     "db"),
    "dbname":           os.getenv("POSTGRES_DB",       "cloudx"),
    "user":             os.getenv("POSTGRES_USER",     "cloudx_user"),
    "password":         os.getenv("POSTGRES_PASSWORD", "cloudx_password"),
    "port":             int(os.getenv("POSTGRES_PORT", 5432)),
    "connect_timeout":  10,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_db():
    """Return a fresh psycopg connection (caller is responsible for closing)."""
    return psycopg.connect(**DB_CONFIG)


def _bulk_insert(metrics: list[tuple]):
    """
    Insert a batch of (metric_name, metric_value, unit) tuples.
    Uses a single connection + executemany for efficiency.
    """
    if not metrics:
        return
    sql = """
        INSERT INTO system_metrics (metric_name, metric_value, unit, recorded_at)
        VALUES (%s, %s, %s, %s)
    """
    now = datetime.utcnow()
    rows = [(name, value, unit, now) for name, value, unit in metrics]
    try:
        with _get_db() as conn:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
    except Exception as exc:
        logger.error("monitor: DB insert failed – %s", exc)


# ── Host metrics ───────────────────────────────────────────────────────────────

def _collect_host_metrics() -> list[tuple]:
    """
    Gather CPU, RAM, disk, and network stats from the host via psutil.
    Returns a list of (metric_name, metric_value, unit) tuples.
    """
    rows: list[tuple] = []

    # CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    rows.append(("host.cpu.percent", cpu_percent, "percent"))

    cpu_freq = psutil.cpu_freq()
    if cpu_freq:
        rows.append(("host.cpu.freq_mhz", round(cpu_freq.current, 2), "MHz"))

    rows.append(("host.cpu.count_logical", psutil.cpu_count(logical=True), "cores"))

    # Per-CPU load (average of all cores)
    per_cpu = psutil.cpu_percent(percpu=True)
    if per_cpu:
        rows.append(("host.cpu.avg_per_core", round(sum(per_cpu) / len(per_cpu), 2), "percent"))

    # RAM
    mem = psutil.virtual_memory()
    rows.append(("host.mem.total_mb",     round(mem.total     / 1024**2, 2), "MB"))
    rows.append(("host.mem.used_mb",      round(mem.used      / 1024**2, 2), "MB"))
    rows.append(("host.mem.available_mb", round(mem.available / 1024**2, 2), "MB"))
    rows.append(("host.mem.percent",      mem.percent,                       "percent"))

    # Swap
    swap = psutil.swap_memory()
    rows.append(("host.swap.total_mb", round(swap.total / 1024**2, 2), "MB"))
    rows.append(("host.swap.used_mb",  round(swap.used  / 1024**2, 2), "MB"))
    rows.append(("host.swap.percent",  swap.percent,                   "percent"))

    # Disk (root partition)
    try:
        disk = psutil.disk_usage("/")
        rows.append(("host.disk.total_gb", round(disk.total / 1024**3, 2), "GB"))
        rows.append(("host.disk.used_gb",  round(disk.used  / 1024**3, 2), "GB"))
        rows.append(("host.disk.free_gb",  round(disk.free  / 1024**3, 2), "GB"))
        rows.append(("host.disk.percent",  disk.percent,                   "percent"))
    except Exception as exc:
        logger.debug("monitor: disk stats unavailable – %s", exc)

    # Network I/O (cumulative counters – useful for deltas downstream)
    try:
        net = psutil.net_io_counters()
        rows.append(("host.net.bytes_sent_mb",   round(net.bytes_sent / 1024**2, 4), "MB"))
        rows.append(("host.net.bytes_recv_mb",   round(net.bytes_recv / 1024**2, 4), "MB"))
        rows.append(("host.net.packets_sent",    net.packets_sent,                   "count"))
        rows.append(("host.net.packets_recv",    net.packets_recv,                   "count"))
        rows.append(("host.net.errin",           net.errin,                          "count"))
        rows.append(("host.net.errout",          net.errout,                         "count"))
    except Exception as exc:
        logger.debug("monitor: network stats unavailable – %s", exc)

    return rows


# ── Container metrics ──────────────────────────────────────────────────────────

def _calc_container_cpu(stats: dict) -> float:
    """
    Compute CPU usage % from raw Docker stats dict.
    Docker provides cumulative ns counts; we derive a percentage from the delta.
    """
    try:
        cpu_delta   = (stats["cpu_stats"]["cpu_usage"]["total_usage"]
                       - stats["precpu_stats"]["cpu_usage"]["total_usage"])
        system_delta = (stats["cpu_stats"]["system_cpu_usage"]
                        - stats["precpu_stats"]["system_cpu_usage"])
        num_cpus = len(stats["cpu_stats"]["cpu_usage"].get("percpu_usage") or []) or 1
        if system_delta > 0:
            return round((cpu_delta / system_delta) * num_cpus * 100.0, 4)
    except (KeyError, ZeroDivisionError, TypeError):
        pass
    return 0.0


def _collect_container_metrics() -> list[tuple]:
    """
    Iterate over all running containers whose name contains CONTAINER_PREFIX
    and collect CPU + memory stats via the Docker SDK.
    """
    rows: list[tuple] = []

    try:
        import docker  # lazy import – keeps monitor usable without Docker in dev
        client = docker.from_env()
    except Exception as exc:
        logger.warning("monitor: Docker unavailable – %s", exc)
        return rows

    try:
        containers = client.containers.list()
    except Exception as exc:
        logger.error("monitor: cannot list containers – %s", exc)
        return rows

    for container in containers:
        name = container.name
        if CONTAINER_PREFIX not in name:
            continue

        safe_name = name.replace("/", "").replace("-", "_")

        try:
            # stream=False → single snapshot (blocks ~1 s per container)
            raw_stats = container.stats(stream=False)
        except Exception as exc:
            logger.debug("monitor: stats failed for %s – %s", name, exc)
            continue

        # CPU
        cpu_pct = _calc_container_cpu(raw_stats)
        rows.append((f"container.{safe_name}.cpu.percent", cpu_pct, "percent"))

        # Memory
        try:
            mem_stats  = raw_stats["memory_stats"]
            mem_usage  = mem_stats.get("usage", 0)
            mem_limit  = mem_stats.get("limit", 1) or 1
            mem_cache  = mem_stats.get("stats", {}).get("cache", 0)
            mem_rss    = mem_usage - mem_cache           # RSS = usage − page cache
            mem_pct    = round((mem_rss / mem_limit) * 100, 4)

            rows.append((f"container.{safe_name}.mem.usage_mb",  round(mem_usage / 1024**2, 2), "MB"))
            rows.append((f"container.{safe_name}.mem.rss_mb",    round(mem_rss   / 1024**2, 2), "MB"))
            rows.append((f"container.{safe_name}.mem.limit_mb",  round(mem_limit / 1024**2, 2), "MB"))
            rows.append((f"container.{safe_name}.mem.percent",   mem_pct,                       "percent"))
        except (KeyError, ZeroDivisionError, TypeError) as exc:
            logger.debug("monitor: mem stats failed for %s – %s", name, exc)

        # Block I/O
        try:
            blkio = raw_stats.get("blkio_stats", {}).get("io_service_bytes_recursive") or []
            read_bytes  = sum(x["value"] for x in blkio if x.get("op") == "Read")
            write_bytes = sum(x["value"] for x in blkio if x.get("op") == "Write")
            rows.append((f"container.{safe_name}.blkio.read_mb",  round(read_bytes  / 1024**2, 4), "MB"))
            rows.append((f"container.{safe_name}.blkio.write_mb", round(write_bytes / 1024**2, 4), "MB"))
        except Exception:
            pass

        # Network I/O (summed across all interfaces)
        try:
            networks = raw_stats.get("networks", {})
            rx = sum(v.get("rx_bytes", 0) for v in networks.values())
            tx = sum(v.get("tx_bytes", 0) for v in networks.values())
            rows.append((f"container.{safe_name}.net.rx_mb", round(rx / 1024**2, 4), "MB"))
            rows.append((f"container.{safe_name}.net.tx_mb", round(tx / 1024**2, 4), "MB"))
        except Exception:
            pass

    return rows


# ── SocketIO broadcasting ──────────────────────────────────────────────────────

def _broadcast(socketio, metrics: list[tuple]):
    """
    Emit a compact summary of the latest snapshot to all connected SocketIO clients.
    Only emits a lightweight payload (host CPU/RAM + container summary) to avoid noise.
    """
    try:
        summary: dict = {"timestamp": datetime.utcnow().isoformat(), "host": {}, "containers": {}}

        for name, value, unit in metrics:
            if name == "host.cpu.percent":
                summary["host"]["cpu_percent"] = value
            elif name == "host.mem.percent":
                summary["host"]["mem_percent"] = value
            elif name == "host.mem.used_mb":
                summary["host"]["mem_used_mb"] = value
            elif ".cpu.percent" in name and name.startswith("container."):
                cname = name.split(".")[1]
                summary["containers"].setdefault(cname, {})["cpu_percent"] = value
            elif ".mem.percent" in name and name.startswith("container."):
                cname = name.split(".")[1]
                summary["containers"].setdefault(cname, {})["mem_percent"] = value

        socketio.emit("metrics_update", summary)
    except Exception as exc:
        logger.debug("monitor: broadcast failed – %s", exc)


# ── SystemMonitor thread ───────────────────────────────────────────────────────

class SystemMonitor(threading.Thread):
    """
    Background daemon thread that polls host + container metrics on a fixed
    interval, persists them to PostgreSQL, and optionally broadcasts a summary
    over SocketIO.

    Usage (in app.py):
        from monitor import SystemMonitor
        monitor = SystemMonitor(socketio)
        monitor.daemon = True
        monitor.start()
    """

    def __init__(self, socketio=None, poll_interval: int = POLL_INTERVAL):
        super().__init__(name="SystemMonitor", daemon=True)
        self._socketio      = socketio
        self._poll_interval = poll_interval
        self._stop_event    = threading.Event()

    # ── Public API ─────────────────────────────────────────────────────────────

    def stop(self):
        """Signal the monitor loop to exit cleanly."""
        self._stop_event.set()

    def run(self):
        logger.info("SystemMonitor started (interval=%ds)", self._poll_interval)
        while not self._stop_event.is_set():
            try:
                self._tick()
            except Exception as exc:
                # Never let an unhandled exception kill the monitor thread.
                logger.error("SystemMonitor tick error: %s", exc, exc_info=True)
            self._stop_event.wait(timeout=self._poll_interval)
        logger.info("SystemMonitor stopped")

    # ── Internal ───────────────────────────────────────────────────────────────

    def _tick(self):
        t0 = time.monotonic()

        host_metrics      = _collect_host_metrics()
        container_metrics = _collect_container_metrics()
        all_metrics       = host_metrics + container_metrics

        _bulk_insert(all_metrics)

        if self._socketio:
            _broadcast(self._socketio, all_metrics)

        elapsed = time.monotonic() - t0
        logger.debug(
            "SystemMonitor tick: %d metrics collected in %.2fs",
            len(all_metrics), elapsed
        )