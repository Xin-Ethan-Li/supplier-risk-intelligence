from pipelines.generate_synthetic_data import generate_dataset
from pipelines.train_model import split_by_time, validate_point_in_time


def test_synthetic_dataset_is_deterministic_and_point_in_time_safe() -> None:
    first = generate_dataset(rows=1_000, seed=726)
    second = generate_dataset(rows=1_000, seed=726)

    assert first.equals(second)
    validate_point_in_time(first)


def test_time_split_has_no_period_overlap() -> None:
    train, validation, test = split_by_time(generate_dataset(rows=2_000, seed=726))

    assert train["as_of_time"].dt.year.max() <= 2023
    assert set(validation["as_of_time"].dt.year) == {2024}
    assert test["as_of_time"].dt.year.min() >= 2025
