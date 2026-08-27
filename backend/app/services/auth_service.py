from datetime import datetime, timedelta, timezone
from uuid import uuid4
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import (LoginRequest, RegisterRequest,)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto",)
SECRET_KEY = "change-this-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

class AuthService:

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str,) -> bool:
        return pwd_context.verify(plain_password, hashed_password,)

    @staticmethod
    def create_access_token(user_id: str,) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {"sub": user_id, "exp": expire,}
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM,)

    @staticmethod
    def register(db: Session, user_data: RegisterRequest,):
        # Kiểm tra email
        existing_user = UserRepository.get_by_email(db, user_data.email,)
        if existing_user:
            raise ValueError("Email already registered")
        # Hash password
        hashed_password = AuthService.hash_password(user_data.password)
        # Tạo User
        user = User(id=str(uuid4()), username=user_data.username, email=user_data.email, password=hashed_password,)
        return UserRepository.create(db, user,)

    @staticmethod
    def login(db: Session, login_data: LoginRequest,):
        user = UserRepository.get_by_email(db, login_data.email,)
        if not user:
            raise ValueError("Invalid email or password")

        if not AuthService.verify_password(login_data.password, user.password,):
            raise ValueError("Invalid email or password")

        access_token = AuthService.create_access_token(str(user.id))
        return {"access_token": access_token, "token_type": "bearer",}

    @staticmethod
    def get_current_user(token: str, db: Session,):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM],)
            user_id = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        user = UserRepository.get_by_id(db, user_id,)

        if user is None:
            raise credentials_exception
        return user