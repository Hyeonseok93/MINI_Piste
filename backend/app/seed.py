"""헬스_스케줄.md 기반 초기 데이터. 종목이 하나도 없을 때만 넣는다.

사용: uv run python -m app.seed
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import (
    Category,
    DayKind,
    Equipment,
    Exercise,
    Phase,
    PhaseDay,
    Routine,
    RoutineItem,
    SetKind,
    SetLog,
    Workout,
)

S, C = Category.strength, Category.core
PIN, PLATE, SMITH, BW, ASSIST, BAR = (
    Equipment.pin,
    Equipment.plate,
    Equipment.smith,
    Equipment.bodyweight,
    Equipment.assisted,
    Equipment.barbell,
)

# name, category, equipment, increment_kg, unilateral, alternative, setup_note, cue
EXERCISES = [
    ("레그프레스", S, PLATE, 10, False, "핵스쿼트 머신", "원판식 45° 레그프레스 (빨간 프레임). 증량은 양쪽 5kg씩",
     "발은 발판 가운데 어깨너비, 무릎은 발끝 방향. 엉덩이가 뜨기 전까지만 내리고 무릎을 잠그지 않는다"),
    ("체스트프레스 머신", S, PLATE, 5, False, "스미스머신 벤치프레스", "MASTER PRO 원판식 라잉 체스트프레스. 증량은 양쪽 2.5kg씩",
     "손잡이가 가슴 중간 높이. 어깨는 뒤로 내리고 가슴을 편 채로 민다"),
    ("랫풀다운", S, PIN, 5, False, "어시스트 풀업 머신", None,
     "몸을 살짝 젖히고 바를 쇄골 쪽으로. 팔꿈치를 옆구리로 내린다는 느낌. 목 뒤로 당기지 않는다"),
    ("백 익스텐션 (45°)", S, BW, 2.5, False, "라잉 레그컬 머신", "무게는 원판을 안고 하는 추가 중량 (맨몸=0)",
     "패드는 골반뼈 바로 아래. 엉덩이를 조여 일직선까지만. 허리를 꺾지 않는다"),
    ("머신 로우", S, PIN, 5, False, "랫풀다운 언더그립 (손바닥이 나를 보게)", None,
     "가슴을 패드에 붙인 채 팔꿈치를 뒤로. 어깨를 으쓱 올리지 않는다"),
    ("플랭크", C, BW, 0, False, "무릎 대고 플랭크", None, "엉덩이가 처지거나 솟지 않게 일직선"),
    ("스미스머신 스쿼트", S, SMITH, 5, False, "핵스쿼트 머신 / 레그프레스", None,
     "발을 바보다 반 발 앞에. 엉덩이를 뒤로 빼며 허벅지가 바닥과 평행할 때까지"),
    ("싱글 레그프레스", S, PLATE, 5, True, None, "약한 다리부터. 좌우 무게 차이 기록",
     "한 다리씩. 횟수는 약한 쪽에 맞춘다"),
    ("숄더프레스 머신", S, PIN, 5, False, None, None, "등을 패드에 붙이고 손잡이는 어깨 높이에서 출발. 허리가 뜨면 무게를 줄인다"),
    ("하이로우", S, PIN, 5, False, "랫풀다운 언더그립", None, "가슴을 패드에 붙인 채 팔꿈치를 뒤로"),
    ("힙 쓰러스트 머신", S, PIN, 5, False, "맨몸 글루트 브릿지", None, "턱을 당기고 엉덩이를 끝까지 조인다. 허리로 들지 않는다"),
    ("펙덱", S, PIN, 5, False, None, None, "팔꿈치를 살짝 굽혀 고정하고 가슴으로 모은다"),
    ("데드버그", C, BW, 0, False, None, None, "허리를 바닥에 붙인 채 반대 팔·다리를 뻗는다"),
    ("바이셉 컬 머신", S, PIN, 2.5, False, None, None, None),
    ("바벨 숄더프레스", S, BAR, 2.5, False, "숄더프레스 머신", None,
     "바는 쇄골 위에서 출발, 팔꿈치를 살짝 앞으로. 허리를 뒤로 꺾지 않는다"),
    ("레그 익스텐션", S, PIN, 5, False, None, None, "무릎 관절이 회전축과 일직선이 되게 의자를 맞춘다"),
    ("어시스트 풀업 머신", S, ASSIST, 5, False, "랫풀다운", "보조 무게: 숫자가 작을수록 어렵다", None),
    ("인클라인 체스트프레스 머신", S, PIN, 5, False, None, None, None),
    ("리어델트 머신", S, PIN, 2.5, False, None, "펙덱 머신 반대로 앉아서", "팔이 아니라 어깨 뒤로 모은다"),
    ("라잉 레그컬", S, PIN, 5, False, None, None, "무릎 관절이 회전축과 일직선이 되게 의자를 맞춘다"),
    ("카프레이즈 머신", S, PIN, 5, False, None, None, None),
    ("한쪽 체스트프레스", S, PLATE, 2.5, True, None, "아이소래터럴 머신이 있으면", "약한 쪽부터"),
    ("한 팔 랫풀다운", S, PIN, 2.5, True, None, None, "약한 쪽부터"),
    ("싱글 레그컬", S, PIN, 2.5, True, None, None, "약한 쪽부터"),
    ("사이드 플랭크", C, BW, 0, True, None, None, None),
]

# routine → [(exercise, sets, rep_min, rep_max, duration_sec)]
ROUTINES = {
    "전신 A": ("Phase 1 · 레그프레스·체스트·랫풀다운 중심", [
        ("레그프레스", 3, 10, 12, None),
        ("체스트프레스 머신", 3, 10, 12, None),
        ("랫풀다운", 3, 10, 12, None),
        ("바벨 숄더프레스", 3, 12, 12, None),
        ("바이셉 컬 머신", 3, 12, 12, None),
        ("플랭크", 3, None, None, 30),
    ]),
    "전신 B": ("Phase 1 · 스쿼트·숄더·힙 중심", [
        ("스미스머신 스쿼트", 3, 10, 10, None),
        ("싱글 레그프레스", 2, 10, 10, None),
        ("숄더프레스 머신", 3, 10, 12, None),
        ("하이로우", 3, 10, 12, None),
        ("힙 쓰러스트 머신", 3, 12, 12, None),
        ("펙덱", 3, 12, 12, None),
        ("데드버그", 3, 10, 10, None),
    ]),
    "상체 1": ("가슴·등 중심", [
        ("체스트프레스 머신", 3, 10, 12, None),
        ("랫풀다운", 3, 10, 12, None),
        ("바이셉 컬 머신", 3, 10, 12, None),
        ("한쪽 체스트프레스", 2, 10, 12, None),
    ]),
    "하체 1": ("스쿼트 중심", [
        ("스미스머신 스쿼트", 3, 8, 10, None),
        ("레그프레스", 3, 10, 12, None),
        ("레그 익스텐션", 3, 12, 15, None),
        ("싱글 레그프레스", 2, 10, 12, None),
    ]),
    "상체 2": ("어깨·등 중심", [
        ("숄더프레스 머신", 3, 10, 12, None),
        ("어시스트 풀업 머신", 3, 8, 10, None),
        ("인클라인 체스트프레스 머신", 3, 10, 12, None),
        ("리어델트 머신", 3, 12, 15, None),
        ("한 팔 랫풀다운", 2, 10, 12, None),
    ]),
    "하체 2": ("힙힌지 중심", [
        ("힙 쓰러스트 머신", 3, 10, 12, None),
        ("라잉 레그컬", 3, 10, 12, None),
        ("카프레이즈 머신", 3, 12, 15, None),
        ("싱글 레그컬", 2, 10, 12, None),
        ("사이드 플랭크", 2, None, None, 30),
    ]),
}

# (weekday, kind, label, routine, alt_routine, cardio_minutes)
# 운동 요일: 월·화·수·목·일 (금·토 휴식, 2026-10-19 변경)
# 1주차: 금요일(10/16)에 무게 찾기를 했으므로 월요일 전신 A부터
WEEK1 = [
    (0, DayKind.strength, "전신 + 유산소 20분", "전신 A", None, 20),
    (1, DayKind.cardio, "유산소 40분 (경사 걷기/자전거)", None, None, 40),
    (2, DayKind.strength, "전신 + 유산소 20분", "전신 B", None, 20),
    (3, DayKind.cardio, "유산소 40분 + 코어 10분", None, None, 40),
    (4, DayKind.rest, "휴식", None, None, None),
    (5, DayKind.rest, "휴식", None, None, None),
    (6, DayKind.strength, "전신 + 유산소 20분", "전신 A", None, 20),
]

# 2~4주차: 일·화·목 근력, 월·수 유산소. 주마다 B-A-B ↔ A-B-A 로 끊김 없이 교대
PHASE1_WEEK = [
    (0, DayKind.cardio, "유산소 40분", None, None, 40),
    (1, DayKind.strength, "전신 + 유산소 20분", "전신 B", "전신 A", 20),
    (2, DayKind.cardio, "유산소 40분 + 코어 10분", None, None, 40),
    (3, DayKind.strength, "전신 + 유산소 20분", "전신 A", "전신 B", 20),
    (4, DayKind.rest, "휴식", None, None, None),
    (5, DayKind.rest, "휴식 (가능하면 야외 활동)", None, None, None),
    (6, DayKind.strength, "전신 + 유산소 20분", "전신 B", "전신 A", 20),
]

SPLIT_WEEK = [
    (0, DayKind.strength, "하체 1 + 유산소 15분", "하체 1", None, 15),
    (1, DayKind.cardio, "유산소 40분", None, None, 40),
    (2, DayKind.strength, "상체 2 + 유산소 15분", "상체 2", None, 15),
    (3, DayKind.strength, "하체 2 + 유산소 15분", "하체 2", None, 15),
    (4, DayKind.rest, "휴식", None, None, None),
    (5, DayKind.rest, "휴식 (가능하면 야외 활동)", None, None, None),
    (6, DayKind.strength, "상체 1 + 유산소 15분", "상체 1", None, 15),
]

PHASES = [
    ("🌱 복귀 1주차", date(2026, 10, 19), date(2026, 10, 25), WEEK1),
    ("🌱 복귀 적응기", date(2026, 10, 26), date(2026, 11, 15), PHASE1_WEEK),
    ("🔨 빌드업", date(2026, 11, 16), date(2027, 2, 28), SPLIT_WEEK),
    ("🛌 다이어트 브레이크", date(2027, 3, 1), date(2027, 3, 31), SPLIT_WEEK),
    ("🔥 감량 가속", date(2027, 4, 1), date(2027, 6, 30), SPLIT_WEEK),
    ("💪 근력 집중", date(2027, 7, 1), date(2027, 8, 31), SPLIT_WEEK),
    ("🎯 점검·재설정", date(2027, 9, 1), date(2027, 10, 31), SPLIT_WEEK),
]

# 2026-10-16 (금) 시작 무게 찾기 결과 (사진 기록)
FIND_DAY = date(2026, 10, 16)
FIND_RESULTS = [("레그프레스", 120), ("체스트프레스 머신", 40), ("랫풀다운", 50)]


def seed(db: Session) -> bool:
    if db.scalar(select(Exercise.id).limit(1)) is not None:
        return False

    ex = {}
    for name, cat, eq, inc, uni, alt, setup, cue in EXERCISES:
        ex[name] = Exercise(
            name=name, category=cat, equipment=eq, increment_kg=inc,
            unilateral=uni, alternative=alt, setup_note=setup, cue=cue,
        )
    db.add_all(ex.values())

    routines = {}
    for rname, (desc, items) in ROUTINES.items():
        r = Routine(name=rname, description=desc)
        for pos, (ename, sets, rmin, rmax, dur) in enumerate(items, start=1):
            r.items.append(RoutineItem(
                exercise=ex[ename], position=pos, sets=sets, rep_min=rmin, rep_max=rmax, duration_sec=dur,
            ))
        routines[rname] = r
    db.add_all(routines.values())

    for pname, start, end, week in PHASES:
        p = Phase(name=pname, start_date=start, end_date=end)
        for wd, kind, label, rn, alt, cardio in week:
            p.days.append(PhaseDay(
                weekday=wd, kind=kind, label=label, cardio_minutes=cardio,
                routine=routines.get(rn) if rn else None,
                alt_routine=routines.get(alt) if alt else None,
            ))
        db.add(p)

    w = Workout(
        date=FIND_DAY, title="시작 무게 찾기", cardio_minutes=15,
        notes="자전거 워밍업 10분 → 무게 찾기 25분 → 경사 걷기 15분 → 스트레칭 5분",
    )
    for ename, kg in FIND_RESULTS:
        w.sets.append(SetLog(exercise=ex[ename], set_no=1, kind=SetKind.find, weight_kg=kg, reps=12))
    db.add(w)

    db.commit()
    return True


if __name__ == "__main__":
    with SessionLocal() as session:
        print("seeded" if seed(session) else "skip: 이미 데이터가 있습니다")
