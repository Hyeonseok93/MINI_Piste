"""1단계: 근육 태그·종목 보관, 루틴·플랜 편집, 월말 측정, 통계."""


def ex_id(client, name):
    return next(e["id"] for e in client.get("/api/exercises").json() if e["name"] == name)


def routine_id(client, name):
    return next(r["id"] for r in client.get("/api/routines").json() if r["name"] == name)


# --- 근육 · 종목 ---------------------------------------------------------------
def test_muscle_taxonomy_and_seeded_mapping(client):
    muscles = client.get("/api/muscles").json()
    assert len(muscles) == 13 and {"muscle": "lats", "label": "광배", "side": "back"} in muscles

    legpress = next(e for e in client.get("/api/exercises").json() if e["name"] == "레그프레스")
    assert {"muscle": "quads", "role": "primary"} in legpress["muscles"]
    assert {"muscle": "glutes", "role": "secondary"} in legpress["muscles"]


def test_set_muscles_replaces_and_rejects_duplicates(client):
    eid = ex_id(client, "펙덱")
    r = client.put(f"/api/exercises/{eid}/muscles", json={"muscles": [{"muscle": "chest", "role": "primary"}]})
    assert r.status_code == 200 and r.json()["muscles"] == [{"muscle": "chest", "role": "primary"}]
    dup = {"muscles": [{"muscle": "chest"}, {"muscle": "chest", "role": "secondary"}]}
    assert client.put(f"/api/exercises/{eid}/muscles", json=dup).status_code == 422
    assert client.put(f"/api/exercises/{eid}/muscles", json={"muscles": [{"muscle": "wings"}]}).status_code == 422


def test_create_exercise_with_muscles(client):
    body = {"name": "케이블 크런치", "category": "core", "muscles": [{"muscle": "abs"}]}
    r = client.post("/api/exercises", json=body)
    assert r.status_code == 201 and r.json()["muscles"] == [{"muscle": "abs", "role": "primary"}]


def test_archive_hides_from_active_list_but_keeps_history(client):
    eid = ex_id(client, "하이로우")
    assert client.patch(f"/api/exercises/{eid}", json={"archived": True}).json()["archived"] is True
    active = [e["name"] for e in client.get("/api/exercises", params={"active": True}).json()]
    assert "하이로우" not in active
    assert "하이로우" in [e["name"] for e in client.get("/api/exercises").json()]


def test_rename_exercise_conflict(client):
    eid = ex_id(client, "펙덱")
    assert client.patch(f"/api/exercises/{eid}", json={"name": "레그프레스"}).status_code == 409
    assert client.patch(f"/api/exercises/{eid}", json={"name": " 체스트 플라이 "}).json()["name"] == "체스트 플라이"


# --- 루틴 편집 -------------------------------------------------------------------
def test_create_routine_and_replace_items(client):
    lp, plank = ex_id(client, "레그프레스"), ex_id(client, "플랭크")
    r = client.post(
        "/api/routines",
        json={"name": "하체 집중", "items": [{"exercise_id": lp, "sets": 3, "rep_min": 10, "rep_max": 12}]},
    )
    assert r.status_code == 201 and r.json()["item_count"] == 1
    rid = r.json()["id"]

    # 순서 바꾸고 시간 종목 추가를 한 번에
    items = [
        {"exercise_id": plank, "sets": 2, "duration_sec": 45},
        {"exercise_id": lp, "sets": 4, "rep_min": 8, "rep_max": 10},
    ]
    out = client.put(f"/api/routines/{rid}/items", json=items).json()
    assert [(i["position"], i["exercise"]["name"], i["sets"]) for i in out["items"]] == [
        (1, "플랭크", 2),
        (2, "레그프레스", 4),
    ]
    assert out["items"][0]["duration_sec"] == 45 and out["items"][0]["rep_min"] is None


