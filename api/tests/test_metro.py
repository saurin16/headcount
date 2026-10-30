from headcount.metro import METROS, geohash, score_metros


def test_geohash_known_cells():
    # Cells observed in the live Qloo heatmap for these cities.
    assert geohash(45.52, -122.68) == "c20f"   # Portland
    assert geohash(36.15, -95.99) == "9y7t"    # Tulsa
    assert geohash(36.16, -86.78) == "dn6m"    # Nashville


def _cell(lat, lon, aff, pop):
    return {"location": {"geohash": geohash(lat, lon)}, "query": {"affinity_rank": aff, "popularity": pop}}


def test_percentile_ranks_metros_against_each_other():
    heat = [_cell(*METROS["Portland, OR"], 0.99, 0.99), _cell(*METROS["Tulsa, OK"], 0.90, 0.95),
            _cell(*METROS["Austin, TX"], 0.95, 0.96)]
    s = score_metros(heat)
    assert s["Portland, OR"].rank == 1 and s["Portland, OR"].percentile == 100.0
    assert s["Tulsa, OK"].rank == 3 and s["Tulsa, OK"].percentile == 0.0
    assert s["Tulsa, OK"].hype_gap == 0.05
    assert s["Boise, ID"].percentile is None  # no cell → no fake number
