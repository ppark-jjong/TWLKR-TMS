import secrets

secret_key = secrets.token_hex(32)  # 32바이트 길이의 난수 생성
print(f"Generated Secret Key: {secret_key}")
