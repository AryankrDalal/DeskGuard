from fastapi import FastAPI
from app.database import engine, Base, SessionLocal
from app.scheduler import scheduler
import app.models
from app.models import Desk, Session
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
# Create FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)


# Home endpoint
@app.get("/")
def home():
    return {"message": "Library Backend Running"}


@app.post("/create-desk/{desk_number}")
def create_desk(desk_number: int):

    db = SessionLocal()

    existing_desk = db.query(Desk).filter(
        Desk.desk_number == desk_number
    ).first()

    if existing_desk:
        return {"error": "Desk already exists"}

    desk = Desk(
        desk_number=desk_number,
        status="FREE"
    )

    db.add(desk)

    db.commit()

    db.refresh(desk)

    return desk



@app.post("/checkin/{desk_number}")
def checkin(desk_number: int):

    db = SessionLocal()

    desk = db.query(Desk).filter(
        Desk.desk_number == desk_number
    ).first()

    if not desk:
        return {"error": "Desk not found"}

    if desk.status != "FREE":
        return {"error": "Desk already occupied"}

    desk.status = "OCCUPIED"

    session = Session(
        student_id="student123",
        desk_id=desk.id,
        check_in_time=datetime.utcnow(),
        status="ACTIVE"
    )

    db.add(session)

    db.commit()

    db.refresh(session)

    return {
        "message": f"Checked into Desk {desk_number}",
        "session_id": session.id
    }

@app.post("/away/{session_id}")
def away(session_id: int):

    db = SessionLocal()

    session = db.query(Session).filter(
        Session.id == session_id
    ).first()

    if not session:
        return {"error": "Session not found"}

    desk = db.query(Desk).filter(
        Desk.id == session.desk_id
    ).first()

    if not desk:
        return {"error": "Desk not found"}

    if session.status != "ACTIVE":
        return {"error": "Session is not active"}

    session.away_started_at = datetime.utcnow()

    desk.status = "AWAY"

    db.commit()

    return {
        "message": "Away timer started",
        "session_id": session.id,
        "desk_number": desk.desk_number
    }
@app.get("/desks")
def get_desks():

    db = SessionLocal()

    desks = (
        db.query(Desk)
        .order_by(Desk.desk_number)
        .all()
    )

    return [
        {
            "id": desk.id,
            "desk_number": desk.desk_number,
            "status": desk.status
        }
        for desk in desks
    ]
@app.get("/admin/stats")
def admin_stats():

    db = SessionLocal()

    try:
        desks = db.query(Desk).all()

        total = len(desks)

        occupied = sum(
            1 for d in desks
            if d.status == "OCCUPIED"
        )

        away = sum(
            1 for d in desks
            if d.status == "AWAY"
        )

        free = sum(
            1 for d in desks
            if d.status == "FREE"
        )

        return {
            "total": total,
            "occupied": occupied,
            "away": away,
            "free": free
        }

    finally:
        db.close()


@app.get("/student/current-session")
def current_session():

    db = SessionLocal()

    session = (
        db.query(Session)
        .filter(Session.status == "ACTIVE")
        .order_by(Session.id.desc())
        .first()
    )

    if not session:
        return {"active": False}

    desk = (
        db.query(Desk)
        .filter(Desk.id == session.desk_id)
        .first()
    )

    return {
        "active": True,
        "session_id": session.id,
        "desk_number": desk.desk_number,
        "status": desk.status
    }


@app.post("/checkout/{session_id}")
def checkout(session_id: int):

    db = SessionLocal()

    session = (
        db.query(Session)
        .filter(Session.id == session_id)
        .first()
    )

    if not session:
        return {"error": "Session not found"}

    desk = (
        db.query(Desk)
        .filter(Desk.id == session.desk_id)
        .first()
    )

    desk.status = "FREE"
    session.status = "ENDED"

    db.commit()

    return {
        "message": "Checked out successfully"
    }