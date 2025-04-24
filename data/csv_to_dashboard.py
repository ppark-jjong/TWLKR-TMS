#!/usr/bin/env python3
import os
from datetime import datetime
import pandas as pd
import mysql.connector

# MySQL 연결 설정
MYSQL_USER = "teckwahkr-db"
MYSQL_PASSWORD = "Teckwah0206@"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3307
MYSQL_DATABASE = "delivery_system"
MYSQL_CHARSET = "utf8mb4"


def get_mysql_connection():
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


def import_dashboard_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(current_dir, "dashboard.csv")

    try:
        df = pd.read_csv(csv_file, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # 필요한 컬럼 리스트 (dashboard_remark 관련 컬럼 제거)
    expected_columns = [
        "order_no",
        "type",
        "status",
        "department",
        "warehouse",
        "sla",
        "eta",
        "create_time",
        "depart_time",
        "complete_time",
        "postal_code",
        "address",
        "customer",
        "contact",
        "driver_name",
        "driver_contact",
    ]
    try:
        df = df[expected_columns]
    except Exception as e:
        print(f"필요한 컬럼이 존재하지 않습니다: {e}")
        return

    # 날짜/시간 컬럼들을 datetime 형식으로 변환
    for col in ["eta", "create_time", "depart_time", "complete_time"]:
        df[col] = pd.to_datetime(df[col], errors="coerce")

    # create_time이 NaT인 경우 현재 시각으로 채움
    df["create_time"] = df["create_time"].fillna(pd.Timestamp.now())

    # order_no 컬럼을 문자열로 처리
    df["order_no"] = df["order_no"].astype(str).str.strip()

    # 우편번호를 5자리 문자열로 처리
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # NaN/NaT를 None으로 치환
    df = df.where(pd.notnull(df), None)

    # 날짜/시간을 문자열 포맷으로 변환하는 함수
    def datetime_to_str(x):
        if x is None or pd.isnull(x):
            return None
        return x.strftime("%Y-%m-%d %H:%M:%S")

    for col in ["eta", "create_time", "depart_time", "complete_time"]:
        df[col] = df[col].apply(datetime_to_str)

    # 모든 컬럼에서 'nan', 'NaN', 빈 문자열을 None으로 치환
    for col in df.columns:
        df[col] = df[col].apply(lambda x: str(x).strip() if x is not None else None)
        df[col] = df[col].replace(["nan", "NaN", ""], None)

    # MySQL 데이터베이스 연결
    connection = get_mysql_connection()
    if connection is None:
        print("DB 연결 실패")
        return

    dashboard_insert_query = """
    INSERT INTO dashboard (
        order_no, type, status, department, warehouse, sla, eta,
        create_time, depart_time, complete_time, postal_code, address,
        customer, contact, driver_name, driver_contact
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    successful_dashboard = 0

    try:
        cursor = connection.cursor()
        for idx, row in df.iterrows():
            dashboard_data = (
                row["order_no"],
                row["type"],
                row["status"],
                row["department"],
                row["warehouse"],
                row["sla"],
                row["eta"],
                row["create_time"],
                row["depart_time"],
                row["complete_time"],
                row["postal_code"],
                row["address"],
                row["customer"],
                row["contact"],
                row["driver_name"],
                row["driver_contact"],
            )
            try:
                cursor.execute(dashboard_insert_query, dashboard_data)
                successful_dashboard += 1
            except mysql.connector.Error as e:
                print(f"Dashboard 삽입 오류 (행 {idx}): {e} | 데이터: {dashboard_data}")
                connection.rollback()
                continue
        connection.commit()
    finally:
        cursor.close()
        connection.close()

    print(f"Dashboard 테이블에 {successful_dashboard}건 삽입되었습니다.")


if __name__ == "__main__":
    import_dashboard_data()
