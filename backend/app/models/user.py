from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from uuid import UUID, uuid4

class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    username: str = Field(...)
    email: EmailStr = Field(...)
    password: str = Field(...)
    role: str = Field(default="USER") 