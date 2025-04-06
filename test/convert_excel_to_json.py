import os
import pandas as pd
import json
from datetime import datetime

# 직렬화 가능한 형태로 변환하는 함수
def convert_to_serializable(obj):
    if pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.strftime("%Y-%m-%dT%H:%M:%S")  # ISO 형식으로 통일
    elif isinstance(obj, (int, float)) and pd.isna(obj):
        return None
    else:
        return str(obj) if not isinstance(obj, (int, float, bool, type(None))) else obj

# Excel 파일 경로
excel_path = "dashboard.xlsx"
output_json_path = "dashboard_data.json"

try:
    # 엑셀 파일 읽기
    print(f"Excel 파일 읽기: {excel_path}")
    if not os.path.exists(excel_path):
        print(f"Error: 파일 {excel_path}가 존재하지 않습니다")
        exit(1)
    
    # 엑셀 파일 정보 추출
    excel_info = pd.ExcelFile(excel_path)
    print(f"Excel 시트: {excel_info.sheet_names}")
    
    # 결과 저장할 딕셔너리
    result = {}
    
    for sheet_name in excel_info.sheet_names:
        print(f"\n시트 분석: {sheet_name}")
        
        # 날짜 형식으로 인식할 수 있는 열 지정
        # 알려진 날짜 컬럼 목록
        date_columns = ['eta', 'create_time', 'depart_time', 'complete_time', 'update_at']
        
        # 시트 읽기 - parse_dates 옵션 사용
        df = pd.read_excel(excel_path, sheet_name=sheet_name, parse_dates=date_columns)
        
        # 데이터 변환
        data_list = []
        
        for _, row in df.iterrows():
            # 모든 열에 대해 직렬화 가능한 형식으로 변환
            row_dict = {}
            for col in df.columns:
                row_dict[col] = convert_to_serializable(row[col])
            
            data_list.append(row_dict)
        
        # 결과 저장
        result[sheet_name] = data_list
        print(f"{sheet_name} 시트 변환 완료: {len(data_list)}개 행")
    
    # JSON 파일로 저장
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\nJSON 파일 저장 완료: {output_json_path}")
    
except Exception as e:
    print(f"오류 발생: {str(e)}")
