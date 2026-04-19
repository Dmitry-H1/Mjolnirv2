from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "USER"

class UserLogin(BaseModel):
    username: str
    password: str
