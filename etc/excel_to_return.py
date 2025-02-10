import pandas as pd
import mysql.connector
from mysql.connector import Error

# 1. 엑셀 데이터 읽기
file_path = "../data/return_mock_unique_updated.xlsx"  # 엑셀 파일 경로
sheet_name = "report"
data = pd.read_excel(file_path, sheet_name=sheet_name)

# 2. MySQL 연결 정보 설정
host = "localhost"
user = "root"
password = "1234"
database = "delivery_system"

try:
    # 3. MySQL 연결
    connection = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )
    if connection.is_connected():
        print("MySQL 연결 성공")

        # 4. 데이터베이스 테이블의 컬럼 이름 가져오기
        cursor = connection.cursor()
        table_name = "`return`"  # 테이블 이름을 역따옴표로 감싸기

        # SQL 쿼리로 테이블의 컬럼 이름 가져오기
        cursor.execute(f"""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '{database}' AND TABLE_NAME = 'return';
        """)
        db_columns = [column[0] for column in cursor.fetchall()]  # 데이터베이스 컬럼 리스트
        excel_columns = list(data.columns)  # 엑셀의 컬럼 리스트

        # 컬럼 이름 로그 출력
        print(f"엑셀 컬럼: {excel_columns}")
        print(f"데이터베이스 컬럼: {db_columns}")

        # 컬럼 이름 일치 여부 확인
        if set(excel_columns) != set(db_columns):
            print("경고: 엑셀 컬럼과 데이터베이스 컬럼이 일치하지 않습니다.")

            # 일치하지 않는 컬럼 확인
            missing_in_excel = set(db_columns) - set(excel_columns)
            missing_in_db = set(excel_columns) - set(db_columns)

            if missing_in_excel:
                print(f"엑셀에 없는 데이터베이스 컬럼: {missing_in_excel}")
            if missing_in_db:
                print(f"데이터베이스에 없는 엑셀 컬럼: {missing_in_db}")
        else:
            print("엑셀 컬럼과 데이터베이스 컬럼이 일치합니다.")

            # 5. 데이터프레임을 MySQL 테이블로 삽입
        # 컬럼 이름에 역따옴표 추가
        columns = ", ".join([f"`{col}`" for col in excel_columns])

        # 데이터를 한 줄씩 삽입
        for _, row in data.iterrows():
            values = ", ".join([f"'{value}'" if pd.notna(value) else "NULL" for value in row])
            sql = f"INSERT INTO {table_name} ({columns}) VALUES ({values})"
            cursor.execute(sql)

        # 커밋
        connection.commit()
        print(f"{cursor.rowcount}개의 레코드가 성공적으로 삽입되었습니다.")

except Error as e:
    print(f"오류 발생: {e}")

finally:
    # MySQL 연결 종료
    if connection.is_connected():
        cursor.close()
        connection.close()
        print("MySQL 연결 종료")
