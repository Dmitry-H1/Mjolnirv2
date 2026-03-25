from pydantic import BaseModel

class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "USER"

class UserLogin(BaseModel):
    username: str
    password: str
