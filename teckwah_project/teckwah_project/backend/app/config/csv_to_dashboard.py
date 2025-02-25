#!/usr/bin/env python3
import os
import math
import pandas as pd
import mysql.connector
import numpy as np

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


def execute_query(query, params=None, fetch=False, many=False):
    connection = get_mysql_connection()
    if not connection:
        return None
    try:
        cursor = connection.cursor()
        if many:
            successful_inserts = 0
            for i, row in enumerate(params):
                try:
                    cursor.execute(query, row)
                    successful_inserts += 1
                except mysql.connector.Error as e:
                    print(f"쿼리 실행 오류 (행 {i}): {e} | 데이터: {row}")
            connection.commit()
            return successful_inserts
        else:
            cursor.execute(query, params)
            if fetch:
                result = cursor.fetchall()
                return result
            connection.commit()
            return cursor.rowcount
    except mysql.connector.Error as e:
        print(f"쿼리 실행 오류: {e} | 파라미터: {params}")
        return None
    finally:
        cursor.close()
        connection.close()


def import_dashboard_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(current_dir, "..", "data", "dashboard.csv")

    try:
        df = pd.read_csv(csv_file, encoding="utf-8", low_memory=False)
    except Exception as e:
        print(f"CSV 파일 읽기 실패: {e}")
        return

    expected_columns = [
        "order_no",
        "type",
        "department",
        "warehouse",
        "sla",
        "eta",
        "depart_time",
        "complete_time",
        "postal_code",
        "address",
        "customer",
        "contact",
        "remark",
        "driver_name",
        "driver_contact",
    ]
    try:
        df = df[expected_columns]
    except Exception as e:
        print(f"필요한 컬럼이 존재하지 않습니다: {e}")
        return

    # 1) 날짜/시간 컬럼을 datetime으로 변환
    for col in ["eta", "depart_time", "complete_time"]:
        df[col] = pd.to_datetime(df[col], errors="coerce")

    # 2) 숫자형 변환
    df["order_no"] = pd.to_numeric(df["order_no"], errors="coerce")

    # 3) 우편번호 5자리 처리
    df["postal_code"] = df["postal_code"].astype(str).str.zfill(5)

    # 4) NaN/NaT -> None 치환
    df = df.where(pd.notnull(df), None)

    # 5) 날짜/시간 컬럼을 문자열로 변환
    def datetime_to_str(x):
        if x is None or pd.isnull(x):
            return None
        return x.strftime("%Y-%m-%d %H:%M:%S")

    for col in ["eta", "depart_time", "complete_time"]:
        df[col] = df[col].apply(datetime_to_str)

    # 6) 나머지 컬럼에서 'nan' 같은 문자열 치환
    #    (모든 컬럼에 대해 일괄 적용해도 됨)
    for col in df.columns:
        # 일단 전부 문자열로 캐스팅 (None은 그대로 둠)
        df[col] = df[col].apply(lambda x: str(x).strip() if x is not None else None)
        # 그 후 'nan', 'NaN', '' 등을 None으로
        df[col] = df[col].replace(["nan", "NaN", ""], None)

    # 7) 파라미터 바인딩 전, 최종적으로 float('nan')을 잡아낼 수도 있음
    #    (위 단계에서 대부분 처리되겠지만 혹시 몰라서)
    data_tuples = df.to_numpy().tolist()
    cleaned_data = []
    for row in data_tuples:
        new_row = []
        for val in row:
            # float 타입 NaN 체크
            if isinstance(val, float) and math.isnan(val):
                new_row.append(None)
            # 문자열 'nan' 체크 (소문자, 대문자 등)
            elif isinstance(val, str) and val.lower() == "nan":
                new_row.append(None)
            else:
                new_row.append(val)
        cleaned_data.append(tuple(new_row))

    insert_query = """
    INSERT INTO dashboard (
        order_no, type, department, warehouse, sla, eta,
        depart_time, complete_time, postal_code, address,
        customer, contact, remark, driver_name, driver_contact
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    result = execute_query(insert_query, params=cleaned_data, many=True)

    if result is not None:
        print(f"총 {result}개의 행이 삽입되었습니다.")
    else:
        print("데이터 삽입 실패")


if __name__ == "__main__":
    import_dashboard_data()
