from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.auth import DB, csrf_guard, current_user
from app.errors import ApiError
from app.models import User
from app.schemas import Envelope, ProfileView

router = APIRouter(prefix="/api/v1", tags=["profiles"])


def public_profile(user):
    return {"id": user.id, "name": user.name, "bio": user.bio, "avatar_url": user.avatar_url}


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=2000)
    avatar_url: HttpUrl | None = None

    @field_validator("name", "bio")
    @classmethod
    def reject_explicit_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value

    @field_validator("avatar_url")
    @classmethod
    def limit_url(cls, value):
        if value is not None and len(str(value)) > 2048:
            raise ValueError("Avatar URL must not exceed 2048 characters")
        return value

    @model_validator(mode="after")
    def require_changes(self):
        if not self.model_fields_set:
            raise ValueError("Submit at least one profile field")
        return self


@router.get("/creators/{creator_id}", response_model=Envelope[ProfileView])
def get_profile(creator_id: str, db: DB):
    user = db.get(User, creator_id)
    if not user:
        raise ApiError(404, "PROFILE_NOT_FOUND", "Creator profile was not found.")
    return {"data": public_profile(user)}


@router.get("/me/profile", response_model=Envelope[ProfileView])
def own_profile(user: Annotated[User, Depends(current_user)]):
    return {"data": public_profile(user)}


@router.patch("/me/profile", response_model=Envelope[ProfileView])
def update_profile(body: ProfileUpdate, db: DB, user: Annotated[User, Depends(csrf_guard)]):
    for field in body.model_fields_set:
        value = getattr(body, field)
        if field == "avatar_url" and value is not None:
            value = str(value)
        setattr(user, field, value)
    db.commit()
    return {"data": public_profile(user)}
