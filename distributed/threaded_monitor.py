import logging
import queue
import threading
import time
from collections.abc import Callable
from typing import Any

logger = logging.getLogger("ThreadedMonitor")


class ThreadedHeartbeatMonitor:
    """Manages multithreaded heartbeat monitoring and event collection
    while strictly keeping MPI communication within the main thread (MPI.THREAD_FUNNELED).
    """

    def __init__(
        self,
        node_id: int,
        rank: int,
        heartbeat_interval: float = 1.0,
        heartbeat_timeout: float = 3.0,
        event_callback: Callable[[dict[str, Any]], None] | None = None,
    ):
        self.node_id = node_id
        self.rank = rank
        self.heartbeat_interval = heartbeat_interval
        self.heartbeat_timeout = heartbeat_timeout
        self.event_callback = event_callback

        self._lock = threading.Lock()
        self._running = False
        self._coordinator_id: int | None = None
        self._is_coordinator = False
        self._is_failed = False
        self._last_ack_time: float = time.time()
        self._missed_count = 0

        # Thread-safe event queue
        self.event_queue: queue.Queue = queue.Queue()

        # Outgoing requests for main thread to dispatch via MPI
        self.mpi_outbox: queue.Queue = queue.Queue()

        self._heartbeat_thread: threading.Thread | None = None
        self._watchdog_thread: threading.Thread | None = None

    def set_coordinator(self, coord_id: int, is_self: bool = False) -> None:
        with self._lock:
            self._coordinator_id = coord_id
            self._is_coordinator = is_self
            self._last_ack_time = time.time()
            self._missed_count = 0
        self.emit_event(
            "COORDINATOR_UPDATED",
            f"Node {self.node_id} recognizes Coordinator {coord_id}",
        )

    def set_failed(self, failed: bool = True) -> None:
        with self._lock:
            self._is_failed = failed
        status = "FAILED" if failed else "RECOVERED"
        self.emit_event(
            f"NODE_{status}", f"Node {self.node_id} (Rank {self.rank}) marked {status}"
        )

    def record_heartbeat_ack(self, coord_id: int) -> None:
        with self._lock:
            if self._coordinator_id == coord_id:
                self._last_ack_time = time.time()
                self._missed_count = 0
        self.emit_event(
            "HEARTBEAT_ACK_RECEIVED",
            f"Node {self.node_id} received heartbeat ACK from Coordinator {coord_id}",
        )

    def emit_event(
        self, event_type: str, description: str, details: dict[str, Any] | None = None
    ) -> None:
        event = {
            "timestamp": time.time(),
            "event_type": event_type,
            "node_id": self.node_id,
            "rank": self.rank,
            "description": description,
            "details": details or {},
        }
        self.event_queue.put(event)
        if self.event_callback:
            try:
                self.event_callback(event)
            except Exception:
                pass

    def start(self) -> None:
        with self._lock:
            if self._running:
                return
            self._running = True

        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            name=f"Heartbeat-Node{self.node_id}",
            daemon=True,
        )
        self._watchdog_thread = threading.Thread(
            target=self._watchdog_loop, name=f"Watchdog-Node{self.node_id}", daemon=True
        )
        self._heartbeat_thread.start()
        self._watchdog_thread.start()
        logger.info(
            "Started threaded monitor for Node %d (Rank %d)", self.node_id, self.rank
        )

    def stop(self) -> None:
        with self._lock:
            self._running = False
        logger.debug("Stopped threaded monitor for Node %d", self.node_id)

    def _heartbeat_loop(self) -> None:
        """Periodic thread queuing heartbeats to coordinator."""
        while True:
            time.sleep(self.heartbeat_interval)
            with self._lock:
                if not self._running:
                    break
                if (
                    self._is_failed
                    or self._is_coordinator
                    or self._coordinator_id is None
                ):
                    continue
                coord = self._coordinator_id

            # Place request into mpi_outbox so MAIN thread executes MPI send (THREAD_FUNNELED rule)
            self.mpi_outbox.put(
                {
                    "type": "SEND_HEARTBEAT",
                    "target_node": coord,
                }
            )

    def _watchdog_loop(self) -> None:
        """Watchdog thread detecting coordinator heartbeat timeouts."""
        check_interval = max(0.05, min(0.2, self.heartbeat_timeout / 3))
        while True:
            time.sleep(check_interval)
            with self._lock:
                if not self._running:
                    break
                if (
                    self._is_failed
                    or self._is_coordinator
                    or self._coordinator_id is None
                ):
                    continue

                elapsed = time.time() - self._last_ack_time
                coord = self._coordinator_id

            if elapsed > self.heartbeat_timeout:
                with self._lock:
                    self._missed_count += 1
                    self._last_ack_time = time.time()  # Reset to avoid alert storm

                logger.warning(
                    "Node %d: Heartbeat timeout for Coordinator %s (elapsed %.2fs)",
                    self.node_id,
                    coord,
                    elapsed,
                )
                self.emit_event(
                    "HEARTBEAT_TIMEOUT",
                    f"Coordinator {coord} failed to respond within {self.heartbeat_timeout}s",
                    {"failed_coordinator": coord, "elapsed": elapsed},
                )
                # Signal main thread to initiate election
                self.mpi_outbox.put(
                    {
                        "type": "TRIGGER_ELECTION",
                        "reason": f"Heartbeat timeout for coordinator {coord}",
                    }
                )
