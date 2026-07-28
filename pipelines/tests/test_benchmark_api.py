import pytest

from pipelines.benchmark_api import percentile


def test_percentile_uses_nearest_rank() -> None:
    values = [5.0, 1.0, 4.0, 2.0, 3.0]

    assert percentile(values, 0.50) == 3.0
    assert percentile(values, 0.95) == 5.0


def test_percentile_rejects_an_empty_sample() -> None:
    with pytest.raises(ValueError):
        percentile([], 0.95)
