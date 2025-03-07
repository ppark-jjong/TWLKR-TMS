import pandas as pd
import mysql.connector
import os
import numpy as np

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
MYSQL_USER = "root"
MYSQL_PASSWORD = "1234"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
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


def import_csv_to_table(file_path, table_name):
    """
    CSV 파일을 읽어 지정한 테이블에 데이터를 삽입하는 함수.
    테이블에는 postal_code, distance, duration_time 컬럼이 존재해야 합니다.
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # NaN 처리: 문자열 컬럼은 ""로, 숫자형 컬럼은 0으로 처리
    df.fillna({"warehouse": ""}, inplace=True)
    df["distance"] = df["distance"].fillna(0).astype(int)
    df["duration_time"] = df["duration_time"].fillna(0).astype(int)

    # postal_code 값을 5자리 문자열로 변환 (예: '1234' -> '01234')
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 필요한 컬럼 선택 (CSV 파일이 해당 지역 전용이므로 warehouse 컬럼은 무시)
    df_table = df[["postal_code", "distance", "duration_time"]]

    # DB 삽입 쿼리 생성 (해당 테이블에 삽입)
    insert_query = f"""
    INSERT INTO {table_name} (postal_code, distance, duration_time)
    VALUES (%s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        distance = VALUES(distance), 
        duration_time = VALUES(duration_time)
    """

    # DataFrame 데이터를 리스트로 변환하여 삽입
    values = df_table.values.tolist()
    result = execute_query(insert_query, values, many=True)

    if result is not None:
        print(f"{table_name} 테이블에 총 {len(df_table)}개의 데이터가 삽입되었습니다.")
    else:
        print(f"{table_name} 테이블 데이터 삽입 실패")


if __name__ == "__main__":
    # 파일 경로와 삽입할 테이블을 아래에서 선택하여 사용하세요.
    file_path = "backend/app/data/postal_seoul.csv"
    table_name = "postal_seoul"

    # 다른 지역의 경우, 아래 주석을 해제하여 사용하세요.
    # file_path = "backend/app/data/postal_busan.csv"
    # table_name = "postal_busan"

    # file_path = "backend/app/data/postal_daejeon.csv"
    # table_name = "postal_daejeon"

    # file_path = "backend/app/data/postal_gwangju.csv"
    # table_name = "postal_gwangju"

    if os.path.exists(file_path):
        print(f"{file_path} -> {table_name} 테이블에 삽입 중...")
        import_csv_to_table(file_path, table_name)
    else:
        print(f"파일이 존재하지 않음: {file_path}")
