#!/usr/bin/env python3
import pandas as pd
import mysql.connector

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
MYSQL_USER = "root"  # MySQL 사용자 이름
MYSQL_PASSWORD = "1234"  # MySQL 비밀번호
MYSQL_HOST = "localhost"  # 로컬 MySQL 서버 주소
MYSQL_PORT = 3306  # MySQL 포트 (보통 3306)
MYSQL_DATABASE = "delivery_system"  # 데이터베이스 이름
MYSQL_CHARSET = "utf8mb4"  # 문자셋

# Cloud SQL Proxy를 사용할 경우, 아래 주석을 참고하세요.
# MYSQL_HOST = '127.0.0.1'
# 그리고 mysql.connector.connect() 호출 시 unix_socket 인자를 사용합니다.
# 예:
# connection = mysql.connector.connect(
#     host='127.0.0.1',
#     user=MYSQL_USER,
#     password=MYSQL_PASSWORD,
#     database=MYSQL_DATABASE,
#     unix_socket='/cloudsql/your-instance-connection-name',
#     charset=MYSQL_CHARSET
# )


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
            # Cloud SQL Proxy 사용 시 아래 주석 해제:
            # host='127.0.0.1',
            # unix_socket='/cloudsql/your-instance-connection-name',
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


def import_postal_codes(file_path="app/data/postal_code.csv"):
    """CSV 파일에서 우편번호 데이터를 읽어와 데이터베이스에 삽입"""
    try:
        # CSV 데이터 읽기 (한글 인코딩 고려)
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # 필요한 컬럼만 유지
    expected_columns = ["postal_code", "duration_time", "distance", "district", "city"]
    try:
        df = df[expected_columns]
    except Exception as e:
        print(f"필요한 컬럼이 존재하지 않습니다: {e}")
        return

    # 데이터 타입 변환
    df["postal_code"] = (
        df["postal_code"].astype(str).str.zfill(5)
    )  # 4자리인 경우 앞에 0 추가
    df["duration_time"] = df["duration_time"].fillna(0).astype(int)
    df["distance"] = df["distance"].fillna(0).astype(int)

    # 데이터베이스 삽입 쿼리
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

    if result is not None:
        print(f"총 {len(df)}개의 행이 삽입되었습니다.")
    else:
        print("데이터 삽입 실패")


if __name__ == "__main__":
    import_postal_codes()
