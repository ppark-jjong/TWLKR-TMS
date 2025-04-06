import os
import pandas as pd
import json
from datetime import datetime

# JSON 직렬화 가능한 형태로 변환
def convert_to_serializable(obj):
    if pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    else:
        return str(obj)

# 엑셀 파일 경로
excel_path = "dashboard.xlsx"

try:
    # 엑셀 파일 읽기
    print(f"Reading Excel file: {excel_path}")
    if not os.path.exists(excel_path):
        print(f"Error: File {excel_path} does not exist")
        exit(1)
    
    # 엑셀 파일 정보 추출
    excel_info = pd.ExcelFile(excel_path)
    print(f"Excel sheets: {excel_info.sheet_names}")
    
    # 모든 시트 분석
    result = {}
    
    for sheet_name in excel_info.sheet_names:
        print(f"\nAnalyzing sheet: {sheet_name}")
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        
        # 기본 정보
        result[sheet_name] = {
            "columns": list(df.columns),
            "rows": len(df),
            "sample_data": []
        }
        
        # 샘플 데이터 (처음 5개 행)
        for i, row in df.head(5).iterrows():
            row_dict = {}
            for col in df.columns:
                row_dict[col] = convert_to_serializable(row[col])
            result[sheet_name]["sample_data"].append(row_dict)
    
    # 결과를 JSON 파일로 저장
    with open("excel_analysis.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\nAnalysis completed and saved to excel_analysis.json")
    
    # 컬럼 정보 출력
    for sheet_name in result:
        print(f"\nColumns in {sheet_name} sheet:")
        for col in result[sheet_name]["columns"]:
            print(f"  - {col}")

except Exception as e:
    print(f"Error analyzing Excel file: {str(e)}")
