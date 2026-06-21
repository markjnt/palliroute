"""Shared pytest fixtures for backend tests."""

import pytest

from app.services import holiday_service


@pytest.fixture(autouse=True)
def clear_holiday_cache():
    holiday_service.clear_holiday_cache()
    yield
    holiday_service.clear_holiday_cache()
