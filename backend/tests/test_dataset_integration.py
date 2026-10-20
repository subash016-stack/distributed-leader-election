from dataset.dataset_manager import dataset_manager


def test_gnutella_dataset_metadata():
    stats = dataset_manager.load_and_parse()
    assert stats["dataset_name"] == "p2p-Gnutella08"
    assert stats["published_nodes"] == 6301
    assert stats["published_edges"] == 20777
    assert stats["parsed_directed_nodes"] == 6301
    assert stats["parsed_directed_edges"] == 20777
    assert stats["largest_connected_component_nodes"] >= 6290
    assert stats["average_degree"] > 0


def test_connected_subgraph_extraction():
    for sz in [10, 25, 50]:
        sg, meta = dataset_manager.get_connected_subgraph(size=sz, seed=42)
        assert meta["size"] == sz
        assert meta["is_connected"] is True
        assert meta["diameter"] >= 1
        assert len(meta["node_list"]) == sz
        assert len(meta["edges"]) >= sz - 1


def test_reproducible_subgraph_sampling():
    _, meta1 = dataset_manager.get_connected_subgraph(size=15, seed=99)
    _, meta2 = dataset_manager.get_connected_subgraph(size=15, seed=99)
    assert meta1["node_list"] == meta2["node_list"]
    assert meta1["root_node"] == meta2["root_node"]
