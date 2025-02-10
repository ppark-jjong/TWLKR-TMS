import argparse
import bcrypt
from .database import execute_query, get_mysql_connection


def hash_password(password):
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def create_user(user_id, password, department, role):
    """사용자 생성"""
    hashed_password = hash_password(password)
    query = """
        INSERT INTO users (user_id, user_password, user_department, user_role)
        VALUES (%s, %s, %s, %s)
    """
    params = (user_id, hashed_password, department, role)
    result = execute_query(query, params)

    if result:
        print(f"사용자 '{user_id}' 생성 완료")
    else:
        print("사용자 생성 실패")


def delete_user(user_id):
    """사용자 삭제"""
    query = "DELETE FROM users WHERE user_id = %s"
    result = execute_query(query, (user_id,))

    if result:
        print(f"사용자 '{user_id}' 삭제 완료")
    else:
        print(f"사용자 '{user_id}'를 찾을 수 없습니다")


def list_users():
    """사용자 목록 조회"""
    query = "SELECT user_id, user_department, user_role FROM users"
    users = execute_query(query, fetch=True)

    if users:
        print("\n현재 등록된 사용자 목록:")
        print("USER ID\t\tDEPARTMENT\tROLE")
        print("-" * 50)
        for user in users:
            print(f"{user[0]}\t\t{user[1]}\t\t{user[2]}")
    else:
        print("등록된 사용자가 없습니다")


def main():
    parser = argparse.ArgumentParser(description="사용자 관리")
    parser.add_argument(
        "action", choices=["create", "delete", "list"], help="수행할 작업"
    )
    parser.add_argument("--user-id", help="사용자 ID")
    parser.add_argument("--password", help="비밀번호")
    parser.add_argument("--department", choices=["CS", "HES", "LENOVO"], help="부서")
    parser.add_argument("--role", choices=["admin", "user"], help="권한")

    args = parser.parse_args()

    if args.action == "create":
        if not all([args.user_id, args.password, args.department, args.role]):
            print("사용자 생성에 필요한 모든 인자를 입력하세요")
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
