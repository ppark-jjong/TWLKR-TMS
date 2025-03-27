#!/usr/bin/env python3
import os
import math
import pandas as pd
import mysql.connector
import numpy as np
from datetime import datetime

MYSQL_USER = "root"
MYSQL_PASSWORD = "1234"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
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
    csv_file = os.path.join(current_dir, ".", "dashboard.csv")

    try:
        df = pd.read_csv(csv_file, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    # CSV 파일에 필요한 컬럼 리스트 (remark 컬럼은 dashboard_remark로 별도 처리)
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
        "remark",  # remark는 dashboard_remark.content 로 사용
        "driver_name",
        "driver_contact",
    ]
    try:
        df = df[expected_columns]
    except Exception as e:
        print(f"필요한 컬럼이 존재하지 않습니다: {e}")
        return

    # 1) 날짜/시간 컬럼들을 datetime으로 변환 (create_time 포함)
    for col in ["eta", "create_time", "depart_time", "complete_time"]:
        df[col] = pd.to_datetime(df[col], errors="coerce")

    # 만약 create_time이 NaT인 경우 현재 시각으로 채움
    df["create_time"] = df["create_time"].fillna(pd.Timestamp.now())

    # 2) order_no 컬럼은 문자열로 처리
    df["order_no"] = df["order_no"].astype(str).str.strip()

    # 3) 우편번호 5자리 처리
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 4) NaN/NaT를 None으로 치환
    df = df.where(pd.notnull(df), None)

    # 5) 날짜/시간 컬럼을 문자열로 변환
    def datetime_to_str(x):
        if x is None or pd.isnull(x):
            return None
        return x.strftime("%Y-%m-%d %H:%M:%S")

    for col in ["eta", "create_time", "depart_time", "complete_time"]:
        df[col] = df[col].apply(datetime_to_str)

    # 6) 모든 컬럼의 'nan' 문자열을 None으로 치환
    for col in df.columns:
        df[col] = df[col].apply(lambda x: str(x).strip() if x is not None else None)
        df[col] = df[col].replace(["nan", "NaN", ""], None)

    # 데이터 연결 및 row-by-row 삽입 (dashboard, dashboard_remark)
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
    dashboard_remark_insert_query = """
    INSERT INTO dashboard_remark (
        dashboard_id, content, created_by
    )
    VALUES (%s, %s, %s)
    """
    successful_dashboard = 0
    successful_remark = 0

    try:
        cursor = connection.cursor()
        for idx, row in df.iterrows():
            # dashboard 테이블 삽입용 데이터 (remark 제외)
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
                dashboard_id = cursor.lastrowid
                successful_dashboard += 1
            except mysql.connector.Error as e:
                print(f"Dashboard 삽입 오류 (행 {idx}): {e} | 데이터: {dashboard_data}")
                connection.rollback()
                continue  # 다음 행으로 진행

            # dashboard_remark 처리 (remark가 존재하면 삽입)
            remark_content = row["remark"]
            if remark_content is not None and remark_content.strip() != "":
                remark_data = (dashboard_id, remark_content, "AdminMaster")  # 고정값
                try:
                    cursor.execute(dashboard_remark_insert_query, remark_data)
                    successful_remark += 1
                except mysql.connector.Error as e:
                    print(
                        f"Dashboard_remark 삽입 오류 (행 {idx}): {e} | 데이터: {remark_data}"
                    )
                    connection.rollback()
                    continue
        connection.commit()
    finally:
        cursor.close()
        connection.close()

    print(f"Dashboard 테이블에 {successful_dashboard}건 삽입되었습니다.")
    print(f"Dashboard_remark 테이블에 {successful_remark}건 삽입되었습니다.")


if __name__ == "__main__":
    import_dashboard_data()
