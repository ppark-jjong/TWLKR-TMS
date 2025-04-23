"""
개발 서버 실행 스크립트
"""

import os
import sys
import uvicorn

# 현재 경로 추가 (backend 폴더를 import 가능하게)
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from backend.config import get_settings

settings = get_settings()


if __name__ == "__main__":
    print(f"==== 개발 서버 시작 (포트: {settings.PORT}) ====")
    uvicorn.run(
        "backend.main:app", 
        host="0.0.0.0", 
        port=settings.PORT, 
        reload=settings.DEBUG
    )
