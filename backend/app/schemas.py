from pydantic import BaseModel, Field
from datetime import datetime


# --- Auth ---

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: str = Field(max_length=255)
    password: str = Field(min_length=6)
    display_name: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str | None
    bio: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- List Items ---

class ListItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    score: float = Field(ge=0, le=5.0, default=0)
    comment: str | None = None


class ListItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    score: float | None = Field(default=None, ge=0, le=5.0)
    comment: str | None = None


class ListItemOut(BaseModel):
    id: int
    name: str
    score: float
    comment: str | None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Lists ---

class ListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=100)
    is_public: bool = True


class ListUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=100)
    is_public: bool | None = None


class ListOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str | None
    category: str | None
    is_public: bool
    item_count: int
    like_count: int = 0
    owner: UserOut
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ListDetail(ListOut):
    items: list[ListItemOut]


# --- Comments ---

class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    item_id: int | None = None  # null = list-level comment


class CommentUpdate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: int
    text: str
    item_id: int | None
    author: UserOut
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Likes ---

class LikeCreate(BaseModel):
    list_id: int | None = None
    item_id: int | None = None
    emoji: str = "heart"


class LikeOut(BaseModel):
    id: int
    user_id: int
    list_id: int | None
    item_id: int | None
    emoji: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LikeSummary(BaseModel):
    emoji: str
    count: int
    user_liked: bool


# --- Follow ---

class FollowOut(BaseModel):
    id: int
    follower_id: int
    following_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowStats(BaseModel):
    followers_count: int
    following_count: int
    is_following: bool


# --- Notifications ---

class NotificationOut(BaseModel):
    id: int
    type: str
    actor: UserOut
    list_id: int | None
    list_title: str | None = None
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
