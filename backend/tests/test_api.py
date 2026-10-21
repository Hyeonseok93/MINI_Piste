def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def _routine(client, d):
    r = client.get("/api/plan/day", params={"date": d}).json()
    return r["routine"]["name"] if r["routine"] else r["kind"]


def test_week1_schedule(client):
    # 월 A · 화 유산소 · 수 B · 목 유산소 · 금토 휴식 · 일 A
    days = [_routine(client, f"2026-10-{d}") for d in range(19, 26)]
    assert days == ["전신 A", "cardio", "전신 B", "cardio", "rest", "rest", "전신 A"]


def test_phase1_strength_days_alternate_without_break(client):
    # 일(10/25) A 다음부터 화·목·일 근력이 B, A, B, A, B, A … 로 이어진다
    strength = ["2026-10-27", "2026-10-29", "2026-11-01", "2026-11-03", "2026-11-05", "2026-11-08"]
    assert [_routine(client, d) for d in strength] == ["전신 B", "전신 A", "전신 B", "전신 A", "전신 B", "전신 A"]
    assert _routine(client, "2026-10-26") == "cardio"
    assert _routine(client, "2026-10-30") == "rest"


def test_phase2_split(client):
    mon = client.get("/api/plan/day", params={"date": "2026-11-16"}).json()
    assert mon["routine"]["name"] == "하체 1"
    assert mon["phase"].endswith("빌드업")
    assert _routine(client, "2026-11-22") == "상체 1"  # 일
    assert _routine(client, "2026-11-20") == "rest"  # 금


def test_outside_plan(client):
    d = client.get("/api/plan/day", params={"date": "2026-10-16"}).json()
    assert d["phase"] is None and d["routine"] is None


def test_week_marks_done_days(client):
    week = client.get("/api/plan/week", params={"start": "2026-10-14"}).json()
    assert len(week) == 7 and week[0]["date"] == "2026-10-12"
    fri = week[4]
    assert fri["date"] == "2026-10-16" and fri["done"] is True


def test_today_uses_friday_find_results(client):
    data = client.get("/api/today", params={"date": "2026-10-19"}).json()
    recs = {i["item"]["exercise"]["name"]: i["recommendation"] for i in data["items"]}
    assert recs["레그프레스"]["weight_kg"] == 120
    assert recs["체스트프레스 머신"]["weight_kg"] == 40
    assert recs["랫풀다운"]["weight_kg"] == 50
    assert "머신 로우" not in recs and "백 익스텐션 (45°)" not in recs
    assert data["workout"] is None


def _exercise_id(client, name):
    return next(e["id"] for e in client.get("/api/exercises").json() if e["name"] == name)


def test_log_session_then_next_recommendation_increases(client):
    lat = _exercise_id(client, "랫풀다운")
    w = client.post("/api/workouts", json={"date": "2026-10-19", "routine_id": 1}).json()
    assert w["title"] == "전신 A"
    for reps in (12, 12, 12):
        r = client.post(f"/api/workouts/{w['id']}/sets", json={"exercise_id": lat, "weight_kg": 50, "reps": reps})
        assert r.status_code == 201
    assert [s["set_no"] for s in client.get(f"/api/workouts/{w['id']}").json()["sets"]] == [1, 2, 3]

    # 당일 화면에서는 추천이 바뀌지 않고, 다음 전신 A(일)부터 반영
    same_day = client.get("/api/today", params={"date": "2026-10-19"}).json()
    assert same_day["workout"]["id"] == w["id"]
    next_a = client.get("/api/today", params={"date": "2026-10-25"}).json()
    rec = next(i["recommendation"] for i in next_a["items"] if i["item"]["exercise"]["name"] == "랫풀다운")
    assert rec["action"] == "increase" and rec["weight_kg"] == 55

    hist = client.get(f"/api/exercises/{lat}/history").json()
    assert [h["top_weight_kg"] for h in hist] == [50, 50]


