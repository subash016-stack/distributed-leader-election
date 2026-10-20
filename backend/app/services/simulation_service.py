import asyncio
import logging
from typing import Optional

from app.config import settings
from app.election.election_manager import ElectionManager
from app.models.events import EventType, SystemEvent
from app.models.node import NodeStatus
from app.network.topology import TopologyManager
from app.nodes.node_manager import NodeProcessManager
from app.services.event_service import event_service

logger = logging.getLogger("SimulationService")


class SimulationService:
    """Orchestrates simulation lifecycle, node failure injection, and election tracking."""

    def __init__(self):
        self.topology_manager = TopologyManager(
            node_count=settings.node_count, base_port=settings.base_node_port, host=settings.host
        )
        self.node_manager = NodeProcessManager(self.topology_manager)
        self.election_manager = ElectionManager()
        self.is_running = False

    async def start(self) -> None:
        """Start the simulation with all nodes."""
        self.is_running = True
        logger.info("Starting simulation with %d nodes", settings.node_count)
        self.node_manager.start_all()

        await event_service.publish(
            SystemEvent(
                event_type=EventType.SIMULATION_STARTED,
                description=f"Simulation started with {settings.node_count} nodes.",
            )
        )

        # Allow node servers to bind
        await asyncio.sleep(1.2)

        # In standard Scenario A: all nodes 1..5 active. Initiate election from Node 1 (or Node 5 asserts leadership).
        # Triggering election from Node 1 will send ELECTION messages up to Node 5, and Node 5 will declare coordinator!
        await self.node_manager.trigger_election(1)

    async def stop(self) -> None:
        """Stop all running node processes."""
        self.is_running = False
        self.node_manager.stop_all()
        await event_service.publish(
            SystemEvent(
                event_type=EventType.SIMULATION_STOPPED,
                description="Simulation stopped. All node processes terminated.",
            )
        )

    async def reset(self) -> None:
        """Reset the entire simulation to a clean state."""
        logger.info("Resetting simulation")
        await self.stop()
        self.election_manager.clear()
        event_service.clear()
        await asyncio.sleep(0.5)
        self.topology_manager.build_default_topology()
        await event_service.publish(
            SystemEvent(event_type=EventType.SIMULATION_RESET, description="Simulation reset to default configuration.")
        )
        await self.start()

    async def fail_node(self, node_id: int) -> bool:
        """Inject failure into a node process."""
        logger.info("Failing node %d", node_id)
        current_coord = self.election_manager.current_coordinator
        success = await self.node_manager.fail_node(node_id)
        if success:
            await event_service.publish(
                SystemEvent(
                    event_type=EventType.NODE_FAILED,
                    sender_id=node_id,
                    description=f"Node {node_id} failed / terminated by administrator.",
                    details={"is_coordinator": (current_coord == node_id)},
                )
            )
        return success

    async def restart_node(self, node_id: int) -> bool:
        """Restart a failed node."""
        logger.info("Restarting node %d", node_id)
        success = await self.node_manager.restart_node(node_id)
        if success:
            await event_service.publish(
                SystemEvent(
                    event_type=EventType.NODE_RECOVERED,
                    sender_id=node_id,
                    description=f"Node {node_id} restarted and re-entered network.",
                )
            )
            # Rejoining node initiates an election after startup to discover or claim coordinator
            await asyncio.sleep(0.8)
            await self.node_manager.trigger_election(node_id)
        return success

    async def trigger_manual_election(self, node_id: Optional[int] = None) -> bool:
        """Trigger an election from a specific node or the lowest active node."""
        if node_id is None:
            # Pick lowest active node
            nodes = await self.node_manager.get_all_nodes_info()
            active_ids = [nid for nid, info in nodes.items() if info.status in (NodeStatus.ALIVE, NodeStatus.ELECTION)]
            if not active_ids:
                return False
            node_id = min(active_ids)

        logger.info("Manual election triggered on Node %d", node_id)
        return await self.node_manager.trigger_election(node_id)


simulation_service = SimulationService()
