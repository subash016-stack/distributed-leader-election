import logging
from typing import Any, Dict, List

from app.models.events import CoordinatorRecord
from app.models.node import NodeInfo, TopologyData
from app.services.simulation_service import simulation_service

logger = logging.getLogger("StateService")


class StateService:
    """Aggregates state across nodes, topology, and election history."""

    def __init__(self):
        self.sim = simulation_service

    async def get_topology(self) -> TopologyData:
        node_infos = await self.sim.node_manager.get_all_nodes_info()
        data = self.sim.topology_manager.get_topology_data(node_infos)

        # Sync current coordinator with election manager
        if (
            data.current_coordinator is not None
            and data.current_coordinator != self.sim.election_manager.current_coordinator
        ):
            prev = self.sim.election_manager.current_coordinator
            self.sim.election_manager.record_transition(
                new_coordinator=data.current_coordinator,
                previous_coordinator=prev,
                trigger_node=None,
                reason="Discovered from runtime state",
                election_id=None,
                generation=0,
            )

        return data

    async def get_nodes(self) -> List[NodeInfo]:
        infos = await self.sim.node_manager.get_all_nodes_info()
        return [infos[nid] for nid in sorted(infos.keys())]

    def get_election_history(self) -> List[CoordinatorRecord]:
        return self.sim.election_manager.history

    async def get_election_status(self) -> Dict[str, Any]:
        topo = await self.get_topology()
        return {
            "current_coordinator": topo.current_coordinator,
            "is_running": self.sim.is_running,
            "total_nodes": topo.total_nodes,
            "active_nodes": topo.active_nodes,
            "failed_nodes": topo.failed_nodes,
            "election_in_progress": any(n.status.value == "ELECTION" for n in topo.nodes),
            "history_count": len(self.sim.election_manager.history),
        }


state_service = StateService()
