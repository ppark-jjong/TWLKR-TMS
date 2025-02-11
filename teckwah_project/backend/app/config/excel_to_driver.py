# backend/app/config/excel_to_driver.py
import pandas as pd
from .database import execute_query


def import_drivers(file_path="/app/data/driver.xlsx", sheet_name="Sheet1"):
    """드라이버 데이터 임포트"""
    try:
        # 엑셀 데이터 읽기
        data = pd.read_excel(file_path, sheet_name=sheet_name)

        # driver_id 컬럼 제거
        if "driver_id" in data.columns:
            data = data.drop(columns=["driver_id"])

        # 데이터베이스 컬럼 정의
        db_columns = ["driver_name", "driver_contact", "driver_remark"]

        # 컬럼 이름 검증
        if not all(col in data.columns for col in db_columns):
            print("경고: 엑셀 컬럼과 데이터베이스 컬럼이 일치하지 않습니다.")
            print(f"엑셀 컬럼: {list(data.columns)}")
            print(f"데이터베이스 컬럼: {db_columns}")
            return False

        # NaN 값 처리
        data = data[db_columns].fillna(
            {"driver_name": "", "driver_contact": "", "driver_remark": ""}
        )

        # INSERT 쿼리 준비
        columns = ", ".join(db_columns)
        placeholders = ", ".join(["%s"] * len(db_columns))
        insert_query = f"""
        INSERT INTO driver ({columns}) 
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE
            driver_name = VALUES(driver_name),
            driver_contact = VALUES(driver_contact),
            driver_remark = VALUES(driver_remark)
        """

        # DataFrame을 리스트로 변환
        values = data.values.tolist()
        result = execute_query(insert_query, values, many=True)

        if result:
            print(f"{len(data)}개의 레코드가 성공적으로 삽입되었습니다.")
            return True
        else:
            print("데이터 삽입 실패")
            return False

    except Exception as e:
        print(f"드라이버 데이터 임포트 중 오류 발생: {str(e)}")
        return False


if __name__ == "__main__":
    import_drivers()
