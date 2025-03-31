#!/usr/bin/env python3
import argparse
import bcrypt
import mysql.connector
import sys

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
MYSQL_USER = "root"  # MySQL 사용자 이름
MYSQL_PASSWORD = "1234"  # MySQL 비밀번호
MYSQL_HOST = "localhost"  # 로컬 MySQL 서버 주소
MYSQL_PORT = 3306  # MySQL 포트 (보통 3306)
MYSQL_DATABASE = "delivery_system"  # 데이터베이스 이름
MYSQL_CHARSET = "utf8mb4"  # 문자셋

# Cloud SQL Proxy를 사용할 경우, 아래 주석된 설정을 참고하세요.
# MYSQL_HOST = '127.0.0.1'
# unix_socket='/cloudsql/your-instance-connection-name'


def get_mysql_connection():
    try:
        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=MYSQL_PORT,
            charset=MYSQL_CHARSET,
            # Cloud SQL Proxy 사용 시:
            # host='127.0.0.1',
            # unix_socket='/cloudsql/your-instance-connection-name',
        )
        return connection
    except mysql.connector.Error as e:
        print(f"데이터베이스 연결 오류: {e}")
        return None


def hash_password(password):
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def execute_query(query, params=None, fetch=False, many=False):
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


def create_user(user_id, password, department, role):
    hashed_password = hash_password(password)
    query = """
        INSERT INTO user (user_id, user_password, user_department, user_role)
        VALUES (%s, %s, %s, %s)
    """
    params = (user_id, hashed_password, department, role)
    result = execute_query(query, params)
    if result:
        print(f"사용자 '{user_id}' 생성 완료")
    else:
        print("사용자 생성 실패")


def delete_user(user_id):
    query = "DELETE FROM user WHERE user_id = %s"
    result = execute_query(query, (user_id,))
    if result:
        print(f"사용자 '{user_id}' 삭제 완료")
    else:
        print(f"사용자 '{user_id}'를 찾을 수 없습니다")


def list_users():
    query = "SELECT user_id, user_department, user_role FROM user"
    users = execute_query(query, fetch=True)
    if users:
        print("\n현재 등록된 사용자 목록:")
        print("USER ID\t\tDEPARTMENT\tROLE")
        print("-" * 50)
        for user in users:
            print(f"{user[0]}\t\t{user[1]}\t\t{user[2]}")
    else:
        print("등록된 사용자가 없습니다")


def interactive_cli():
    """대화형 CLI 모드"""
    print("대화형 사용자 관리 CLI에 오신 것을 환영합니다.")
    print("명령: create, delete, list, exit")
    while True:
        command = input("> ").strip().lower()
        if command == "exit":
            print("종료합니다.")
            break
        elif command == "create":
            user_id = input("사용자 ID: ").strip()
            password = input("비밀번호: ").strip()
            department = input("부서 (CS, HES, LENOVO): ").strip()
            role = input("역할 (admin, user): ").strip()
            create_user(user_id, password, department, role)
        elif command == "delete":
            user_id = input("삭제할 사용자 ID: ").strip()
            delete_user(user_id)
        elif command == "list":
            list_users()
        else:
            print("알 수 없는 명령입니다. 사용 가능한 명령: create, delete, list, exit")


def parse_arguments():
    parser = argparse.ArgumentParser(description="사용자 관리 CLI")
    parser.add_argument(
        "action",
        nargs="?",
        choices=["create", "delete", "list"],
        help="수행할 작업 (인자가 없으면 대화형 모드로 진입)",
    )
    parser.add_argument("--user-id", help="사용자 ID")
    parser.add_argument("--password", help="비밀번호")
    parser.add_argument("--department", choices=["CS", "HES", "LENOVO"], help="부서")
    parser.add_argument("--role", choices=["admin", "user"], help="사용자 권한")
    return parser.parse_args()


def main():
    args = parse_arguments()

    # 인자 없이 실행하면 대화형 모드로 진입
    if not args.action:
        interactive_cli()
        return

    # 커맨드라인 인자를 이용한 실행
    if args.action == "create":
        if not all([args.user_id, args.password, args.department, args.role]):
            print(
                "사용자 생성에 필요한 모든 인자(user-id, password, department, role)를 입력하세요"
            )
            return
        create_user(args.user_id, args.password, args.department, args.role)
    elif args.action == "delete":
        if not args.user_id:
            print("삭제할 사용자 ID를 입력하세요")
            return
        delete_user(args.user_id)
    elif args.action == "list":
        list_users()


if __name__ == "__main__":
    main()
