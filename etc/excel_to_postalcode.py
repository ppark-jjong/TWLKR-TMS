import pandas as pd
import mysql.connector

# 엑셀 파일 경로
file_path = "../data/postal_code.xlsx"

# 엑셀 데이터 읽기
df = pd.read_excel(file_path)

# SQL 테이블 컬럼 확인 후 데이터 매핑
expected_columns = ["postal_code", "duration_time", "distance", "district", "city"]
df = df[expected_columns]  # 필요 컬럼만 유지

# 데이터 타입 변환
df["postal_code"] = df["postal_code"].astype(str)
df["duration_time"] = df["duration_time"].fillna(0).astype(int)
df["distance"] = df["distance"].fillna(0).astype(int)

# MySQL 연결 정보
db_config = {
    "user": "root",
    "password": "1234",
    "host": "localhost",
    "database": "delivery_system",
}

# 데이터베이스 연결 및 삽입
try:
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()

    insert_query = """
    INSERT INTO postal_code (postal_code, duration_time, distance, district, city)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        duration_time = VALUES(duration_time),
        distance = VALUES(distance),
        district = VALUES(district),
        city = VALUES(city)
    """

    for _, row in df.iterrows():
        cursor.execute(insert_query, tuple(row))

    connection.commit()
    print(f"총 {len(df)}개의 행이 삽입되었습니다.")

except mysql.connector.Error as err:
    print(f"에러: {err}")
finally:
    if connection.is_connected():
        cursor.close()
        connection.close()
        print("MySQL 연결이 종료되었습니다.")
