# user_service.py
from typing import Optional, List
from uuid import UUID, uuid4
from repositories.user_repository import UserRepository  # your repo from earlier
from models.user import User  # your Pydantic User model

class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_user_by_username(self, username: str) -> Optional[User]:
        user_row = self.user_repo.get_user_by_username(username)
        if not user_row:
            return None
        return self._row_to_user(user_row)

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        user_row = self.user_repo.get_user_by_id(user_id)
        if not user_row:
            return None
        return self._row_to_user(user_row)

    def get_all_users(self) -> List[User]:
        rows = self.user_repo.get_all_users()
        return [self._row_to_user(row) for row in rows]
    

    def create_user(self, user: User) -> User:
        user_id = str(user.id) if isinstance(user.id, UUID) else str(uuid4())
        user_dict = {
            "user_id": user_id,
            "username": user.username,
            "password": user.password,
            "role": user.role,
        }
        self.user_repo.insert_user(user_dict)
        return User(**user_dict)




    def _row_to_user(self, row: dict) -> User:
        # Convert BigQuery row dict to Pydantic User
        return User(
            id=UUID(row["user_id"]),
            username=row["username"],
            password=row["password"],
            role=row["role"]
        )