def test_routine_item_validation(client):
    lp = ex_id(client, "레그프레스")
    rid = routine_id(client, "전신 A")
    bad = [
        [{"exercise_id": lp, "sets": 3, "rep_min": 10, "rep_max": 12, "duration_sec": 30}],  # 둘 다
        [{"exercise_id": lp, "sets": 3}],  # 둘 다 없음
        [{"exercise_id": lp, "sets": 3, "rep_min": 12, "rep_max": 10}],  # 최소 > 최대
        [{"exercise_id": lp, "sets": 0, "rep_min": 10, "rep_max": 12}],  # 세트 0
        [{"exercise_id": 9999, "sets": 3, "rep_min": 10, "rep_max": 12}],  # 없는 종목
    ]
    for items in bad:
        assert client.put(f"/api/routines/{rid}/items", json=items).status_code == 422, items
    # 실패한 요청은 아무것도 바꾸지 않는다
    assert client.get(f"/api/routines/{rid}").json()["item_count"] == 6


def test_routine_rename_conflict(client):
    rid = routine_id(client, "전신 A")
    assert client.patch(f"/api/routines/{rid}", json={"name": "전신 B"}).status_code == 409
    assert client.patch(f"/api/routines/{rid}", json={"description": "새 설명"}).json()["description"] == "새 설명"


def test_delete_routine_rules(client):
    used = routine_id(client, "전신 A")
    assert client.delete(f"/api/routines/{used}").status_code == 409  # 플랜에서 쓰는 중

    rid = client.post("/api/routines", json={"name": "임시"}).json()["id"]
    w = client.post("/api/workouts", json={"date": "2026-10-23", "routine_id": rid}).json()
    assert client.delete(f"/api/routines/{rid}").status_code == 204
    # 과거 기록은 남고 루틴 연결만 끊긴다
    assert client.get(f"/api/workouts/{w['id']}").json()["routine_id"] is None


# --- 플랜 편집 -------------------------------------------------------------------
def test_phase_day_edit_reflects_in_calendar(client):
    phases = client.get("/api/phases").json()
    week1 = next(p for p in phases if p["start_date"] == "2026-10-19")
    rid = routine_id(client, "전신 B")

    r = client.put(
        f"/api/phases/{week1['id']}/days/4", json={"kind": "strength", "label": "보충 전신", "routine_id": rid}
    )
    assert r.status_code == 200
    fri = next(d for d in client.get("/api/calendar", params={"month": "2026-10"}).json() if d["date"] == "2026-10-23")
    assert fri["kind"] == "strength" and fri["routine"]["name"] == "전신 B"

    no_routine = {"kind": "strength", "label": "근력"}
    assert client.put(f"/api/phases/{week1['id']}/days/4", json=no_routine).status_code == 422
    rest_with_routine = {"kind": "rest", "label": "휴식", "routine_id": rid}
    assert client.put(f"/api/phases/{week1['id']}/days/4", json=rest_with_routine).status_code == 422
    assert client.put(f"/api/phases/{week1['id']}/days/7", json={"kind": "rest", "label": "x"}).status_code == 422


def test_phase_dates_validation(client):
    phases = client.get("/api/phases").json()
    first, second = phases[0], phases[1]
    assert client.patch(f"/api/phases/{first['id']}", json={"end_date": second["start_date"]}).status_code == 409
    assert client.patch(f"/api/phases/{first['id']}", json={"end_date": "2026-10-01"}).status_code == 422
    assert client.patch(f"/api/phases/{first['id']}", json={"name": "복귀 첫 주"}).json()["name"] == "복귀 첫 주"


def test_create_phase_copies_days_and_delete(client):
    phases = client.get("/api/phases").json()
    last = phases[-1]
    body = {"name": "🏁 2년차", "start_date": "2027-11-01", "end_date": "2028-01-31", "copy_from": last["id"]}
    r = client.post("/api/phases", json=body)
    assert r.status_code == 201
    new = r.json()
    assert [d["kind"] for d in new["days"]] == [d["kind"] for d in last["days"]]
    # 새 단계 기간의 달력이 복사한 계획을 따른다
    nov = client.get("/api/calendar", params={"month": "2027-11"}).json()
    assert nov[0]["phase"] == "🏁 2년차"

    # 겹치는 기간, 거꾸로 된 날짜는 거절
    assert client.post("/api/phases", json={**body, "name": "겹침"}).status_code == 409
    backwards = {"name": "x", "start_date": "2029-02-01", "end_date": "2029-01-01"}
    assert client.post("/api/phases", json=backwards).status_code == 422

    # 복사 없이 만들면 7일 모두 휴식
    blank = client.post("/api/phases", json={"name": "빈 단계", "start_date": "2028-02-01"}).json()
    assert len(blank["days"]) == 7 and {d["kind"] for d in blank["days"]} == {"rest"}

    assert client.delete(f"/api/phases/{blank['id']}").status_code == 204
    assert client.delete(f"/api/phases/{blank['id']}").status_code == 404
    assert len(client.get("/api/phases").json()) == len(phases) + 1