def test_set_update_and_delete(client):
    w = client.post("/api/workouts", json={"date": "2026-10-21"}).json()
    s = client.post(f"/api/workouts/{w['id']}/sets", json={"exercise_id": 1, "weight_kg": 100, "reps": 10}).json()
    assert client.patch(f"/api/sets/{s['id']}", json={"reps": 11}).json()["reps"] == 11
    assert client.delete(f"/api/sets/{s['id']}").status_code == 204
    assert client.get(f"/api/workouts/{w['id']}").json()["sets"] == []
    assert client.delete(f"/api/workouts/{w['id']}").status_code == 204
    assert client.get(f"/api/workouts/{w['id']}").status_code == 404


def test_validation_errors(client):
    w = client.post("/api/workouts", json={"date": "2026-10-21"}).json()
    assert client.post(f"/api/workouts/{w['id']}/sets", json={"exercise_id": 9999, "weight_kg": 10, "reps": 5}).status_code == 422
    assert client.post(f"/api/workouts/{w['id']}/sets", json={"exercise_id": 1, "weight_kg": -1, "reps": 5}).status_code == 422
    assert client.post("/api/workouts", json={"date": "2026-10-21", "routine_id": 9999}).status_code == 422


def test_daily_log_upsert(client):
    r = client.put("/api/daily-logs/2026-10-19", json={"body_weight_kg": 110.2, "steps": 8500})
    assert r.json()["body_weight_kg"] == 110.2
    client.put("/api/daily-logs/2026-10-19", json={"body_weight_kg": 109.8, "steps": 9000, "sleep_hours": 7})
    logs = client.get("/api/daily-logs", params={"from": "2026-10-19", "to": "2026-10-19"}).json()
    assert len(logs) == 1 and logs[0]["body_weight_kg"] == 109.8


def test_routine_a_includes_shoulder_press_and_curl(client):
    items = client.get("/api/routines/1").json()["items"]
    names = [i["exercise"]["name"] for i in items]
    assert names[-3:] == ["바벨 숄더프레스", "바이셉 컬 머신", "플랭크"]
    shoulder = items[-3]
    assert (shoulder["sets"], shoulder["rep_min"], shoulder["rep_max"]) == (3, 12, 12)
    assert [i["position"] for i in items] == list(range(1, len(items) + 1))


def test_no_routine_uses_back_extension_or_machine_row(client):
    for r in client.get("/api/routines").json():
        names = [i["exercise"]["name"] for i in client.get(f"/api/routines/{r['id']}").json()["items"]]
        assert "백 익스텐션 (45°)" not in names and "머신 로우" not in names, r["name"]
    # 종목 자체(과거 기록용)는 남아 있다
    all_names = [e["name"] for e in client.get("/api/exercises").json()]
    assert "백 익스텐션 (45°)" in all_names and "머신 로우" in all_names


def test_routine_b_uses_underhand_pulldown_instead_of_high_row(client):
    routines = {r["name"]: r["id"] for r in client.get("/api/routines").json()}
    items = client.get(f"/api/routines/{routines['전신 B']}").json()["items"]
    names = [i["exercise"]["name"] for i in items]
    assert "하이로우" not in names
    assert names.index("랫풀다운 언더그립") == 3


def test_exercise_create(client):
    r = client.post("/api/exercises", json={"name": " 바벨 로우 ", "equipment": "barbell", "increment_kg": 2.5})
    assert r.status_code == 201
    assert r.json()["name"] == "바벨 로우" and r.json()["equipment"] == "barbell"
    assert client.post("/api/exercises", json={"name": "바벨 로우"}).status_code == 409
    assert client.post("/api/exercises", json={"name": "바벨 숄더프레스"}).status_code == 409
    assert client.post("/api/exercises", json={"name": ""}).status_code == 422


def test_exercise_patch(client):
    r = client.patch("/api/exercises/3", json={"setup_note": "의자 4번"})
    assert r.json()["setup_note"] == "의자 4번"
    assert client.patch("/api/exercises/3", json={"increment_kg": 0}).status_code == 422


def test_weight_finder_endpoint(client):
    r = client.post("/api/tools/weight-finder", json={"completed": True, "rir": 5, "weight_kg": 40, "increment_kg": 5})
    assert r.json() == {"verdict": "up2", "steps": 2, "message": "너무 쉬움 → 무게 2단계 올리기", "next_weight_kg": 50}
    assert client.post("/api/tools/weight-finder", json={"completed": True}).status_code == 422
