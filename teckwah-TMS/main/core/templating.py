from fastapi.templating import Jinja2Templates
import os

# 템플릿 디렉토리 경로 설정 (main 폴더 기준)
# Docker 환경(/app/main/templates)과 로컬 환경 모두 고려
# __file__은 현재 파일(templating.py)의 경로
# os.path.dirname(__file__) -> /app/main/core
# os.path.dirname(os.path.dirname(__file__)) -> /app/main
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

# 디렉토리 존재 확인 (디버깅용)
try:
    if not os.path.isdir(TEMPLATE_DIR):
        print(f"[Templating] Warning: Template directory not found at {TEMPLATE_DIR}")
        # 대체 경로 시도 (로컬 실행 시)
        alt_template_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "templates")
        )
        if os.path.isdir(alt_template_dir):
            print(
                f"[Templating] Using alternative template directory: {alt_template_dir}"
            )
            TEMPLATE_DIR = alt_template_dir
        else:
            print(f"[Templating] Error: Cannot find templates directory.")
except Exception as e:
    print(f"[Templating] Error checking template directory: {e}")

templates = Jinja2Templates(directory=TEMPLATE_DIR)
