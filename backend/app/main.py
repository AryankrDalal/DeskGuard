
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.scheduler import scheduler
import app.models
from app.models import Desk, Session


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://deskguard-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {"message": "Library Backend Running"}


@app.post("/create-desk/{desk_number}")
def create_desk(desk_number: int):
    db = SessionLocal()

    try:
        existing_desk = (
            db.query(Desk)
            .filter(Desk.desk_number == desk_number)
            .first()
        )

        if existing_desk:
            return {"error": "Desk already exists"}

        desk = Desk(
            desk_number=desk_number,
            status="FREE",
        )

        db.add(desk)
        db.commit()
        db.refresh(desk)

        return {
            "id": desk.id,
            "desk_number": desk.desk_number,
            "status": desk.status,
        }

    finally:
        db.close()


@app.get("/desks")
def get_desks():
    db = SessionLocal()

    try:
        desks = (
            db.query(Desk)
            .order_by(Desk.desk_number)
            .all()
        )

        return [
            {
                "id": desk.id,
                "desk_number": desk.desk_number,
                "status": desk.status,
            }
            for desk in desks
        ]

    finally:
        db.close()


@app.get("/admin/stats")
def admin_stats():
    db = SessionLocal()

    try:
        desks = db.query(Desk).all()

        total = len(desks)
        occupied = sum(1 for desk in desks if desk.status == "OCCUPIED")
        away = sum(1 for desk in desks if desk.status == "AWAY")
        free = sum(1 for desk in desks if desk.status == "FREE")

        return {
            "total": total,
            "occupied": occupied,
            "away": away,
            "free": free,
        }

    finally:
        db.close()


@app.post("/checkin/{desk_number}")
def checkin(desk_number: int):
    db = SessionLocal()

    try:
        desk = (
            db.query(Desk)
            .filter(Desk.desk_number == desk_number)
            .first()
        )

        if not desk:
            return {"error": "Desk not found"}

        if desk.status != "FREE":
            return {"error": "Desk already occupied"}

        active_session = (
            db.query(Session)
            .filter(Session.status == "ACTIVE")
            .first()
        )

        if active_session:
            return {"error": "You already have an active session"}

        desk.status = "OCCUPIED"

        session = Session(
            student_id="student123",
            desk_id=desk.id,
            check_in_time=datetime.utcnow(),
            away_started_at=None,
            status="ACTIVE",
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "message": f"Checked into Desk {desk.desk_number}",
            "active": True,
            "session_id": session.id,
            "desk_number": desk.desk_number,
            "status": desk.status,
        }

    finally:
        db.close()


@app.get("/student/current-session")
def current_session():
    db = SessionLocal()

    try:
        session = (
            db.query(Session)
            .filter(Session.status == "ACTIVE")
            .order_by(Session.id.desc())
            .first()
        )

        if not session:
            return {
                "active": False,
                "session_id": None,
                "desk_number": None,
                "status": None,
            }

        desk = (
            db.query(Desk)
            .filter(Desk.id == session.desk_id)
            .first()
        )

        if not desk:
            return {
                "active": False,
                "session_id": None,
                "desk_number": None,
                "status": None,
            }

        return {
            "active": True,
            "session_id": session.id,
            "desk_number": desk.desk_number,
            "status": desk.status,
            "check_in_time": session.check_in_time,
            "away_started_at": session.away_started_at,
        }

    finally:
        db.close()


@app.post("/away/{session_id}")
def away(session_id: int):
    db = SessionLocal()

    try:
        session = (
            db.query(Session)
            .filter(Session.id == session_id)
            .first()
        )

        if not session:
            return {"error": "Session not found"}

        if session.status != "ACTIVE":
            return {"error": "Session is not active"}

        desk = (
            db.query(Desk)
            .filter(Desk.id == session.desk_id)
            .first()
        )

        if not desk:
            return {"error": "Desk not found"}

        if desk.status == "AWAY":
            return {
                "message": "Away timer already started",
                "active": True,
                "session_id": session.id,
                "desk_number": desk.desk_number,
                "status": desk.status,
            }

        session.away_started_at = datetime.utcnow()
        desk.status = "AWAY"

        db.commit()

        return {
            "message": "Away timer started",
            "active": True,
            "session_id": session.id,
            "desk_number": desk.desk_number,
            "status": desk.status,
        }

    finally:
        db.close()


@app.post("/checkout/{session_id}")
def checkout(session_id: int):
    db = SessionLocal()

    try:
        session = (
            db.query(Session)
            .filter(Session.id == session_id)
            .first()
        )

        if not session:
            return {"error": "Session not found"}

        if session.status != "ACTIVE":
            return {"error": "Session already ended"}

        desk = (
            db.query(Desk)
            .filter(Desk.id == session.desk_id)
            .first()
        )

        if not desk:
            return {"error": "Desk not found"}

        desk.status = "FREE"
        session.status = "ENDED"
        session.away_started_at = None

        db.commit()

        return {
            "message": "Checked out successfully",
            "active": False,
            "session_id": session.id,
            "desk_number": desk.desk_number,
            "status": desk.status,
        }

    finally:
        db.close()