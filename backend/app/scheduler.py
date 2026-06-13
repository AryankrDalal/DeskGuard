from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models import Session, Desk


def check_expired_sessions():

    db = SessionLocal()

    try:

        sessions = db.query(Session).filter(
            Session.status == "ACTIVE",
            Session.away_started_at != None
        ).all()

        for session in sessions:

            away_time = datetime.utcnow() - session.away_started_at

            if away_time > timedelta(minutes=1):

                desk = db.query(Desk).filter(
                    Desk.id == session.desk_id
                ).first()

                if desk:
                    desk.status = "FREE"

                session.status = "ENDED"

                print(
                    f"Desk {desk.desk_number} automatically freed."
                )

        db.commit()

    finally:

        db.close()


scheduler = BackgroundScheduler()

scheduler.add_job(
    check_expired_sessions,
    "interval",
    minutes=1
)

scheduler.start()