import pandas as pd
import mysql.connector
import os

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
      - fetch=True: 결과 목록을 반환
      - many=True: executemany()를 사용하여 여러 행을 실행
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


def import_csv_to_postal_code_detail(file_path):
    """
    CSV 파일을 읽어 postal_code_detail 테이블에 데이터를 삽입하는 함수.
    CSV 파일은 모든 웨어하우스 데이터를 포함해야 하며,
    postal_code, warehouse, distance, duration_time 컬럼이 존재해야 합니다.
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # NaN 값 처리: warehouse는 빈 문자열, 숫자형은 0으로 대체
    df.fillna({"warehouse": ""}, inplace=True)
    df["distance"] = df["distance"].fillna(0).astype(int)
    df["duration_time"] = df["duration_time"].fillna(0).astype(int)
    # postal_code 값을 5자리 문자열로 변환 (예: '1234' -> '01234')
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 필요한 컬럼 선택 (모든 웨어하우스 데이터를 포함)
    df_table = df[["postal_code", "warehouse", "distance", "duration_time"]]

    # DB 삽입 쿼리 (ON DUPLICATE KEY UPDATE 사용)
    insert_query = """
    INSERT INTO postal_code_detail (postal_code, warehouse, distance, duration_time)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        distance = VALUES(distance), 
        duration_time = VALUES(duration_time)
    """

    # DataFrame 데이터를 리스트로 변환하여 삽입
    values = df_table.values.tolist()
    result = execute_query(insert_query, values, many=True)

    if result is not None:
        print(
            f"총 {len(df_table)}개의 데이터가 postal_code_detail 테이블에 삽입되었습니다."
        )
    else:
        print("데이터 삽입 중 오류가 발생했습니다.")


if __name__ == "__main__":
    # 삽입할 CSV 파일 경로 (하나의 파일에 모든 웨어하우스 데이터가 포함되어야 함)
    file_path = "backend/app/data/postal_code_detail.csv"
    if os.path.exists(file_path):
        print(f"{file_path} -> postal_code_detail 테이블에 데이터 삽입 중...")
        import_csv_to_postal_code_detail(file_path)
    else:
        print(f"파일이 존재하지 않음: {file_path}")
