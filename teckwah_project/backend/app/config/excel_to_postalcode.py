import pandas as pd
from .database import execute_query


def import_postal_codes(file_path="/app/data/postal_code.xlsx"):
    """우편번호 데이터 임포트"""
    # 엑셀 데이터 읽기
    df = pd.read_excel(file_path)

    # SQL 테이블 컬럼 확인 후 데이터 매핑
    expected_columns = ["postal_code", "duration_time", "distance", "district", "city"]
    df = df[expected_columns]  # 필요 컬럼만 유지

    # 데이터 타입 변환
    df["postal_code"] = df["postal_code"].astype(str)
    df["duration_time"] = df["duration_time"].fillna(0).astype(int)
    df["distance"] = df["distance"].fillna(0).astype(int)

    # 데이터베이스 삽입
    insert_query = """
    INSERT INTO postal_code (postal_code, duration_time, distance, district, city)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        duration_time = VALUES(duration_time),
        distance = VALUES(distance),
        district = VALUES(district),
        city = VALUES(city)
    """

    # DataFrame을 리스트로 변환
    values = df.values.tolist()
    result = execute_query(insert_query, values, many=True)

    if result:
        print(f"총 {len(df)}개의 행이 삽입되었습니다.")
    else:
        print("데이터 삽입 실패")


if __name__ == "__main__":
    import_postal_codes()
