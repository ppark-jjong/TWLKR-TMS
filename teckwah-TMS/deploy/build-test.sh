#!/bin/sh
# 프론트엔드 빌드 테스트 스크립트

echo "===== 프론트엔드 빌드 테스트를 시작합니다 ====="
cd ../frontend

echo "1. 기존 build 폴더 정리 중..."
rm -rf build

echo "2. 의존성 설치 중..."
npm ci

echo "3. 빌드 실행 중..."
npm run build

echo "4. 빌드 결과 확인 중..."
if [ -d "build" ]; then
  echo "✅ 빌드 성공! build 폴더가 생성되었습니다."
  ls -la build
  
  # index.html 파일 존재 확인
  if [ -f "build/index.html" ]; then
    echo "✅ index.html 파일이 존재합니다."
  else
    echo "❌ 오류: index.html 파일이 없습니다!"
  fi
  
  # static 폴더 존재 확인
  if [ -d "build/static" ]; then
    echo "✅ static 폴더가 존재합니다."
    ls -la build/static
  else
    echo "❌ 오류: static 폴더가 없습니다!"
  fi
else
  echo "❌ 오류: 빌드에 실패했습니다. build 폴더가 없습니다!"
fi

echo "===== 프론트엔드 빌드 테스트 완료 ====="
