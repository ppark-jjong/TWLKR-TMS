import json
import datetime
import random

# 원본 JSON 파일 로드
with open("dashboard_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# dashboard 리스트 내 각 항목에 대해 처리
for entry in data.get("dashboard", []):
    eta = entry.get("eta")
    if eta:
        # eta 문자열을 datetime 객체로 변환 (포맷: "YYYY-MM-DDTHH:MM:SS")
        dt = datetime.datetime.strptime(eta, "%Y-%m-%dT%H:%M:%S")
        # month가 3월인 경우에만 변경
        if dt.month == 3:
            # 4월 1일 ~ 4월 30일 사이의 랜덤한 날짜 선택
            new_day = random.randint(1, 30)
            # 연도와 시간은 그대로, month를 4로, day를 랜덤값으로 교체
            new_dt = dt.replace(month=4, day=new_day)
            # 새로운 datetime 객체를 동일 포맷의 문자열로 변환
            entry["eta"] = new_dt.strftime("%Y-%m-%dT%H:%M:%S")

# 변경된 데이터를 새 JSON 파일에 저장 (원본 파일은 변경되지 않음)
with open("dashboard_data_modified.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 결과 출력 (콘솔 출력)
print(json.dumps(data, ensure_ascii=False, indent=2))
