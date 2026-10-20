from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, GramPanchayat
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect official email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your Gram Panchayat administrator."
        )

    gp_name = None
    if user.gram_panchayat_id:
        gp = db.query(GramPanchayat).filter(GramPanchayat.id == user.gram_panchayat_id).first()
        if gp:
            gp_name = gp.name

    token = create_access_token(
        subject=user.id,
        role=user.role,
        gp_id=user.gram_panchayat_id,
        email=user.email
    )

    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        gram_panchayat_id=user.gram_panchayat_id,
        gram_panchayat_name=gp_name,
        phone=user.phone,
        is_active=user.is_active
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT acknowledged logout
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    gp_name = None
    if current_user.gram_panchayat_id:
        gp = db.query(GramPanchayat).filter(GramPanchayat.id == current_user.gram_panchayat_id).first()
        if gp:
            gp_name = gp.name

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        gram_panchayat_id=current_user.gram_panchayat_id,
        gram_panchayat_name=gp_name,
        phone=current_user.phone,
        is_active=current_user.is_active
    )
