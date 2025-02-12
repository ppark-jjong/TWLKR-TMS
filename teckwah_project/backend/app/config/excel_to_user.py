# backend/app/config/excel_to_user.py
import pandas as pd
import bcrypt
from app.config.database import execute_query
from app.utils.logger import log_info, log_error


def hash_password(password):
    """비밀번호 해싱 처리"""
    try:
        password_bytes = str(password).encode(
            "utf-8"
        )  # 비밀번호를 바이트 형식으로 인코딩
        salt = bcrypt.gensalt()  # Salt 생성
        hashed = bcrypt.hashpw(password_bytes, salt)  # 비밀번호 해싱

        # 해싱된 비밀번호의 길이를 로그로 남김
        log_info(f"비밀번호 해싱 성공: 해시 길이 {len(hashed)}")

        return hashed.decode("utf-8")  # 바이트 형태의 해시를 문자열로 반환

    except Exception as e:
        # 예외 발생 시 에러 로그 남기기
        log_error(f"비밀번호 해싱 중 오류: {str(e)}")
        raise  # 오류를 다시 던져서 상위에서 처리할 수 있도록 함


def normalize_role(role):
    """사용자 역할 정규화 (소문자로 변환)"""
    if isinstance(role, str):
        return role.lower()  # init-db.sql의 ENUM 정의에 맞춰 소문자로 변환
    return role


def normalize_department(dept):
    """부서 정규화 (대문자로 변환)"""
    if isinstance(dept, str):
        return dept.upper()  # init-db.sql의 ENUM 정의에 맞춰 대문자로 변환
    return dept


# 사용자 데이터 임포트 중 오류 발생시 Logger 사용
def import_users(file_path="/app/data/user.xlsx"):
    try:
        # 엑셀 데이터 읽기
        df = pd.read_excel(file_path, sheet_name="Sheet1")

        # 데이터베이스 컬럼 검증
        expected_columns = ["user_id", "user_password", "user_department", "user_role"]
        if not all(col in df.columns for col in expected_columns):
            raise ValueError("엑셀 파일의 컬럼이 예상과 다릅니다.")

        # 역할 정규화 (소문자로 변환)
        df["user_role"] = df["user_role"].apply(normalize_role)

        # 부서 정규화 (대문자로 변환)
        df["user_department"] = df["user_department"].apply(normalize_department)

        # 비밀번호 해싱 처리
        df["user_password"] = df["user_password"].apply(hash_password)

        # 데이터베이스 삽입 쿼리
        insert_query = """
        INSERT INTO users (user_id, user_password, user_department, user_role)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            user_password = VALUES(user_password),
            user_department = VALUES(user_department),
            user_role = VALUES(user_role)
        """

        # DataFrame을 리스트로 변환
        values = df[expected_columns].values.tolist()

        # 데이터베이스에 삽입
        result = execute_query(insert_query, values, many=True)

        if result:
            print(f"총 {len(df)}개의 사용자 데이터가 삽입되었습니다.")
            return True
        else:
            print("사용자 데이터 삽입 실패")
            return False

    except Exception as e:
        # 오류 발생 시 Logger 클래스의 error 메서드 사용
        Logger.error(f"사용자 데이터 임포트 중 오류 발생: {str(e)}")
        return False


if __name__ == "__main__":
    import_users()