# --- 월말 측정 -------------------------------------------------------------------
def test_measurement_with_weekly_weight_average(client):
    for d, w in [("2026-10-25", 109.0), ("2026-10-28", 108.0), ("2026-10-31", 107.0), ("2026-10-20", 120.0)]:
        client.put(f"/api/daily-logs/{d}", json={"body_weight_kg": w})
    r = client.put("/api/measurements/2026-10-31", json={"waist_cm": 112.5, "note": "첫 월말 측정"})
    assert r.status_code == 200
    m = r.json()
    assert m["waist_cm"] == 112.5 and m["weight_days"] == 3 and m["weight_avg_7d"] == 108.0  # 10/20 은 7일 밖

    assert len(client.get("/api/measurements", params={"from": "2026-10-01", "to": "2026-10-31"}).json()) == 1
    assert client.put("/api/measurements/2026-10-31", json={"waist_cm": 10}).status_code == 422
    assert client.delete("/api/measurements/2026-10-31").status_code == 204
    assert client.delete("/api/measurements/2026-10-31").status_code == 404


# --- 통계 ------------------------------------------------------------------------
def _log(client, day, sets):
    w = client.post("/api/workouts", json={"date": day}).json()
    for s in sets:
        assert client.post(f"/api/workouts/{w['id']}/sets", json=s).status_code == 201


def test_muscle_volume_counts_primary_and_secondary(client):
    lp, lat = ex_id(client, "레그프레스"), ex_id(client, "랫풀다운")
    _log(
        client,
        "2026-10-26",
        [{"exercise_id": lp, "weight_kg": 130, "reps": 12}] * 3
        + [{"exercise_id": lat, "weight_kg": 55, "reps": 12}] * 2,
    )
    vol = {
        v["muscle"]: v
        for v in client.get("/api/stats/muscles", params={"from": "2026-10-26", "to": "2026-11-01"}).json()
    }
    assert vol["quads"]["primary_sets"] == 3 and vol["quads"]["sets"] == 3
    assert vol["glutes"]["secondary_sets"] == 3 and vol["glutes"]["sets"] == 1.5
    assert vol["lats"]["sets"] == 2 and vol["biceps"]["sets"] == 1
    assert vol["chest"]["sets"] == 0 and vol["quads"]["target_sets"] == 10
    assert client.get("/api/stats/muscles", params={"from": "2026-11-01", "to": "2026-10-01"}).status_code == 422


def test_personal_records(client):
    lp = ex_id(client, "레그프레스")
    _log(
        client,
        "2026-10-26",
        [{"exercise_id": lp, "weight_kg": 130, "reps": 12}, {"exercise_id": lp, "weight_kg": 140, "reps": 5}],
    )
    pr = next(p for p in client.get("/api/stats/prs").json() if p["name"] == "레그프레스")
    assert pr["best_weight_kg"] == 140 and pr["best_weight_reps"] == 5 and pr["best_weight_date"] == "2026-10-26"
    # 130×12 → 182, 140×5 → 163.3: 추정 1RM 은 130×12 쪽
    assert pr["e1rm_kg"] == 182.0


def test_side_balance(client):
    single = ex_id(client, "싱글 레그프레스")
    _log(
        client,
        "2026-10-26",
        [
            {"exercise_id": single, "weight_kg": 60, "reps": 12, "side": "L"},
            {"exercise_id": single, "weight_kg": 50, "reps": 12, "side": "R"},
        ],
    )
    row = next(
        b
        for b in client.get("/api/stats/balance", params={"from": "2026-10-01", "to": "2026-10-31"}).json()
        if b["name"] == "싱글 레그프레스"
    )
    assert row["weaker"] == "R" and row["diff_pct"] == 20.0
    assert row["left"]["top_weight_kg"] == 60 and row["right"]["sets"] == 1
