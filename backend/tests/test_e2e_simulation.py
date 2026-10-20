import asyncio

import pytest

from app.models.node import NodeStatus
from app.services.simulation_service import simulation_service
from app.services.state_service import state_service


@pytest.mark.asyncio
async def test_full_e2e_distributed_demonstration():
    """End-to-end multi-process simulation test verifying real TCP communication,
    coordinator election, process termination, and recovery.
    """
    sim = simulation_service
    try:
        # Step 1: Start simulation and launch 5 OS processes
        await sim.start()
        await asyncio.sleep(2.0)

        # Check nodes are alive and running
        nodes = await sim.node_manager.get_all_nodes_info()
        assert len(nodes) == 5
        active_nodes = [nid for nid, info in nodes.items() if info.status in (NodeStatus.ALIVE, NodeStatus.ELECTION)]
        assert len(active_nodes) >= 4

        # Allow initial election to settle on Node 5
        for _ in range(10):
            topo = await state_service.get_topology()
            if topo.current_coordinator == 5:
                break
            await asyncio.sleep(0.5)

        topo = await state_service.get_topology()
        assert topo.current_coordinator == 5, f"Expected Node 5 as coordinator, got {topo.current_coordinator}"

        # Step 2: Fail Node 5 (simulate coordinator crash)
        success = await sim.fail_node(5)
        assert success is True
        assert not sim.node_manager.is_node_process_alive(5)

        # Step 3: Trigger election from Node 1
        await sim.trigger_manual_election(1)

        # Wait for Bully election to converge on Node 4
        for _ in range(12):
            await asyncio.sleep(0.5)
            topo = await state_service.get_topology()
            if topo.current_coordinator == 4:
                break

        topo = await state_service.get_topology()
        assert topo.current_coordinator == 4, (
            f"Expected Node 4 to win after Node 5 failed, got {topo.current_coordinator}"
        )

        # Step 4: Fail Node 4 -> Node 3 should win
        await sim.fail_node(4)
        assert not sim.node_manager.is_node_process_alive(4)
        await sim.trigger_manual_election(1)

        for _ in range(12):
            await asyncio.sleep(0.5)
            topo = await state_service.get_topology()
            if topo.current_coordinator == 3:
                break

        topo = await state_service.get_topology()
        assert topo.current_coordinator == 3, (
            f"Expected Node 3 to win after Node 4 failed, got {topo.current_coordinator}"
        )

        # Step 5: Restart Node 5 -> Node 5 should re-assert leadership
        await sim.restart_node(5)
        for _ in range(12):
            await asyncio.sleep(0.5)
            topo = await state_service.get_topology()
            if topo.current_coordinator == 5:
                break

        topo = await state_service.get_topology()
        assert topo.current_coordinator == 5, (
            f"Expected Node 5 to re-claim coordinator upon restart, got {topo.current_coordinator}"
        )

    finally:
        # Step 6: Clean shutdown of all child processes
        await sim.stop()
