from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=True)
    bio = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lists = relationship(
        "List", back_populates="owner_user", cascade="all, delete-orphan"
    )
    comments = relationship(
        "Comment", back_populates="author_user", cascade="all, delete-orphan"
    )


class List(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    is_public = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner_user = relationship("User", back_populates="lists")
    items = relationship(
        "ListItem",
        back_populates="list",
        cascade="all, delete-orphan",
        order_by="ListItem.position",
    )
    comments = relationship(
        "Comment", back_populates="list", cascade="all, delete-orphan"
    )

    @property
    def item_count(self):
        return len(self.items)


class ListItem(Base):
    __tablename__ = "list_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    score = Column(Float, default=0)
    comment = Column(Text, nullable=True)
    position = Column(Integer, default=0)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    list = relationship("List", back_populates="items")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_id = Column(
        Integer, ForeignKey("list_items.id"), nullable=True
    )  # null = list-level comment
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    list = relationship("List", back_populates="comments")
    author_user = relationship("User", back_populates="comments")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=True)
    item_id = Column(Integer, ForeignKey("list_items.id"), nullable=True)
    emoji = Column(String(10), default="heart")  # heart, fire, star, etc.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    list_rel = relationship("List")
    item = relationship("ListItem")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # recipient
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # who did it
    type = Column(String(20), nullable=False)  # like, comment, follow, copy
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
    list_rel = relationship("List")
