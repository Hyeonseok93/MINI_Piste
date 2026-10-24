from datetime import date

from app.models import DayKind
from app.schemas import CalendarDay
from app.services.calendar import attendance, compute_streak


def day(d: str, kind: DayKind | None, done: bool, rest_day: bool = False) -> CalendarDay:
    return CalendarDay(
        rest_day=rest_day,
        date=date.fromisoformat(d), phase=None, week_index=None, kind=kind, label=None, cardio_minutes=None,
        routine=None, workout_id=1 if done else None, done=done, workout_title=None, set_count=0,
        cardio_minutes_done=None, body_weight_kg=None,
    )


S, C, R = DayKind.strength, DayKind.cardio, DayKind.rest


def test_streak_skips_rest_and_unfinished_today():
    days = [
        day("2026-10-19", S, True),
        day("2026-10-20", C, True),
        day("2026-10-21", R, False),  # 휴식은 건너뜀
        day("2026-10-22", S, True),
        day("2026-10-23", C, False),  # 오늘, 아직 안 함 → 끊지 않음
    ]
    assert compute_streak(days, date(2026, 10, 23)) == 3


def test_streak_breaks_on_missed_day():
    days = [day("2026-10-19", S, True), day("2026-10-20", C, False), day("2026-10-21", S, True)]
    assert compute_streak(days, date(2026, 10, 21)) == 1


def test_chosen_rest_day_is_not_missed():
    days = [day("2026-10-19", S, True), day("2026-10-20", C, False, rest_day=True), day("2026-10-21", S, True)]
    assert compute_streak(days, date(2026, 10, 21)) == 2
    assert attendance(days, date(2026, 10, 21)) == 1.0


def test_rest_day_endpoint_keeps_other_fields(client):
    client.put("/api/daily-logs/2026-10-22", json={"body_weight_kg": 109.5, "memo": "피곤"})
    r = client.put("/api/daily-logs/2026-10-22/rest", json={"rest_day": True})
    assert r.json()["rest_day"] is True and r.json()["body_weight_kg"] == 109.5 and r.json()["memo"] == "피곤"

    by = {d["date"]: d for d in client.get("/api/calendar", params={"month": "2026-10"}).json()}
    assert by["2026-10-22"]["rest_day"] is True and by["2026-10-22"]["kind"] == "cardio"

    # 체중을 다시 저장해도 휴식 표시는 그대로
    client.put("/api/daily-logs/2026-10-22", json={"body_weight_kg": 109.0})
    assert client.get("/api/daily-logs", params={"from": "2026-10-22", "to": "2026-10-22"}).json()[0]["rest_day"] is True

    assert client.put("/api/daily-logs/2026-10-22/rest", json={"rest_day": False}).json()["rest_day"] is False


def test_attendance_counts_past_planned_days():
    days = [day("2026-10-19", S, True), day("2026-10-20", C, False), day("2026-10-21", R, False), day("2026-10-22", S, False)]
    # 오늘(22일)은 안 했으니 제외 → 19, 20 중 1개
    assert attendance(days, date(2026, 10, 22)) == 0.5
    assert attendance([], date(2026, 10, 22)) is None


def test_profile_flow(client):
    assert client.get("/api/profile").status_code == 404
    r = client.put("/api/profile", json={"name": "  현민 ", "height_cm": 188, "start_weight_kg": 110})
    assert r.status_code == 200 and r.json()["name"] == "현민"
    assert client.put("/api/profile", json={"name": "   "}).status_code == 422
    assert client.get("/api/profile").json()["start_weight_kg"] == 110


def test_calendar_month(client):
    days = client.get("/api/calendar", params={"month": "2026-10"}).json()
    assert len(days) == 31
    by = {d["date"]: d for d in days}
    assert by["2026-10-16"]["done"] is True and by["2026-10-16"]["set_count"] == 3
    assert by["2026-10-19"]["routine"]["name"] == "전신 A"
    assert by["2026-10-23"]["kind"] == "rest"
    assert client.get("/api/calendar", params={"month": "2026-13"}).status_code == 422
    assert client.get("/api/calendar", params={"month": "oct"}).status_code == 422


def test_dashboard(client):
    client.put("/api/profile", json={"name": "현민", "start_weight_kg": 110, "goal_weight_kg": 95})
    client.put("/api/daily-logs/2026-10-20", json={"body_weight_kg": 109.4})
    w = client.post("/api/workouts", json={"date": "2026-10-19", "routine_id": 1}).json()
    client.post(f"/api/workouts/{w['id']}/sets", json={"exercise_id": 1, "weight_kg": 120, "reps": 12})

    d = client.get("/api/dashboard", params={"date": "2026-10-20"}).json()
    assert d["profile"]["name"] == "현민"
    assert d["today"]["kind"] == "cardio"
    assert [x["date"] for x in d["week"]][0] == "2026-10-19"
    assert d["upcoming"][0]["date"] == "2026-10-21"
    s = d["stats"]
    assert s["day_number"] == 2
    assert s["week_done"] == 1 and s["week_planned"] == 5
    assert s["streak"] == 2  # 10/19 + 10/16 무게 찾기 (계획 밖이라도 운동한 날은 센다)
    assert s["latest_weight_kg"] == 109.4
    assert s["total_workouts"] == 2  # 10/16 무게 찾기 + 10/19
    assert len(d["phases"]) == 7
