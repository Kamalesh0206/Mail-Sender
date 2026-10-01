from .friends import router as friends_router
from .groups import router as groups_router
from .occasions import router as occasions_router
from .quotes import router as quotes_router
from .calendar import router as calendar_router
from .history import router as history_router
from .dashboard import router as dashboard_router
from .auth import router as auth_router
from .settings import router as settings_router

__all__ = [
    "friends_router",
    "groups_router",
    "occasions_router",
    "quotes_router",
    "calendar_router",
    "history_router",
    "dashboard_router",
    "auth_router",
    "settings_router"
]
