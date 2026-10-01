from .friends import router as friends_router
from .wishes import router as wishes_router
from .auth import router as auth_router
from .settings import router as settings_router
from .stats import router as stats_router

__all__ = [
    "friends_router",
    "wishes_router",
    "auth_router",
    "settings_router",
    "stats_router"
]
