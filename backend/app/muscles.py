"""근육 부위 분류. 3D 몸 모델·근육별 훈련량 통계가 같은 이름을 쓴다."""

import enum


class Muscle(enum.StrEnum):
    chest = "chest"
    shoulders = "shoulders"
    biceps = "biceps"
    triceps = "triceps"
    lats = "lats"
    upper_back = "upper_back"
    lower_back = "lower_back"
    abs = "abs"
    obliques = "obliques"
    glutes = "glutes"
    quads = "quads"
    hamstrings = "hamstrings"
    calves = "calves"


class MuscleRole(enum.StrEnum):
    primary = "primary"  # 주동근: 세트 1개 = 1
    secondary = "secondary"  # 보조근: 세트 1개 = 0.5


ROLE_WEIGHT = {MuscleRole.primary: 1.0, MuscleRole.secondary: 0.5}

# (부위, 한글 이름, 몸 앞/뒤) — 몸 모델에서 어느 면에 보이는지
MUSCLE_INFO: dict[Muscle, tuple[str, str]] = {
    Muscle.chest: ("가슴", "front"),
    Muscle.shoulders: ("어깨", "front"),
    Muscle.biceps: ("이두", "front"),
    Muscle.triceps: ("삼두", "back"),
    Muscle.lats: ("광배", "back"),
    Muscle.upper_back: ("등 위쪽", "back"),
    Muscle.lower_back: ("허리", "back"),
    Muscle.abs: ("복근", "front"),
    Muscle.obliques: ("옆구리", "front"),
    Muscle.glutes: ("엉덩이", "back"),
    Muscle.quads: ("허벅지 앞", "front"),
    Muscle.hamstrings: ("허벅지 뒤", "back"),
    Muscle.calves: ("종아리", "back"),
}

# 주간 목표 세트 수 (근비대 일반 권장 10~20세트의 하한, 감량기라 보수적으로)
WEEKLY_TARGET_SETS = 10

P, S = MuscleRole.primary, MuscleRole.secondary
M = Muscle

# 기본 종목 → 근육 매핑 (시드용)
DEFAULT_MUSCLES: dict[str, list[tuple[Muscle, MuscleRole]]] = {
    "레그프레스": [(M.quads, P), (M.glutes, S), (M.hamstrings, S)],
    "체스트프레스 머신": [(M.chest, P), (M.triceps, S), (M.shoulders, S)],
    "랫풀다운": [(M.lats, P), (M.biceps, S), (M.upper_back, S)],
    "백 익스텐션 (45°)": [(M.lower_back, P), (M.glutes, S), (M.hamstrings, S)],
    "머신 로우": [(M.upper_back, P), (M.lats, S), (M.biceps, S)],
    "플랭크": [(M.abs, P), (M.obliques, S)],
    "스미스머신 스쿼트": [(M.quads, P), (M.glutes, P), (M.hamstrings, S), (M.lower_back, S)],
    "싱글 레그프레스": [(M.quads, P), (M.glutes, S)],
    "숄더프레스 머신": [(M.shoulders, P), (M.triceps, S)],
    "하이로우": [(M.upper_back, P), (M.lats, S), (M.biceps, S)],
    "랫풀다운 언더그립": [(M.lats, P), (M.biceps, S)],
    "랫풀다운 내로우": [(M.lats, P), (M.upper_back, S), (M.biceps, S)],
    "힙 쓰러스트 머신": [(M.glutes, P), (M.hamstrings, S)],
    "펙덱": [(M.chest, P), (M.shoulders, S)],
    "데드버그": [(M.abs, P)],
    "바이셉 컬 머신": [(M.biceps, P)],
    "바벨 숄더프레스": [(M.shoulders, P), (M.triceps, S), (M.abs, S)],
    "레그 익스텐션": [(M.quads, P)],
    "어시스트 풀업 머신": [(M.lats, P), (M.biceps, S), (M.upper_back, S)],
    "인클라인 체스트프레스 머신": [(M.chest, P), (M.shoulders, S), (M.triceps, S)],
    "리어델트 머신": [(M.shoulders, P), (M.upper_back, S)],
    "라잉 레그컬": [(M.hamstrings, P)],
    "카프레이즈 머신": [(M.calves, P)],
    "한쪽 체스트프레스": [(M.chest, P), (M.triceps, S)],
    "한 팔 랫풀다운": [(M.lats, P), (M.biceps, S)],
    "싱글 레그컬": [(M.hamstrings, P)],
    "사이드 플랭크": [(M.obliques, P), (M.abs, S)],
}


# 세트 사이 휴식 60초인 작은 종목 (나머지는 90초). 플랜 3장 '세트 사이 휴식'
SMALL_EXERCISES = {
    "펙덱",
    "바이셉 컬 머신",
    "레그 익스텐션",
    "리어델트 머신",
    "라잉 레그컬",
    "카프레이즈 머신",
    "싱글 레그컬",
    "백 익스텐션 (45°)",
    "플랭크",
    "데드버그",
    "사이드 플랭크",
}
