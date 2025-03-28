# teckwah_project/main/server/background/cleanup_tasks.py
import asyncio
import logging
from datetime import datetime, timedelta
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from main.server.config.database import get_db
from main.server.utils.logger import log_info, log_error
from main.server.repositories.lock_repository import LockRepository
from main.server.config.settings import get_settings

settings = get_settings()

class CleanupManager:
    """만료된 락 및 기타 리소스 정리를 담당하는 매니저"""
    
    def __init__(self):
        self.is_running = False
        self.cleanup_interval = settings.LOCK_CLEANUP_INTERVAL_MINUTES
        self.logger = logging.getLogger("cleanup-manager")
    
    async def start_cleanup_tasks(self):
        """클린업 태스크 시작"""
        if self.is_running:
            return
            
        self.is_running = True
        log_info("클린업 태스크 시작")
        
        # 배경 태스크로 실행
        asyncio.create_task(self._run_periodic_cleanup())
    
    async def _run_periodic_cleanup(self):
        """주기적인 클린업 작업 수행"""
        while self.is_running:
            try:
                # DB 세션 생성 (FastAPI 의존성 사용 불가능한 컨텍스트)
                from main.server.config.database import SessionLocal
                db = SessionLocal()
                
                try:
                    # 락 리포지토리 생성
                    lock_repository = LockRepository(db)
                    
                    # 만료된 락 정리
                    cleaned_count = lock_repository.cleanup_expired_locks()
                    
                    if cleaned_count > 0:
                        log_info(f"만료된 락 {cleaned_count}개 정리 완료")
                    
                finally:
                    db.close()
                    
            except Exception as e:
                log_error(e, "클린업 작업 중 오류 발생")
            
            # 설정된 간격으로 대기
            await asyncio.sleep(self.cleanup_interval * 60)  # 분 단위를 초 단위로 변환
    
    def stop_cleanup_tasks(self):
        """클린업 태스크 중지"""
        self.is_running = False
        log_info("클린업 태스크 중지")


# 싱글톤 인스턴스
cleanup_manager = CleanupManager()