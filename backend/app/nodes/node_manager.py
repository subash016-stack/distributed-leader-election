import asyncio
import logging
import os
import subprocess
import sys
from typing import Dict

from app.config import settings
from app.models.messages import MessageType, NetworkMessage
from app.models.node import NodeInfo, NodeStatus
from app.network.tcp_client import send_message_async
from app.network.topology import TopologyManager

logger = logging.getLogger("NodeManager")


class NodeProcessManager:
    """Orchestrates independent OS processes for each distributed node."""

    def __init__(self, topology_manager: TopologyManager):
        self.topology_manager = topology_manager
        self.processes: Dict[int, subprocess.Popen] = {}
        self.node_info_cache: Dict[int, NodeInfo] = {}

    def is_node_process_alive(self, node_id: int) -> bool:
        proc = self.processes.get(node_id)
        if proc is None:
            return False
        return proc.poll() is None

    def start_node(self, node_id: int) -> bool:
        """Spawn an independent OS process for the given node_id."""
        if self.is_node_process_alive(node_id):
            logger.warning("Node %s process is already running", node_id)
            return True

        cfg = self.topology_manager.node_configs.get(node_id)
        if not cfg:
            logger.error("No topology configuration for node %s", node_id)
            return False

        peers = self.topology_manager.get_peer_ports(node_id)
        peers_arg = ",".join(f"{pid}:{port}" for pid, port in peers.items())

        # Construct command to run independent process
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        cmd = [
            sys.executable,
            "-m",
            "app.nodes.node_process",
            "--id",
            str(node_id),
            "--port",
            str(cfg["port"]),
            "--host",
            cfg["host"],
            "--peers",
            peers_arg,
            "--api-url",
            f"http://127.0.0.1:{settings.port}",
            "--heartbeat-interval",
            str(settings.heartbeat_interval),
            "--heartbeat-timeout",
            str(settings.heartbeat_timeout),
            "--election-timeout",
            str(settings.election_timeout),
        ]

        logger.info("Spawning OS process for Node %s: %s", node_id, " ".join(cmd))
        try:
            proc = subprocess.Popen(
                cmd,
                cwd=backend_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self.processes[node_id] = proc
            return True
        except Exception as exc:
            logger.error("Failed to start node process %s: %s", node_id, exc)
            return False

    async def fail_node(self, node_id: int) -> bool:
        """Simulate node failure by sending ADMIN_STOP and terminating the process."""
        cfg = self.topology_manager.node_configs.get(node_id)
        if not cfg:
            return False

        # First attempt graceful stop over TCP
        admin_stop = NetworkMessage(
            message_type=MessageType.ADMIN_STOP,
            sender_id=0,
            receiver_id=node_id,
        )
        await send_message_async(cfg["host"], cfg["port"], admin_stop, timeout=0.8)

        # Ensure OS process is terminated
        proc = self.processes.get(node_id)
        if proc:
            try:
                proc.terminate()
                proc.wait(timeout=1.0)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
            self.processes.pop(node_id, None)

        logger.info("Node %s process terminated successfully", node_id)
        return True

    async def restart_node(self, node_id: int) -> bool:
        """Restart a failed node process."""
        await self.fail_node(node_id)
        await asyncio.sleep(0.5)
        success = self.start_node(node_id)
        if success:
            logger.info("Node %s restarted successfully", node_id)
        return success

    async def trigger_election(self, node_id: int) -> bool:
        """Trigger an election initiated by node_id."""
        cfg = self.topology_manager.node_configs.get(node_id)
        if not cfg or not self.is_node_process_alive(node_id):
            return False

        msg = NetworkMessage(
            message_type=MessageType.START_ELECTION,
            sender_id=0,
            receiver_id=node_id,
            payload={"reason": "Manual UI trigger"},
        )
        success, _ = await send_message_async(cfg["host"], cfg["port"], msg, timeout=1.5)
        return success

    async def query_node_status(self, node_id: int) -> NodeInfo:
        """Query real-time status of a node via TCP socket."""
        cfg = self.topology_manager.node_configs[node_id]
        peers = list(self.topology_manager.graph.neighbors(node_id))
        is_alive = self.is_node_process_alive(node_id)

        if not is_alive:
            return NodeInfo(
                id=node_id,
                host=cfg["host"],
                port=cfg["port"],
                status=NodeStatus.FAILED,
                is_coordinator=False,
                current_coordinator=None,
                peers=peers,
            )

        # Query process over TCP socket
        ping_msg = NetworkMessage(
            message_type=MessageType.ADMIN_STATUS,
            sender_id=0,
            receiver_id=node_id,
        )
        success, resp = await send_message_async(cfg["host"], cfg["port"], ping_msg, timeout=0.8, wait_response=True)
        if success and resp and resp.payload:
            payload = resp.payload
            status_val = payload.get("status", NodeStatus.ALIVE.value)
            return NodeInfo(
                id=node_id,
                host=cfg["host"],
                port=cfg["port"],
                status=NodeStatus(status_val) if status_val in NodeStatus._value2member_map_ else NodeStatus.ALIVE,
                is_coordinator=payload.get("is_coordinator", False),
                current_coordinator=payload.get("coordinator_id"),
                election_generation=resp.generation,
                pid=self.processes[node_id].pid if node_id in self.processes else None,
                started_at=payload.get("started_at"),
                last_heartbeat=payload.get("last_heartbeat"),
                peers=peers,
            )

        return NodeInfo(
            id=node_id,
            host=cfg["host"],
            port=cfg["port"],
            status=NodeStatus.ALIVE,
            is_coordinator=False,
            current_coordinator=None,
            peers=peers,
        )

    async def get_all_nodes_info(self) -> Dict[int, NodeInfo]:
        tasks = [self.query_node_status(nid) for nid in self.topology_manager.node_configs.keys()]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        infos: Dict[int, NodeInfo] = {}
        for nid, res in zip(self.topology_manager.node_configs.keys(), results):
            if isinstance(res, NodeInfo):
                infos[nid] = res
        return infos

    def start_all(self) -> None:
        for nid in self.topology_manager.node_configs.keys():
            self.start_node(nid)

    def stop_all(self) -> None:
        for nid, proc in list(self.processes.items()):
            try:
                proc.terminate()
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        self.processes.clear()
