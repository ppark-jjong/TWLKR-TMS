import pandas as pd
import mysql.connector
import os
import numpy as np

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
MYSQL_USER = "teckwahkr-db"
MYSQL_PASSWORD = "Teckwah0206@"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3307
MYSQL_DATABASE = "delivery_system"
MYSQL_CHARSET = "utf8mb4"


def get_mysql_connection():
    """MySQL 연결을 생성하는 함수"""
    try:
        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=MYSQL_PORT,
            charset=MYSQL_CHARSET,
        )
        return connection
    except mysql.connector.Error as e:
        print(f"데이터베이스 연결 오류: {e}")
        return None


def execute_query(query, params=None, fetch=False, many=False):
    """
    MySQL 쿼리를 실행하는 함수.
    - fetch=True인 경우 결과 목록을 반환
    - many=True인 경우 executemany()를 사용하여 여러 행을 실행
    """
    connection = get_mysql_connection()
    if not connection:
        return None
    try:
        cursor = connection.cursor()
        if many:
            cursor.executemany(query, params)
        else:
            cursor.execute(query, params)
        if fetch:
            result = cursor.fetchall()
            return result
        connection.commit()
        return cursor.rowcount
    except mysql.connector.Error as e:
        print(f"쿼리 실행 오류: {e}")
        return None
    finally:
        cursor.close()
        connection.close()


def import_csv_to_postal_code(file_path):
    """
    CSV 파일을 읽고 postal_code 테이블에 삽입
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # NaN 값을 처리 (문자열 컬럼 -> "", 숫자형 컬럼 -> 0)
    df.fillna({"city": "", "county": "", "district": ""}, inplace=True)

    # postal_code 값을 5자리로 변환 (4자리면 앞에 '0' 추가)
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 데이터베이스 삽입 쿼리 생성
    insert_query = """
    INSERT INTO postal_code (postal_code, city, county, district)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        city = VALUES(city), 
        county = VALUES(county), 
        district = VALUES(district)
    """

    # DataFrame을 리스트로 변환하여 삽입
    values = df[["postal_code", "city", "county", "district"]].values.tolist()
    result = execute_query(insert_query, values, many=True)

    if result is not None:
        print(f"postal_code 테이블에 총 {len(df)}개의 데이터가 삽입되었습니다.")
    else:
        print(f"postal_code 테이블 데이터 삽입 실패")


if __name__ == "__main__":
    file_path = "./postal_code.csv"
    if os.path.exists(file_path):
        print(f"{file_path} -> postal_code 테이블에 삽입 중...")
        import_csv_to_postal_code(file_path)
    else:
        print(f"파일이 존재하지 않음: {file_path}")
