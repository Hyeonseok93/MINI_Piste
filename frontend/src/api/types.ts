// 백엔드 OpenAPI 스키마에서 자동 생성된 타입(schema.ts)에 앱에서 쓰는 이름을 붙인다.
// 스키마가 바뀌면 `npm run gen:api` 로 schema.ts 를 다시 만들고, 여기 이름만 맞추면 된다.
import type { components } from './schema'

type S = components['schemas']

// --- 열거형 ---
export type Category = S['Category']
export type Equipment = S['Equipment']
export type DayKind = S['DayKind']
export type SetKind = S['SetKind']
export type Side = S['Side']
export type MuscleRole = S['MuscleRole']

// --- 종목·근육 ---
export type Exercise = S['ExerciseOut']
export type ExerciseCreate = S['ExerciseCreate']
export type ExerciseUpdate = S['ExerciseUpdate']
export type ExerciseMuscle = S['ExerciseMuscleIO']
export type MuscleInfo = S['MuscleInfo']
export type HistoryPoint = S['HistoryPoint']

// --- 루틴·플랜 ---
export type RoutineSummary = S['RoutineSummary']
export type RoutineItem = S['RoutineItemOut']
export type Routine = S['RoutineOut']
export type RoutineCreate = S['RoutineCreate']
export type RoutineUpdate = S['RoutineUpdate']
export type RoutineItemInput = S['RoutineItemIn']
export type PhaseDay = S['PhaseDayOut']
export type Phase = S['PhaseOut']
export type PhaseUpdate = S['PhaseUpdate']
export type PhaseDayInput = S['PhaseDayIn']

// --- 기록 ---
export type SetLog = S['SetOut']
export type SetInput = S['SetIn']
export type Workout = S['WorkoutOut']
export type WorkoutListItem = S['WorkoutListItem']
export type WorkoutInput = S['WorkoutIn']
export type WorkoutUpdate = S['WorkoutUpdate']
export type Recommendation = S['RecommendationOut']
export type Today = S['TodayOut']
export type DailyLogInput = S['DailyLogIn']
export type DailyLog = S['DailyLogOut']
export type FinderChoice = S['FinderChoiceOut']
export type FinderInput = S['FinderIn']
export type FinderResult = S['FinderOut']

// --- 프로필·홈 ---
export type ProfileInput = S['ProfileIn']
export type Profile = S['ProfileOut']
export type CalendarDay = S['CalendarDay']
export type PhaseSpan = S['PhaseSpan']
export type Dashboard = S['DashboardOut']

// --- 몸·분석 ---
export type MeasurementInput = S['MeasurementIn']
export type Measurement = S['MeasurementOut']
export type MuscleVolume = S['MuscleVolume']
export type PersonalRecord = S['PersonalRecord']
export type BalanceRow = S['BalanceRow']
