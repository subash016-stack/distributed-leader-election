import logging

logger = logging.getLogger("FailureSimulator")


class FailureSimulator:
    """Manages controlled node failure simulation within MPI ranks.
    Disables participation, candidate forwarding, and heartbeat replies
    without aborting the underlying MPI communicator job.
    """

    def __init__(self):
        self._failed_nodes: set[int] = set()

    def fail_node(self, node_id: int) -> None:
        self._failed_nodes.add(node_id)
        logger.info(
            "Node %d set to FAILED status (disabled from election participation)",
            node_id,
        )

    def recover_node(self, node_id: int) -> None:
        self._failed_nodes.discard(node_id)
        logger.info(
            "Node %d RECOVERED status (restored to election participation)", node_id
        )

    def is_failed(self, node_id: int) -> bool:
        return node_id in self._failed_nodes

    def clear(self) -> None:
        self._failed_nodes.clear()

    @property
    def failed_nodes(self) -> set[int]:
        return set(self._failed_nodes)
