from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import (LoginRequest, RegisterRequest, TokenResponse, UserResponse,)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"],)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,)
def register(user_data: RegisterRequest, db: Session = Depends(get_db),):
    try:
        return AuthService.register(db=db, user_data=user_data,)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e),)

@router.post("/login", response_model=TokenResponse,)
def login(login_data: LoginRequest, db: Session = Depends(get_db),):
    try:
        return AuthService.login(db=db, login_data=login_data,)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e),)

@router.get("/me", response_model=UserResponse,)
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db),):
    return AuthService.get_current_user(token=token, db=db,)