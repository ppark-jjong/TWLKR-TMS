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


def import_csv_to_postal_code_detail_debug(file_path):
    """
    CSV를 읽은 후, postal_code_detail 테이블에 '한 행씩' 삽입하면서
    에러가 나는 행을 식별하고자 할 때 사용한다.
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # NaN 값을 처리 (문자열 컬럼 -> "", 숫자형 컬럼 -> 0)
    df.fillna({"warehouse": ""}, inplace=True)
    df["distance"] = df["distance"].fillna(0).astype(int)
    df["duration_time"] = df["duration_time"].fillna(0).astype(int)

    # postal_code 값을 5자리로 변환 (4자리면 앞에 '0' 추가)
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 데이터베이스 삽입 쿼리 (단건 삽입 버전)
    insert_query = """
    INSERT INTO postal_code_detail (postal_code, warehouse, distance, duration_time)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        distance = VALUES(distance), 
        duration_time = VALUES(duration_time)
    """

    total_count = len(df)
    success_count = 0
    error_count = 0

    # 한 행씩 처리
    for idx, row in df.iterrows():
        record = (
            row["postal_code"],
            row["warehouse"],
            int(row["distance"]),
            int(row["duration_time"]),
        )
        connection = get_mysql_connection()
        if not connection:
            print("DB 연결 실패로 작업을 중단합니다.")
            return
        try:
            with connection.cursor() as cursor:
                cursor.execute(insert_query, record)
            connection.commit()
            success_count += 1
        except mysql.connector.Error as e:
            error_count += 1
            print(f"[오류] {idx}번째 행에서 문제 발생:")
            print(f"    - 삽입 시도 데이터: {record}")
            print(f"    - 에러 메시지: {e}")
        finally:
            connection.close()

    print(f"총 {total_count}건 중 성공: {success_count}건, 실패: {error_count}건")


if __name__ == "__main__":
    file_path = "./postal_code_detail.csv"
    if os.path.exists(file_path):
        print(f"{file_path} -> postal_code_detail 테이블에 (디버그 모드) 삽입 중...")
        import_csv_to_postal_code_detail_debug(file_path)
    else:
        print(f"파일이 존재하지 않음: {file_path}")
