import pandas as pd
import mysql.connector
from mysql.connector import Error

# 1. 엑셀 데이터 읽기
file_path = "../data/driver.xlsx"  # 드라이버 데이터를 담은 엑셀 파일 경로
sheet_name = "Sheet1"  # 필요한 시트 이름
data = pd.read_excel(file_path, sheet_name=sheet_name)

# 2. driver_id 컬럼 제거
if "driver_id" in data.columns:
    data = data.drop(columns=["driver_id"])

# 3. MySQL 연결 정보 설정
host = "localhost"
user = "root"
password = "1234"
database = "delivery_system"

try:
    # 4. MySQL 연결
    connection = mysql.connector.connect(
        host=host, user=user, password=password, database=database
    )
    if connection.is_connected():
        print("MySQL 연결 성공")

        # 5. 데이터베이스 테이블의 컬럼 이름 가져오기
        cursor = connection.cursor()
        table_name = "driver"

        # 데이터베이스 컬럼 가져오기 (driver_id 제외)
        db_columns = ["driver_name", "driver_contact", "driver_remark"]

        # 컬럼 이름 로그 출력
        print(f"엑셀 컬럼: {list(data.columns)}")
        print(f"데이터베이스 컬럼 (driver 제외): {db_columns}")

        # 컬럼 이름 일치 여부 확인
        if set(data.columns) != set(db_columns):
            print("경고: 엑셀 컬럼과 데이터베이스 컬럼이 일치하지 않습니다.")
        else:
            print("엑셀 컬럼과 데이터베이스 컬럼이 일치합니다.")

        # 6. 데이터프레임을 MySQL 테이블로 삽입
        columns = ", ".join(db_columns)
        for _, row in data.iterrows():
            values = ", ".join(
                [f"'{value}'" if pd.notna(value) else "NULL" for value in row]
            )
            sql = f"INSERT INTO {table_name} ({columns}) VALUES ({values})"
            cursor.execute(sql)

        connection.commit()
        print(f"{len(data)}개의 레코드가 성공적으로 삽입되었습니다.")

except Error as e:
    print(f"오류 발생: {e}")

finally:
    # MySQL 연결 종료
    if connection.is_connected():
        cursor.close()
        connection.close()
        print("MySQL 연결 종료")
