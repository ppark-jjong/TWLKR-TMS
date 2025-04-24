#!/usr/bin/env python3
import argparse
import bcrypt
import mysql.connector
import sys

# ============================
# 데이터베이스 설정 (로컬 MySQL)
# ============================
# MYSQL_USER = "teckwahkr-db"
# MYSQL_PASSWORD = "Teckwah0206@"
# MYSQL_HOST = "localhost"
# MYSQL_PORT = 3307
# MYSQL_DATABASE = "delivery_system"
# MYSQL_CHARSET = "utf8mb4"
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


def check_password(user_id, input_password):
    query = "SELECT user_password FROM user WHERE user_id = %s"
    result = execute_query(query, (user_id,), fetch=True)
    if not result:
        print("사용자를 찾을 수 없습니다.")
        return False

    stored_hash = result[0][0].encode("utf-8")
    input_bytes = input_password.encode("utf-8")
    if bcrypt.checkpw(input_bytes, stored_hash):
        print("비밀번호가 일치합니다.")
        return True
    else:
        print("비밀번호가 일치하지 않습니다.")
        return False


def update_password(user_id, old_password, new_password):
    if not check_password(user_id, old_password):
        print("기존 비밀번호 확인 실패")
        return

    new_hashed = hash_password(new_password)
    query = "UPDATE user SET user_password = %s WHERE user_id = %s"
    result = execute_query(query, (new_hashed, user_id))
    if result:
        print(f"'{user_id}'의 비밀번호가 성공적으로 변경되었습니다.")
    else:
        print("비밀번호 변경 실패")


def interactive_cli():
    print("대화형 사용자 관리 CLI에 오신 것을 환영합니다.")
    print("명령: create, delete, list, check-pw, update-pw, exit")
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
        elif command == "check-pw":
            user_id = input("사용자 ID: ").strip()
            password = input("비밀번호: ").strip()
            check_password(user_id, password)
        elif command == "update-pw":
            user_id = input("사용자 ID: ").strip()
            old_pw = input("기존 비밀번호: ").strip()
            new_pw = input("새 비밀번호: ").strip()
            update_password(user_id, old_pw, new_pw)
        else:
            print(
                "알 수 없는 명령입니다. 사용 가능한 명령: create, delete, list, check-pw, update-pw, exit"
            )


def parse_arguments():
    parser = argparse.ArgumentParser(description="사용자 관리 CLI")
    parser.add_argument(
        "action", nargs="?", choices=["create", "delete", "list"], help="수행할 작업"
    )
    parser.add_argument("--user-id", help="사용자 ID")
    parser.add_argument("--password", help="비밀번호")
    parser.add_argument("--department", choices=["CS", "HES", "LENOVO"], help="부서")
    parser.add_argument("--role", choices=["admin", "user"], help="사용자 권한")
    return parser.parse_args()


def main():
    args = parse_arguments()
    if not args.action:
        interactive_cli()
        return
    if args.action == "create":
        if not all([args.user_id, args.password, args.department, args.role]):
            print("모든 인자(user-id, password, department, role)를 입력하세요")
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
