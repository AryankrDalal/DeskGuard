from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class Desk(Base):
    __tablename__ = "desks"

    id = Column(Integer, primary_key=True, index=True)

    desk_number = Column(Integer, unique=True, nullable=False)

    status = Column(String, default="FREE")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(String, nullable=False)

    desk_id = Column(Integer, nullable=False)

    check_in_time = Column(DateTime, default=datetime.utcnow)

    away_started_at = Column(DateTime, nullable=True)

    status = Column(String, default="ACTIVE")