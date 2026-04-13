from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4

class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    username: str = Field(...)
    password: str = Field(...)
    role: str = Field(default="USER") 
    slack_webhook_url: Optional[str] = Field(default=None)