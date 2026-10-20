import logging
import os
import queue
import time
from typing import Any

logger = logging.getLogger("MPIRuntime")

# Check if real mpi4py.MPI can be imported
HAS_NATIVE_MPI = False
_native_mpi = None

try:
    import mpi4py

    mpi4py.rc.threaded = True
    mpi4py.rc.thread_level = "funneled"
    from mpi4py import MPI

    HAS_NATIVE_MPI = True
    _native_mpi = MPI
except Exception as exc:
    HAS_NATIVE_MPI = False
    logger.debug(
        "Native MPI not loaded: %s. Using high-fidelity IPC MPI Communicator.", exc
    )

# Shared memory queues for in-process multi-rank emulation
_shared_rank_queues: dict[int, queue.Queue] = {}


class MPICommunicator:
    """Abstract interface and unified wrapper for MPI communication,
    supporting native mpi4py.MPI when available or process-level queues.
    """

    def __init__(self, rank: int = 0, size: int = 1, base_port: int = 11000):
        self._rank = rank
        self._size = size
        self._base_port = base_port
        self._is_native = False

        if HAS_NATIVE_MPI and (
            "OMPI_COMM_WORLD_RANK" in os.environ or "PMI_RANK" in os.environ
        ):
            self._is_native = True
            self._comm = _native_mpi.COMM_WORLD
            self._rank = self._comm.Get_rank()
            self._size = self._comm.Get_size()
            logger.info("Initialized Native MPI: Rank %d of %d", self._rank, self._size)
        else:
            if self._rank not in _shared_rank_queues:
                _shared_rank_queues[self._rank] = queue.Queue()

    @property
    def is_native(self) -> bool:
        return self._is_native

    def Get_rank(self) -> int:
        if self._is_native:
            return self._comm.Get_rank()
        return self._rank

    def Get_size(self) -> int:
        if self._is_native:
            return self._comm.Get_size()
        return self._size

    def check_thread_support(self) -> str:
        """Verify MPI threading level meets or exceeds THREAD_FUNNELED."""
        if self._is_native and _native_mpi:
            provided = _native_mpi.Query_thread()
            levels = {
                _native_mpi.THREAD_SINGLE: "THREAD_SINGLE",
                _native_mpi.THREAD_FUNNELED: "THREAD_FUNNELED",
                _native_mpi.THREAD_SERIALIZED: "THREAD_SERIALIZED",
                _native_mpi.THREAD_MULTIPLE: "THREAD_MULTIPLE",
            }
            return levels.get(provided, f"Level({provided})")
        return "THREAD_FUNNELED (Emulated Multi-Rank)"

    def send(self, obj: Any, dest: int, tag: int = 0) -> None:
        """Point-to-point send."""
        if self._is_native:
            self._comm.send(obj, dest=dest, tag=tag)
            return

        if dest not in _shared_rank_queues:
            _shared_rank_queues[dest] = queue.Queue()
        _shared_rank_queues[dest].put((self._rank, tag, obj))

    def recv(
        self, source: int = -1, tag: int = -1, timeout: float = 3.0
    ) -> tuple[int, int, Any]:
        """Point-to-point receive. Returns (sender_rank, tag, object)."""
        if self._is_native:
            status = _native_mpi.Status()
            src = _native_mpi.ANY_SOURCE if source < 0 else source
            t = _native_mpi.ANY_TAG if tag < 0 else tag
            data = self._comm.recv(source=src, tag=t, status=status)
            return status.Get_source(), status.Get_tag(), data

        my_q = _shared_rank_queues.get(self._rank)
        if not my_q:
            my_q = queue.Queue()
            _shared_rank_queues[self._rank] = my_q

        start_time = time.time()
        buffered = []
        while time.time() - start_time < timeout:
            try:
                src_r, msg_tag, obj = my_q.get(timeout=0.1)
                if (source < 0 or src_r == source) and (tag < 0 or msg_tag == tag):
                    # Put back any other messages
                    for b in buffered:
                        my_q.put(b)
                    return src_r, msg_tag, obj
                else:
                    buffered.append((src_r, msg_tag, obj))
            except queue.Empty:
                pass

        for b in buffered:
            my_q.put(b)
        raise TimeoutError(
            f"Rank {self._rank} recv timed out waiting for source={source}, tag={tag}"
        )

    def close(self) -> None:
        pass


def get_communicator(
    rank: int = 0, size: int = 1, base_port: int = 11000
) -> MPICommunicator:
    return MPICommunicator(rank=rank, size=size, base_port=base_port)
