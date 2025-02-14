import pandas as pd
import bcrypt
import mysql.connector
import os
import logging
from dotenv import load_dotenv

# 📌 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler(),  # 터미널에도 출력
    ],
)


def log_info(message):
    """INFO 레벨 로그 기록"""
    logging.info(message)


def log_error(message):
    """ERROR 레벨 로그 기록"""
    logging.error(message)


# 📌 환경 변수 로드
load_dotenv()

# 📌 MySQL 연결 설정
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", 3306)),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", "1234"),
    "database": os.getenv("MYSQL_DATABASE", "delivery_system"),
}


def hash_password(password):
    """비밀번호 해싱 처리"""
    try:
        password_bytes = str(password).encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)

        log_info(f"비밀번호 해싱 성공: 해시 길이 {len(hashed)}")
        return hashed.decode("utf-8")

    except Exception as e:
        log_error(f"비밀번호 해싱 중 오류: {str(e)}")
        raise


def normalize_role(role):
    """사용자 역할 정규화 (대문자로 변환)"""
    return role.upper() if isinstance(role, str) else role


def normalize_department(dept):
    """부서 정규화 (대문자로 변환)"""
    return dept.upper() if isinstance(dept, str) else dept


def insert_users_to_db(users):
    """로컬 MySQL에 사용자 데이터 삽입"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        insert_query = """
        INSERT INTO user (user_id, user_password, user_department, user_role)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            user_password = VALUES(user_password),
            user_department = VALUES(user_department),
            user_role = VALUES(user_role)
        """

        cursor.executemany(insert_query, users)
        conn.commit()

        log_info(f"총 {len(users)}명의 사용자 데이터가 삽입되었습니다.")

    except mysql.connector.Error as err:
        log_error(f"MySQL 오류: {err}")
    finally:
        cursor.close()
        conn.close()


# 현재 스크립트의 절대 경로를 기준으로 최상위 backend 디렉토리 찾기
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))


def import_users(file_path=None):
    """CSV 파일에서 사용자 데이터를 읽어와서 DB에 저장"""
    try:
        if file_path is None:
            file_path = os.path.join(BASE_DIR, "app/data/user.csv")  # 절대 경로로 변환

        file_path = os.path.abspath(file_path)
        log_info(f"사용자 데이터 파일 경로: {file_path}")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"파일이 존재하지 않습니다: {file_path}")

        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)

        expected_columns = ["user_id", "user_password", "user_department", "user_role"]
        if not all(col in df.columns for col in expected_columns):
            raise ValueError("CSV 파일의 컬럼이 예상과 다릅니다.")

        df["user_role"] = df["user_role"].apply(normalize_role)
        df["user_department"] = df["user_department"].apply(normalize_department)
        df["user_password"] = df["user_password"].apply(hash_password)

        users = df[expected_columns].values.tolist()
        insert_users_to_db(users)

        return True

    except Exception as e:
        log_error(f"사용자 데이터 임포트 중 오류 발생: {e}")
        return False


if __name__ == "__main__":
    import_users()
