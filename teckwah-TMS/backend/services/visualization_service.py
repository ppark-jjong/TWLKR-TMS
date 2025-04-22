"""
시각화 관련 비즈니스 로직
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from backend.models.dashboard import Dashboard
from backend.schemas.dashboard_schema import OrderStatus
from backend.models.visualization import (
    TimeStatEntry,
    DepartmentStatEntry,
    DepartmentStatusCounts,
    VisualizationData,
    VisualizationResponse,
)
from backend.utils.logger import logger
from backend.utils.date_utils import get_date_range
from pydantic import ValidationError

SERVICE_NAME = "VisualizationService"


def get_visualization_stats(
    db: Session,
    start_date: Optional[str],
    end_date: Optional[str],
    visualization_type: Optional[str] = "time_based",
) -> Dict[str, Any]:
    """
    시각화용 통계 데이터 조회 (라우트에서 Pydantic 변환) + 상세 로깅
    """
    logger.debug(f"서비스 get_visualization_stats 시작")
    logger.debug(
        f"  입력 파라미터: start_date='{start_date}', end_date='{end_date}', type='{visualization_type}'"
    )

    # --- [로그 3] DB 조회 전 날짜 범위 계산 및 로깅 ---
    try:
        start_datetime, end_datetime = get_date_range(start_date, end_date)
        logger.debug(f"  DB 조회를 위한 날짜 범위: {start_datetime} ~ {end_datetime}")
    except ValueError as date_err:
        logger.error(
            f"날짜 변환 오류: start='{start_date}', end='{end_date}'. 오류: {date_err}"
        )
        return {
            "success": False,
            "message": f"날짜 형식 오류: {date_err}",
            "data": None,
        }
    # -------------------------------------------------

    # --- DB 조회 및 집계 로직 시작 ---
    try:
        # 기본 쿼리 (날짜 범위 필터링)
        base_query = db.query(Dashboard).filter(
            Dashboard.eta >= start_datetime, Dashboard.eta <= end_datetime
        )
        logger.debug(
            f"  DB 기본 쿼리 조건: ETA between {start_datetime} and {end_datetime}"
        )

        visualization_data_payload = {
            "visualization_type": visualization_type,
            "start_date": start_datetime,
            "end_date": end_datetime,
            "time_stats": None,
            "department_stats": None,
        }

        if visualization_type == "time_based":
            logger.debug("  시간 기반 통계 조회 시작")
            # 시간대별 통계 집계
            time_stats_query = (
                base_query.with_entities(
                    cast(Dashboard.eta, Date).label("date"),  # 날짜만 추출
                    Dashboard.status,
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .group_by(cast(Dashboard.eta, Date), Dashboard.status)
                .order_by(cast(Dashboard.eta, Date).asc())
            )
            raw_time_stats = time_stats_query.all()
            logger.db(f"    시간 기반 통계 DB 조회 결과: {len(raw_time_stats)} 건")

            # --- [로그 4] DB 로우 데이터 로깅 (Time Stats) ---
            time_stats_dict = {}
            for record in raw_time_stats:
                date_str = record.date.strftime("%Y-%m-%d")
                status = record.status
                count = record.count
                logger.debug(
                    f"      Raw DB Record (Time): date={date_str}, status={status}, count={count}"
                )  # 로우 레코드 로깅
                if date_str not in time_stats_dict:
                    time_stats_dict[date_str] = {
                        "date": record.date,  # datetime.date 객체 유지
                        "status_counts": {s.value: 0 for s in OrderStatus},
                    }
                time_stats_dict[date_str]["status_counts"][status] = count
            # ------------------------------------------------

            # --- [로그 5] Pydantic 모델 변환 (TimeStatEntry) ---
            time_stats_list = []
            logger.debug(
                f"TimeStatEntry Pydantic 변환 시작 - 대상 {len(time_stats_dict)} 일자"
            )
            for date_str, data in time_stats_dict.items():
                try:
                    # 변환 전 데이터 로깅 (요약)
                    logger.debug(
                        f"    TimeStatEntry 변환 시도: date={date_str}, counts={data['status_counts']}"
                    )
                    entry = TimeStatEntry(
                        date=data["date"], status_counts=data["status_counts"]
                    )
                    time_stats_list.append(entry)
                    logger.debug(
                        f"      TimeStatEntry 변환 성공: date={entry.date}, counts={entry.status_counts}"
                    )
                except ValidationError as ve:
                    logger.error(
                        f"    TimeStatEntry 유효성 검사 실패: date={date_str}, 오류={ve.errors()}",
                        exc_info=True,
                    )
                    logger.error(f"      실패한 데이터: {data}")
                    # 오류 발생 시 해당 날짜 데이터 제외 또는 전체 실패 처리 (여기서는 제외)
                    continue
                except Exception as e:
                    logger.error(
                        f"    TimeStatEntry 변환 중 일반 오류: date={date_str}, 오류={e}",
                        exc_info=True,
                    )
                    continue  # 오류 발생 시 해당 날짜 데이터 제외
            logger.debug(f"  TimeStatEntry 변환 완료: 최종 {len(time_stats_list)} 건")
            # -----------------------------------------------
            visualization_data_payload["time_stats"] = time_stats_list

        elif visualization_type == "department_based":
            logger.debug("  부서 기반 통계 조회 시작")
            # 부서별 통계 집계
            dept_stats_query = (
                base_query.with_entities(
                    Dashboard.department,
                    Dashboard.status,
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .group_by(Dashboard.department, Dashboard.status)
                .order_by(Dashboard.department.asc())
            )
            raw_dept_stats = dept_stats_query.all()
            logger.db(f"    부서 기반 통계 DB 조회 결과: {len(raw_dept_stats)} 건")

            # --- [로그 4] DB 로우 데이터 로깅 (Dept Stats) ---
            dept_stats_dict = {}
            for record in raw_dept_stats:
                department = record.department
                status = record.status
                count = record.count
                logger.debug(
                    f"      Raw DB Record (Dept): dept={department}, status={status}, count={count}"
                )  # 로우 레코드 로깅
                if department not in dept_stats_dict:
                    dept_stats_dict[department] = {
                        "department": department,
                        "total_count": 0,
                        "status_counts": {s.value: 0 for s in OrderStatus},
                    }
                dept_stats_dict[department]["status_counts"][status] = count
                dept_stats_dict[department]["total_count"] += count
            # -----------------------------------------------

            # --- [로그 5] Pydantic 모델 변환 (DepartmentStatEntry) ---
            dept_stats_list = []
            logger.debug(
                f"DepartmentStatEntry Pydantic 변환 시작 - 대상 {len(dept_stats_dict)} 부서"
            )
            for dept_name, data in dept_stats_dict.items():
                try:
                    # 변환 전 데이터 로깅 (요약)
                    logger.debug(
                        f"    DepartmentStatEntry 변환 시도: dept={dept_name}, total={data['total_count']}, counts={data['status_counts']}"
                    )
                    entry = DepartmentStatEntry(
                        department=data["department"],
                        total_count=data["total_count"],
                        # status_counts 는 내부 모델 DepartmentStatusCounts 로 자동 변환됨
                    )
                    # 내부 모델 DepartmentStatusCounts도 명시적으로 검증/변환 필요 시
                    status_counts_model = DepartmentStatusCounts.model_validate(
                        data["status_counts"]
                    )
                    entry.status_counts = status_counts_model

                    dept_stats_list.append(entry)
                    logger.debug(
                        f"      DepartmentStatEntry 변환 성공: dept={entry.department}, total={entry.total_count}, counts={entry.status_counts.dict()}"
                    )
                except ValidationError as ve:
                    logger.error(
                        f"    DepartmentStatEntry/StatusCounts 유효성 검사 실패: dept={dept_name}, 오류={ve.errors()}",
                        exc_info=True,
                    )
                    logger.error(f"      실패한 데이터: {data}")
                    continue  # 오류 발생 시 해당 부서 데이터 제외
                except Exception as e:
                    logger.error(
                        f"    DepartmentStatEntry 변환 중 일반 오류: dept={dept_name}, 오류={e}",
                        exc_info=True,
                    )
                    continue  # 오류 발생 시 해당 부서 데이터 제외
            logger.debug(
                f"  DepartmentStatEntry 변환 완료: 최종 {len(dept_stats_list)} 건"
            )
            # -----------------------------------------------------
            visualization_data_payload["department_stats"] = dept_stats_list

        else:
            logger.error(f"지원되지 않는 시각화 유형: {visualization_type}")
            return {
                "success": False,
                "message": "지원되지 않는 시각화 유형입니다.",
                "data": None,
            }

        # --- [로그 6] 최종 서비스 반환 딕셔너리 생성 및 로깅 ---
        # VisualizationData 모델을 사용하여 내부 데이터 구조 검증 및 생성
        try:
            logger.debug("VisualizationData 모델 생성 시도 (payload 사용)")
            visualization_data_obj = VisualizationData.model_validate(
                visualization_data_payload
            )
            logger.debug("  VisualizationData 생성 성공")
            # 모델 객체를 다시 dict로 변환하여 data 필드에 할당 (라우터에서 최종 변환)
            final_data_dict = visualization_data_obj.dict(by_alias=True)

            final_response_dict = {
                "success": True,
                "message": "시각화 통계 조회 성공",
                "data": final_data_dict,  # camelCase dict
            }
            # 최종 반환 딕셔너리 로깅 (요약)
            log_summary = {
                k: type(v) if k == "data" else v for k, v in final_response_dict.items()
            }
            if "data" in final_response_dict and isinstance(
                final_response_dict["data"], dict
            ):
                log_summary["data_summary"] = {
                    "visualizationType": final_response_dict["data"].get(
                        "visualizationType"
                    ),
                    "timeStats_len": len(
                        final_response_dict["data"].get("timeStats", []) or []
                    ),
                    "departmentStats_len": len(
                        final_response_dict["data"].get("departmentStats", []) or []
                    ),
                }
            logger.debug(
                f"서비스 get_visualization_stats 최종 반환 딕셔너리 (요약): {log_summary}"
            )
            return final_response_dict

        except ValidationError as ve:
            logger.error(
                f"VisualizationData 내부 모델 생성 실패: {ve.errors()}", exc_info=True
            )
            logger.error(
                f"  실패 시점 payload: {visualization_data_payload}"
            )  # payload 로깅
            return {
                "success": False,
                "message": f"통계 데이터 구조 생성 실패: {ve.errors()}",
                "data": None,
            }
        except Exception as final_exc:
            logger.error(f"최종 응답 데이터 생성 중 오류: {final_exc}", exc_info=True)
            return {
                "success": False,
                "message": "통계 응답 데이터 생성 오류",
                "data": None,
            }
        # -----------------------------------------------------

    except Exception as e:
        logger.error(f"시각화 통계 처리 중 오류 발생: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"시각화 통계 처리 오류: {e}",
            "data": None,
        }


def get_time_based_stats(
    db: Session, start_datetime: datetime, end_datetime: datetime
) -> List[Dict[str, Any]]:
    """
    시간대별 접수량 통계 (create_time 기준)
    09~18시(1시간 단위), 18~20, 20~00, 00~09 구간별 주문 건수

    Returns:
        시간대별 통계 데이터
    """
    logger.debug(f"get_time_based_stats 시작: {start_datetime} ~ {end_datetime}")
    # 시간대 정의
    time_ranges = []

    # 09~18시 (1시간 단위)
    for hour in range(9, 18):
        time_ranges.append(
            {
                "name": f"{hour:02d}:00~{hour+1:02d}:00",
                "start_hour": hour,
                "end_hour": hour + 1,
            }
        )

    # 추가 시간대
    time_ranges.extend(
        [
            {"name": "18:00~20:00", "start_hour": 18, "end_hour": 20},
            {"name": "20:00~00:00", "start_hour": 20, "end_hour": 24},
            {"name": "00:00~09:00", "start_hour": 0, "end_hour": 9},
        ]
    )

    # 결과 데이터 초기화
    departments = ["CS", "HES", "LENOVO"]
    results = []

    # 각 시간대별 데이터 조회
    for i, time_range in enumerate(time_ranges):
        entry_dict = {TimeStatEntry.__fields__["time_range"].alias: time_range["name"]}
        logger.debug(f"  Time Range [{i}]: {time_range['name']}")
        for dept in departments:
            try:
                # 해당 시간대, 해당 부서의 주문 수 조회
                count = (
                    db.query(func.count(Dashboard.dashboard_id))
                    .filter(
                        Dashboard.create_time >= start_datetime,
                        Dashboard.create_time <= end_datetime,
                        Dashboard.department == dept,
                        # 시간대 필터링
                        func.extract("hour", Dashboard.create_time)
                        >= time_range["start_hour"],
                        func.extract("hour", Dashboard.create_time)
                        < time_range["end_hour"],
                    )
                    .scalar()
                    or 0
                )
                logger.debug(f"    DB Query: Dept={dept}, Count={count}")
                entry_dict[dept] = count  # CS, HES, LENOVO는 alias 없음
            except Exception as e:
                logger.error(
                    f"    DB Query 실패: Dept={dept}, Range={time_range['name']}, 오류={e}",
                    exc_info=True,
                )
                entry_dict[dept] = 0  # 오류 시 0으로 처리
        logger.debug(f"  생성된 entry_dict [{i}]: {entry_dict}")
        results.append(entry_dict)
    logger.debug(f"get_time_based_stats 완료: 총 {len(results)}개 시간대")
    return results


def get_department_based_stats(
    db: Session, start_datetime: datetime, end_datetime: datetime
) -> List[Dict[str, Any]]:
    """
    부서별 상태 현황 통계 (ETA 기준)

    Returns:
        부서별 상태 통계 데이터
    """
    logger.debug(f"get_department_based_stats 시작: {start_datetime} ~ {end_datetime}")
    # 부서 목록
    departments = ["CS", "HES", "LENOVO"]

    # 결과 데이터 초기화
    results = []

    # 각 부서별 데이터 조회
    for i, dept in enumerate(departments):
        logger.debug(f"  Department [{i}]: {dept}")
        try:
            # 상태별 카운트 조회
            status_counts_query = (
                db.query(
                    Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(
                    Dashboard.eta >= start_datetime,
                    Dashboard.eta <= end_datetime,
                    Dashboard.department == dept,
                )
                .group_by(Dashboard.status)
                .all()
            )
            logger.debug(f"    DB Query 결과: {status_counts_query}")

            # DepartmentStatusCounts 구조에 맞는 Dict 생성
            status_data_dict = {
                field_name: 0 for field_name in DepartmentStatusCounts.__fields__
            }
            total_count = 0
            for status_name, count in status_counts_query:
                if status_name in status_data_dict:
                    status_data_dict[status_name] = count
                total_count += count
            logger.debug(
                f"    계산된 status_data_dict: {status_data_dict}, total_count: {total_count}"
            )

            # DepartmentStatEntry 구조에 맞는 Dict 생성 (camelCase 키 사용)
            entry_dict = {
                "department": dept,
                DepartmentStatEntry.__fields__["total_count"].alias: total_count,
                DepartmentStatEntry.__fields__["status_counts"].alias: status_data_dict,
            }
            logger.debug(f"  생성된 entry_dict [{i}]: {entry_dict}")
            results.append(entry_dict)
        except Exception as e:
            logger.error(
                f"    DB Query 또는 처리 실패: Dept={dept}, 오류={e}", exc_info=True
            )
            # 오류 발생 시 해당 부서 통계는 비워서 추가하거나 제외
            entry_dict = {
                "department": dept,
                DepartmentStatEntry.__fields__["total_count"].alias: 0,
                DepartmentStatEntry.__fields__["status_counts"].alias: {
                    fn: 0 for fn in DepartmentStatusCounts.__fields__
                },
            }
            results.append(entry_dict)
    logger.debug(f"get_department_based_stats 완료: 총 {len(results)}개 부서")
    return results
