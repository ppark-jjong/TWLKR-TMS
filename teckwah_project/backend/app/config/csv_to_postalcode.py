import pandas as pd
import mysql.connector
import os

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
MYSQL_USER = "root"  # MySQL 사용자 이름
MYSQL_PASSWORD = "1234"  # MySQL 비밀번호
MYSQL_HOST = "localhost"  # 로컬 MySQL 서버 주소
MYSQL_PORT = 3306  # MySQL 포트 (보통 3306)
MYSQL_DATABASE = "delivery_system"  # 데이터베이스 이름
MYSQL_CHARSET = "utf8mb4"  # 문자셋


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


def import_csv_to_table(file_path, table_name, column_mapping):
    """
    CSV 파일을 읽고 데이터베이스 테이블에 삽입
    - file_path: CSV 파일 경로
    - table_name: 삽입할 테이블 이름
    - column_mapping: CSV 컬럼 -> DB 컬럼 매핑 (dict 형식)
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # 컬럼 매핑 적용
    df = df[list(column_mapping.keys())]
    df.rename(columns=column_mapping, inplace=True)
    df = df.where(pd.notna(df), None)

    # 데이터베이스 삽입 쿼리 생성
    columns = ", ".join(df.columns)
    placeholders = ", ".join(["%s"] * len(df.columns))
    insert_query = f"""
    INSERT INTO {table_name} ({columns})
    VALUES ({placeholders})
    ON DUPLICATE KEY UPDATE 
    """ + ", ".join(
        [f"{col} = VALUES({col})" for col in df.columns]
    )

    # DataFrame을 리스트로 변환하여 삽입
    values = df.values.tolist()
    result = execute_query(insert_query, values, many=True)

    if result is not None:
        print(f"{table_name} 테이블에 총 {len(df)}개의 행이 삽입되었습니다.")
    else:
        print(f"{table_name} 테이블 데이터 삽입 실패")


if __name__ == "__main__":
    # CSV 파일과 테이블 매핑
    csv_table_mappings = {
        "backend/app/data/postal_code.csv": {
            "table": "postal_code",
            "mapping": {
                "postal_code": "postal_code",
                "city": "city",
                "county": "county",
                "district": "district",
            },
        },
        "backend/app/data/postal_code_detail.csv": {
            "table": "postal_code_detail",
            "mapping": {
                "postal_code": "postal_code",
                "warehouse": "warehouse",
                "distance": "distance",
                "duration_time": "duration_time",
            },
        },
    }

    for file_path, table_info in csv_table_mappings.items():
        if os.path.exists(file_path):
            print(f"{file_path} -> {table_info['table']} 테이블에 삽입 중...")
            import_csv_to_table(file_path, table_info["table"], table_info["mapping"])
        else:
            print(f"파일이 존재하지 않음: {file_path}")
