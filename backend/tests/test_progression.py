import pytest

from app.services.progression import Action, FinderVerdict, LoggedSet, recommend_next, weight_finder

RULE = dict(planned_sets=3, rep_min=10, rep_max=12, increment_kg=5)


def sets(weight, *reps, kind="work"):
    return [LoggedSet(weight, r, kind) for r in reps]


def test_no_history():
    rec = recommend_next([], **RULE)
    assert rec.action is Action.unknown and rec.weight_kg is None


def test_find_result_becomes_start_weight():
    rec = recommend_next(sets(50, 12, kind="find"), **RULE)
    assert rec.action is Action.start and rec.weight_kg == 50


def test_all_sets_at_top_increases():
    rec = recommend_next(sets(70, 12, 12, 12), **RULE)
    assert rec.action is Action.increase and rec.weight_kg == 75


def test_one_set_short_keeps():
    # 플랜 예시: 70kg 12/12/11 → 유지
    rec = recommend_next(sets(70, 12, 12, 11), **RULE)
    assert rec.action is Action.keep and rec.weight_kg == 70


def test_fewer_sets_than_planned_keeps():
    rec = recommend_next(sets(70, 12, 12), **RULE)
    assert rec.action is Action.keep


def test_far_below_range_decreases():
    rec = recommend_next(sets(70, 10, 9, 7), **RULE)
    assert rec.action is Action.decrease and rec.weight_kg == 65


def test_uses_last_weight_of_session():
    # 세션 중 무게를 올렸으면 마지막 무게 기준
    rec = recommend_next(sets(60, 12) + sets(65, 12, 12, 12), **RULE)
    assert rec.action is Action.increase and rec.weight_kg == 70


def test_warmup_sets_ignored():
    rec = recommend_next(sets(20, 15, kind="warmup") + sets(70, 12, 12, 12), **RULE)
    assert rec.weight_kg == 75


def test_unilateral_follows_weaker_side():
    sets_lr = [LoggedSet(60, 12, "work", "L")] * 2 + [LoggedSet(60, 10, "work", "R")] * 2
    rec = recommend_next(sets_lr, planned_sets=2, rep_min=10, rep_max=12, increment_kg=5)
    # 왼쪽은 다 채워서 65, 오른쪽은 유지 60 → 약한 쪽(60) 기준
    assert rec.action is Action.keep and rec.weight_kg == 60 and "오른쪽" in rec.reason


def test_unilateral_both_sides_done_increases():
    sets_lr = [LoggedSet(60, 12, "work", "L")] * 2 + [LoggedSet(60, 12, "work", "R")] * 2
    rec = recommend_next(sets_lr, planned_sets=2, rep_min=10, rep_max=12, increment_kg=5)
    assert rec.action is Action.increase and rec.weight_kg == 65


def test_assisted_machine_goes_down_when_progressing():
    rec = recommend_next(sets(30, 10, 10, 10), planned_sets=3, rep_min=8, rep_max=10, increment_kg=5, assisted=True)
    assert rec.action is Action.increase and rec.weight_kg == 25


@pytest.mark.parametrize(
    "completed,rir,expected",
    [
        (False, None, FinderVerdict.down1),
        (True, 6, FinderVerdict.up2),
        (True, 5, FinderVerdict.up2),
        (True, 4, FinderVerdict.up1),
        (True, 3, FinderVerdict.confirm),
        (True, 2, FinderVerdict.confirm),
        (True, 1, FinderVerdict.confirm_heavy),
        (True, 0, FinderVerdict.confirm_heavy),
    ],
)
def test_weight_finder(completed, rir, expected):
    assert weight_finder(completed=completed, rir=rir) is expected


def test_weight_finder_requires_rir():
    with pytest.raises(ValueError):
        weight_finder(completed=True, rir=None)
