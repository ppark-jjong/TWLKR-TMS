import requests
import pandas as pd
import time
import os


# 네이버 지도 API로 주소(또는 우편번호) → (경도, 위도) 변환
def get_naver_coordinates(address, client_id, client_secret):
    """
    address: 출발지/도착지 (도로명 주소 혹은 우편번호)
    """
    url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret
    }
    params = {"query": address}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        result = response.json()
        if result.get("addresses"):
            x = float(result["addresses"][0]["x"])  # 경도
            y = float(result["addresses"][0]["y"])  # 위도
            return x, y
    return None, None


def get_route_distances(start_x, start_y, end_x, end_y, client_id, client_secret):
    """
    네이버 길안내 API로 4가지 옵션 거리 계산 후,
    두 번째로 긴 거리(second_highest)까지 딕셔너리 형태로 리턴
    """
    route_distances = {
        "실시간빠른길": None,
        "편한길": None,
        "최적경로": None,
        "무료우선": None,
        "second_highest": None
    }

    options = [
        ("trafast", "실시간빠른길"),
        ("tracomfort", "편한길"),
        ("traoptimal", "최적경로"),
        ("traavoidtoll", "무료우선")
    ]

    url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret
    }

    distances = []
    for option_code, option_name in options:
        params = {
            "start": f"{start_x},{start_y}",
            "goal": f"{end_x},{end_y}",
            "option": option_code
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                result = response.json()
                if "route" in result and option_code in result["route"]:
                    distance = result["route"][option_code][0]["summary"]["distance"] / 1000
                    distance = round(distance, 2)
                    route_distances[option_name] = distance
                    distances.append(distance)
                    print(f"  - {option_name} = {distance}km")

            time.sleep(0.3)  # API 호출 간격 (너무 빠르면 오류 발생 가능)

        except Exception as e:
            print(f"경로 계산 중 오류 ({option_name}): {str(e)}")

    # 두 번째로 긴 거리 계산
    if len(distances) >= 2:
        sorted_distances = sorted(distances, reverse=True)
        route_distances['second_highest'] = sorted_distances[1]

    return route_distances


def process_new_rows(excel_file, sheet_name,
                     client_id, client_secret,
                     output_file="C:/MyMain/dashboard/main/data/zipcode_address_result.csv",
                     max_rows=1500):
    """
    - 엑셀 파일( main 시트 )에서 [index, depart, arrival] 컬럼을 읽어옴
    - 이미 계산된 index는 스킵, 새로 추가된 행만 계산
    - 4가지 옵션(실시간빠른길, 편한길, 최적경로, 무료우선) + second_highest 계산
    - 결과를 CSV에 append (없으면 새로 생성)
    - 한 번에 최대 max_rows까지 처리
    """

    # (1) 엑셀에서 'main' 시트 읽기
    df_original = pd.read_excel(excel_file, sheet_name=sheet_name)
    if 'index' not in df_original.columns:
        raise ValueError("엑셀에 'index' 컬럼이 없습니다.")
    if 'depart' not in df_original.columns or 'arrival' not in df_original.columns:
        raise ValueError("엑셀에 'depart', 'arrival' 컬럼이 없습니다.")

    # index 컬럼을 실제 DF의 인덱스로 활용
    df_original.set_index('index', inplace=True)
    print(f"엑셀 '{sheet_name}' 시트 로드 완료! 총 행 수: {len(df_original)}")

    # (2) 결과 CSV가 이미 존재한다면 읽어옴
    if os.path.exists(output_file):
        df_result = pd.read_csv(output_file)
        if 'index' not in df_result.columns:
            raise ValueError("결과 CSV에 'index' 컬럼이 없습니다.")
        df_result.set_index('index', inplace=True)
        print(f"기존 결과 CSV 로드 완료: {output_file}, shape={df_result.shape}")
    else:
        # depart, arrival 외 + 5개 거리 컬럼 생성
        df_result = pd.DataFrame(columns=df_original.columns.tolist() + [
            "실시간빠른길", "편한길", "최적경로", "무료우선", "second_highest"
        ])
        df_result.index.name = 'index'
        print(f"결과 CSV가 없어 새로 생성 예정: {output_file}")

    # (3) 이미 계산된 index 최대값 확인
    if len(df_result) > 0:
        max_index_done = df_result.index.max()
    else:
        max_index_done = -1
    print(f"이미 완료된 행의 최대 index: {max_index_done}")

    # (4) 새로 계산해야 할 행만 골라냄
    df_new = df_original[df_original.index > max_index_done]
    if len(df_new) == 0:
        print("새로 계산할 행이 없습니다! (이미 모든 행이 계산됨)")
        return df_result

    # 최대 처리 행수 제한
    if len(df_new) > max_rows:
        print(f"⚠️ 새 행 {len(df_new)}개 중 {max_rows}개만 처리합니다.")
        df_new = df_new.iloc[:max_rows]

    print(f"새로 계산할 행 수: {len(df_new)}")

    # (5) 새로 계산할 행들의 결과
    new_results = []
    count = 0

    for idx, row in df_new.iterrows():
        count += 1
        depart_addr = row['depart']   # 출발지 주소/우편번호
        arrival_addr = row['arrival'] # 도착지 주소/우편번호

        print(f"\n[처리 중] index={idx} [{count}/{len(df_new)}]")
        print(f"  - 출발: {depart_addr}")
        print(f"  - 도착: {arrival_addr}")

        # 출발지 / 도착지 좌표 구하기
        start_x, start_y = get_naver_coordinates(depart_addr, client_id, client_secret)
        end_x, end_y = get_naver_coordinates(arrival_addr, client_id, client_secret)

        # 4개 옵션 거리 계산
        if (start_x is not None and start_y is not None and
            end_x is not None and end_y is not None):
            routes = get_route_distances(start_x, start_y, end_x, end_y, client_id, client_secret)
        else:
            print("  ⚠️ 좌표를 찾을 수 없어서 거리값 None 처리")
            routes = {
                "실시간빠른길": None,
                "편한길": None,
                "최적경로": None,
                "무료우선": None,
                "second_highest": None
            }

        # 결과 row 구성
        data_row = row.to_dict()
        data_row.update(routes)
        data_row['index'] = idx  # 나중에 set_index('index')로 인덱스 적용
        new_results.append(data_row)

        # (6) 중간 저장 (매 100행마다)
        if count % 100 == 0:
            df_temp = pd.DataFrame(new_results)
            df_temp.set_index('index', inplace=True)
            df_interim = pd.concat([df_result, df_temp], axis=0)
            df_interim.to_csv(output_file, index=True, encoding='utf-8-sig')
            print(f"  ✓ 중간 저장 완료 (처리: {count}/{len(df_new)})")

    # (7) DataFrame으로 변환 후 기존 df_result와 병합
    df_new_result = pd.DataFrame(new_results)
    df_new_result.set_index('index', inplace=True)

    df_result = pd.concat([df_result, df_new_result], axis=0)
    print(f"\n✅ {len(df_new_result)}건의 계산 결과 추가 (결과 shape={df_result.shape})")

    # (8) 최종 CSV 저장
    df_result.to_csv(output_file, index=True, encoding='utf-8-sig')
    print(f"최종 결과가 {output_file}에 저장되었습니다.")

    return df_result


def main():
    """
    실제로 실행될 main() 함수
    """
    EXCEL_FILE = "C:/MyMain/dashboard/data/client_mana.xlsx"  # 엑셀 경로
    SHEET_NAME = "main"  # 시트 이름

    NAVER_CLIENT_ID = "2qxc1i2ijz"
    NAVER_CLIENT_SECRET = "J9UWJv3QUeIPgwFNGOPMLqgcfatqh83uPTf8vXmG"

    OUTPUT_FILE = "C:/MyMain/dashboard/data/client_mana_result.csv"

    try:
        df_final = process_new_rows(
            excel_file=EXCEL_FILE,
            sheet_name=SHEET_NAME,
            client_id=NAVER_CLIENT_ID,
            client_secret=NAVER_CLIENT_SECRET,
            output_file=OUTPUT_FILE,
            max_rows=6000
        )
        print("\n🎉 실행 완료!")
        print(df_final.tail(5))  # 결과 마지막 5행 출력
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")


if __name__ == "__main__":
    main()
