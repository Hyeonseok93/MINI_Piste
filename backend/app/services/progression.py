"""무게 추천 규칙. DB에 의존하지 않는 순수 함수로 두어 단위 테스트한다."""

from dataclasses import dataclass
from enum import StrEnum
from functools import partial


class Action(StrEnum):
    start = "start"  # 무게 찾기 결과로 시작
    increase = "increase"
    keep = "keep"
    decrease = "decrease"
    unknown = "unknown"  # 기록 없음


@dataclass(frozen=True)
class LoggedSet:
    weight_kg: float
    reps: int
    kind: str = "work"
    side: str | None = None  # 'L' / 'R' (한쪽씩 하는 종목)


@dataclass(frozen=True)
class Recommendation:
    action: Action
    weight_kg: float | None
    last_weight_kg: float | None
    reason: str


def recommend_next(
    last_sets: list[LoggedSet],
    *,
    planned_sets: int,
    rep_min: int,
    rep_max: int,
    increment_kg: float,
    assisted: bool = False,
) -> Recommendation:
    """한쪽씩 하는 종목은 좌우를 따로 계산하고 약한 쪽(더 가벼운 추천)에 맞춘다.

    플랜 규칙: "약한 쪽부터 시작하고 횟수는 약한 쪽에 맞춘다".
    """
    one = partial(
        _recommend_one,
        planned_sets=planned_sets,
        rep_min=rep_min,
        rep_max=rep_max,
        increment_kg=increment_kg,
        assisted=assisted,
    )
    sides = sorted({s.side for s in last_sets if s.side})
    if not sides:
        return one(last_sets)

    per_side = {side: one([s for s in last_sets if s.side == side]) for side in sides}
    weights = {k: r.weight_kg for k, r in per_side.items() if r.weight_kg is not None}
    if not weights:
        return next(iter(per_side.values()))
    # 보조 머신은 보조 무게가 클수록 약한 쪽
    pick = max(weights, key=weights.__getitem__) if assisted else min(weights, key=weights.__getitem__)
    rec = per_side[pick]
    label = "왼쪽" if pick == "L" else "오른쪽"
    return Recommendation(rec.action, rec.weight_kg, rec.last_weight_kg, f"{label}(약한 쪽) 기준 · {rec.reason}")


def _recommend_one(
    last_sets: list[LoggedSet],
    *,
    planned_sets: int,
    rep_min: int,
    rep_max: int,
    increment_kg: float,
    assisted: bool = False,
) -> Recommendation:
    """가장 최근 세션의 세트로 다음 무게를 정한다 (이중 점진법).

    assisted=True (어시스트 풀업 등)는 보조 무게라서 '어렵게' = 무게를 줄이는 방향이다.
    """
    harder, easier = (-increment_kg, increment_kg) if assisted else (increment_kg, -increment_kg)
    up_text, down_text = ("보조 줄임", "보조 늘림") if assisted else ("올림", "내림")
    if not last_sets:
        return Recommendation(Action.unknown, None, None, "기록 없음 · 시작 무게 찾기부터")

    work = [s for s in last_sets if s.kind == "work"]
    if not work:
        finds = [s for s in last_sets if s.kind == "find"]
        if finds:
            w = finds[-1].weight_kg
            return Recommendation(Action.start, w, w, f"무게 찾기 결과 {_kg(w)}로 시작")
        return Recommendation(Action.unknown, None, None, "본세트 기록 없음")

    # 가장 많이 쓴(=마지막) 무게 기준. 세션 중 무게를 바꿨다면 마지막 무게를 본다.
    weight = work[-1].weight_kg
    at_weight = [s for s in work if s.weight_kg == weight]

    if any(s.reps < rep_min - 2 for s in at_weight):
        new = max(weight + easier, 0)
        return Recommendation(
            Action.decrease, new, weight, f"{rep_min - 2}회 미만 세트 있음 → {_kg(new)}로 {down_text}"
        )

    if len(at_weight) >= planned_sets and all(s.reps >= rep_max for s in at_weight):
        new = max(weight + harder, 0)
        return Recommendation(
            Action.increase, new, weight, f"{len(at_weight)}세트 모두 {rep_max}회 달성 → {_kg(new)}로 {up_text}"
        )

    best = max(s.reps for s in at_weight)
    return Recommendation(
        Action.keep, weight, weight, f"{_kg(weight)} 유지 · 모든 세트 {rep_max}회 채우면 올림 (최고 {best}회)"
    )


class FinderVerdict(StrEnum):
    up2 = "up2"
    up1 = "up1"
    confirm = "confirm"
    confirm_heavy = "confirm_heavy"
    down1 = "down1"


FINDER_TEXT = {
    FinderVerdict.up2: "너무 쉬움 → 무게 2단계 올리기",
    FinderVerdict.up1: "조금 쉬움 → 무게 1단계 올리기",
    FinderVerdict.confirm: "이 무게로 확정 · 메모",
    FinderVerdict.confirm_heavy: "확정 · 다만 무거운 편이라 다음엔 유지",
    FinderVerdict.down1: "무거움 → 무게 1단계 내리기",
}


@dataclass(frozen=True)
class FinderChoice:
    """무게 찾기 화면의 버튼 하나: 12회 후 '몇 개 더 할 수 있었나'."""

    label: str
    completed: bool
    rir: int | None


FINDER_CHOICES = [
    FinderChoice("못 채움", False, None),
    FinderChoice("0~1개", True, 1),
    FinderChoice("2~3개", True, 2),
    FinderChoice("4개", True, 4),
    FinderChoice("5개+", True, 5),
]

FINDER_STEPS = {
    FinderVerdict.up2: 2,
    FinderVerdict.up1: 1,
    FinderVerdict.confirm: 0,
    FinderVerdict.confirm_heavy: 0,
    FinderVerdict.down1: -1,
}


def weight_finder(*, completed: bool, rir: int | None) -> FinderVerdict:
    """시작 무게 찾기: 12회 후 '몇 개 더 할 수 있었나'로 다음 세트를 정한다.

    원문표는 3~4개(+1)와 2~3개(확정)가 3에서 겹친다. 목표 강도(2~3회 남김)에 맞춰 3은 확정.
    """
    if not completed:
        return FinderVerdict.down1
    if rir is None:
        raise ValueError("12회를 채웠다면 rir(더 할 수 있었던 개수)가 필요하다")
    if rir >= 5:
        return FinderVerdict.up2
    if rir == 4:
        return FinderVerdict.up1
    if rir >= 2:
        return FinderVerdict.confirm
    return FinderVerdict.confirm_heavy


def _kg(w: float) -> str:
    return f"{w:g}kg"
