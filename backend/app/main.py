import os
import re

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import User, List, ListItem, Comment, Like
from pydantic import BaseModel
from sqlalchemy import func
from .schemas import (
    UserCreate, UserLogin, UserOut, TokenOut,
    ListCreate, ListUpdate, ListOut, ListDetail,
    ListItemCreate, ListItemUpdate, ListItemOut,
    CommentCreate, CommentUpdate, CommentOut,
    LikeCreate, LikeOut, LikeSummary,
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_user,
    verify_google_token, get_or_create_google_user,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RateAnything API", version="1.0.0")

allowed_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helpers ---

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:100]


# --- Auth ---

@app.post("/api/auth/register", response_model=TokenOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=409, detail="Username taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.post("/api/auth/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.get("/api/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


class GoogleLoginRequest(BaseModel):
    credential: str


@app.post("/api/auth/google", response_model=TokenOut)
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    google_info = await verify_google_token(data.credential)
    user = get_or_create_google_user(db, google_info)
    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


# --- Lists ---

@app.get("/api/lists", response_model=list[ListOut])
def list_public_lists(
    category: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(List).filter(List.is_public == True)
    if category:
        query = query.filter(List.category == category)
    if search:
        query = query.filter(List.title.ilike(f"%{search}%"))
    lists = query.order_by(List.updated_at.desc()).offset(skip).limit(limit).all()
    return [_list_to_out(l, db) for l in lists]


@app.get("/api/lists/mine", response_model=list[ListOut])
def list_my_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lists = db.query(List).filter(List.owner_id == current_user.id).order_by(List.updated_at.desc()).all()
    return [_list_to_out(l, db) for l in lists]


@app.post("/api/lists", response_model=ListDetail, status_code=201)
def create_list(data: ListCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slug = slugify(data.title)
    # Ensure unique slug per user
    existing = db.query(List).filter(List.owner_id == current_user.id, List.slug == slug).first()
    if existing:
        slug = f"{slug}-{existing.id + 1}"

    new_list = List(
        slug=slug,
        title=data.title,
        description=data.description,
        category=data.category,
        is_public=data.is_public,
        owner_id=current_user.id,
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return _list_to_detail(new_list)


@app.get("/api/lists/{username}/{slug}", response_model=ListDetail)
def get_list(
    username: str,
    slug: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    owner = db.query(User).filter(User.username == username).first()
    if not owner:
        raise HTTPException(status_code=404, detail="User not found")

    lst = db.query(List).filter(List.owner_id == owner.id, List.slug == slug).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    if not lst.is_public and (not current_user or current_user.id != lst.owner_id):
        raise HTTPException(status_code=404, detail="List not found")

    return _list_to_detail(lst)


@app.patch("/api/lists/{list_id}", response_model=ListOut)
def update_list(list_id: int, data: ListUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id, List.owner_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    update_data = data.model_dump(exclude_unset=True)
    if "title" in update_data:
        update_data["slug"] = slugify(update_data["title"])
    for key, value in update_data.items():
        setattr(lst, key, value)

    db.commit()
    db.refresh(lst)
    return _list_to_out(lst, db)


@app.delete("/api/lists/{list_id}", status_code=204)
def delete_list(list_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id, List.owner_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    db.delete(lst)
    db.commit()


@app.post("/api/lists/{list_id}/copy", response_model=ListDetail, status_code=201)
def copy_list(list_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    original = db.query(List).filter(List.id == list_id, List.is_public == True).first()
    if not original:
        raise HTTPException(status_code=404, detail="List not found")

    slug = slugify(original.title)
    new_list = List(
        slug=slug,
        title=original.title,
        description=original.description,
        category=original.category,
        is_public=True,
        owner_id=current_user.id,
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return _list_to_detail(new_list)


# --- List Items ---

@app.post("/api/lists/{list_id}/items", response_model=ListItemOut, status_code=201)
def add_item(list_id: int, data: ListItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id, List.owner_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    position = len(lst.items)
    item = ListItem(
        name=data.name,
        score=data.score,
        comment=data.comment,
        position=position,
        list_id=list_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/api/lists/{list_id}/items/{item_id}", response_model=ListItemOut)
def update_item(
    list_id: int,
    item_id: int,
    data: ListItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lst = db.query(List).filter(List.id == list_id, List.owner_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    item = db.query(ListItem).filter(ListItem.id == item_id, ListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/lists/{list_id}/items/{item_id}", status_code=204)
def delete_item(
    list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lst = db.query(List).filter(List.id == list_id, List.owner_id == current_user.id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    item = db.query(ListItem).filter(ListItem.id == item_id, ListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()


# --- Comments ---

@app.get("/api/lists/{list_id}/comments", response_model=list[CommentOut])
def list_comments(list_id: int, db: Session = Depends(get_db)):
    lst = db.query(List).filter(List.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    comments = (
        db.query(Comment)
        .filter(Comment.list_id == list_id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [_comment_to_out(c) for c in comments]


@app.post("/api/lists/{list_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    list_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lst = db.query(List).filter(List.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    comment = Comment(
        text=data.text,
        list_id=list_id,
        author_id=current_user.id,
        item_id=data.item_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_to_out(comment)


@app.patch("/api/comments/{comment_id}", response_model=CommentOut)
def update_comment(comment_id: int, data: CommentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.author_id == current_user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.text = data.text
    db.commit()
    db.refresh(comment)
    return _comment_to_out(comment)


@app.delete("/api/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.author_id == current_user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()


# --- Likes ---

@app.post("/api/likes", response_model=LikeOut, status_code=201)
def toggle_like(data: LikeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Like).filter(Like.user_id == current_user.id, Like.emoji == data.emoji)
    if data.list_id:
        query = query.filter(Like.list_id == data.list_id)
    if data.item_id:
        query = query.filter(Like.item_id == data.item_id)

    existing = query.first()
    if existing:
        db.delete(existing)
        db.commit()
        # Return the deleted like with id=-1 to signal removal
        return LikeOut(id=-1, user_id=current_user.id, list_id=data.list_id, item_id=data.item_id, emoji=data.emoji, created_at=existing.created_at)

    like = Like(
        user_id=current_user.id,
        list_id=data.list_id,
        item_id=data.item_id,
        emoji=data.emoji,
    )
    db.add(like)
    db.commit()
    db.refresh(like)
    return like


@app.get("/api/likes/list/{list_id}", response_model=list[LikeSummary])
def get_list_likes(list_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    results = (
        db.query(Like.emoji, func.count(Like.id))
        .filter(Like.list_id == list_id, Like.item_id.is_(None))
        .group_by(Like.emoji)
        .all()
    )
    user_likes = set()
    if current_user:
        user_likes = {
            l.emoji for l in db.query(Like).filter(
                Like.list_id == list_id, Like.item_id.is_(None), Like.user_id == current_user.id
            ).all()
        }
    return [LikeSummary(emoji=emoji, count=count, user_liked=emoji in user_likes) for emoji, count in results]


@app.get("/api/likes/items/{list_id}", response_model=dict[str, list[LikeSummary]])
def get_item_likes(list_id: int, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    results = (
        db.query(Like.item_id, Like.emoji, func.count(Like.id))
        .filter(Like.list_id == list_id, Like.item_id.isnot(None))
        .group_by(Like.item_id, Like.emoji)
        .all()
    )
    user_likes = set()
    if current_user:
        user_likes = {
            (l.item_id, l.emoji) for l in db.query(Like).filter(
                Like.list_id == list_id, Like.item_id.isnot(None), Like.user_id == current_user.id
            ).all()
        }

    item_map: dict[str, list[LikeSummary]] = {}
    for item_id, emoji, count in results:
        key = str(item_id)
        if key not in item_map:
            item_map[key] = []
        item_map[key].append(LikeSummary(emoji=emoji, count=count, user_liked=(item_id, emoji) in user_likes))
    return item_map


# --- User Profiles ---

@app.get("/api/users/{username}", response_model=UserOut)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/{username}/lists", response_model=list[ListOut])
def get_user_lists(
    username: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.query(List).filter(List.owner_id == user.id)
    # Only show public lists unless viewing own profile
    if not current_user or current_user.id != user.id:
        query = query.filter(List.is_public == True)

    lists = query.order_by(List.updated_at.desc()).all()
    return [_list_to_out(l, db) for l in lists]


# --- Categories ---

@app.get("/api/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    results = db.query(List.category).filter(List.category.isnot(None)).distinct().all()
    return [r[0] for r in results]


# --- Health ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Response helpers ---

def _list_to_out(lst: List, db: Session | None = None) -> ListOut:
    like_count = 0
    if db:
        like_count = db.query(func.count(Like.id)).filter(Like.list_id == lst.id).scalar() or 0
    return ListOut(
        id=lst.id,
        slug=lst.slug,
        title=lst.title,
        description=lst.description,
        category=lst.category,
        is_public=lst.is_public,
        item_count=lst.item_count,
        like_count=like_count,
        owner=UserOut.model_validate(lst.owner_user),
        created_at=lst.created_at,
        updated_at=lst.updated_at,
    )


def _list_to_detail(lst: List) -> ListDetail:
    return ListDetail(
        id=lst.id,
        slug=lst.slug,
        title=lst.title,
        description=lst.description,
        category=lst.category,
        is_public=lst.is_public,
        item_count=lst.item_count,
        owner=UserOut.model_validate(lst.owner_user),
        items=[ListItemOut.model_validate(i) for i in lst.items],
        created_at=lst.created_at,
        updated_at=lst.updated_at,
    )


def _comment_to_out(c: Comment) -> CommentOut:
    return CommentOut(
        id=c.id,
        text=c.text,
        item_id=c.item_id,
        author=UserOut.model_validate(c.author_user),
        created_at=c.created_at,
    )
