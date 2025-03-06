import requests
import pandas as pd
import time
import os


# 네이버 지도 API를 사용하여 주소의 좌표를 가져옵니다.
def get_naver_coordinates(address, client_id, client_secret):
    url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
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
    route_distances = {
        "실시간빠른길": None,
        "편한길": None,
        "최적경로": None,
        "무료우선": None,
        "second_highest": None,  # 두 번째로 높은 값을 저장할 컬럼
    }

    options = [
        ("trafast", "실시간빠른길"),
        ("tracomfort", "편한길"),
        ("traoptimal", "최적경로"),
        ("traavoidtoll", "무료우선"),
    ]

    url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving15"
    # Directions 5: https://naveropenapi.apigw.ntruss.com/map-direction/v1

    headers = {
        "X-NCP-APIGW-API-KEY-ID": client_id,
        "X-NCP-APIGW-API-KEY": client_secret,
    }

    distances = []
    for option_code, option_name in options:
        params = {
            "start": f"{start_x},{start_y}",
            "goal": f"{end_x},{end_y}",
            "option": option_code,
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                result = response.json()
                if "route" in result and option_code in result["route"]:
                    distance = (
                        result["route"][option_code][0]["summary"]["distance"] / 1000
                    )
                    distance = round(distance, 2)
                    route_distances[option_name] = distance
                    distances.append(distance)
                    print(f"- {option_name}: {distance}km")

            time.sleep(0.5)  # API 호출 간격

        except Exception as e:
            print(f"경로 계산 중 오류 발생 ({option_name}): {str(e)}")

    # 두 번째로 높은 값 계산
    if len(distances) >= 2:
        sorted_distances = sorted(distances, reverse=True)  # 내림차순 정렬
        route_distances["second_highest"] = sorted_distances[1]  # 두 번째로 높은 값

    return route_distances


def process_new_rows(
    csv_file,
    start_address,
    client_id,
    client_secret,
    output_file="C:/MyMain/dashboard/main/data/zipcode_address_result_Daejeon.csv",
    max_rows=1500,
):
    """
    - 이미 완료된 행들은 다시 계산하지 않고, 새로 들어온 행만 계산.
    - 새 행 결과는 기존 result 파일(있다면)에 '추가(append)'.
    """

    # (1) 원본 CSV 읽기 - index 컬럼 필수 확인
    df_original = pd.read_csv(csv_file)
    if "index" not in df_original.columns:
        raise ValueError(
            "CSV 파일에 'index' 컬럼이 없습니다. 데이터에 index 컬럼이 필요합니다."
        )

    df_original.set_index("index", inplace=True)
    print(f"원본 CSV 로드 완료! 총 행 수: {len(df_original)}")

    # (2) 결과 CSV가 이미 존재한다면 불러옴
    if os.path.exists(output_file):
        df_result = pd.read_csv(output_file)
        if "index" not in df_result.columns:
            raise ValueError("결과 파일에 'index' 컬럼이 없습니다.")
        df_result.set_index("index", inplace=True)
        print(f"기존 결과 CSV 로드: {output_file}, shape={df_result.shape}")
    else:
        # 변경된 컬럼 구성
        df_result = pd.DataFrame(
            columns=df_original.columns.tolist()
            + ["실시간빠른길", "편한길", "최적경로", "무료우선", "second_highest"]
        )
        df_result.index.name = "index"
        print(f"결과 CSV가 없어 새로 생성 예정: {output_file}")

    # (3) 기존 결과 CSV에서 가장 큰 인덱스를 확인
    if len(df_result) > 0:
        max_index_done = df_result.index.max()
    else:
        max_index_done = -1
    print(f"이미 완료된 행의 최대 index: {max_index_done}")

    # (4) 새로 계산해야 할 행만 필터링
    df_new = df_original[df_original.index > max_index_done]
    if len(df_new) == 0:
        print("새로 계산할 행이 없습니다. (이미 모든 행이 계산됨)")
        return df_result

    # 최대 처리 행수 제한 적용
    if len(df_new) > max_rows:
        print(f"⚠️ {len(df_new)}개 행 중 {max_rows}개만 처리합니다.")
        df_new = df_new.iloc[:max_rows]

    print(f"새로 계산할 행 수: {len(df_new)}")

    # (5) 출발지 좌표 얻기
    print(f"출발지 주소 '{start_address}' 좌표 검색 중...")
    start_x, start_y = get_naver_coordinates(start_address, client_id, client_secret)
    if not start_x or not start_y:
        raise ValueError("출발지 주소를 찾을 수 없습니다.")

    # (6) 새로 계산한 결과 담을 목록
    new_results = []
    count = 0
    for idx, row in df_new.iterrows():
        count += 1
        address = row["주소"]
        print(f"\n처리 중... index={idx} [{count}/{len(df_new)}] : {address}")

        end_x, end_y = get_naver_coordinates(address, client_id, client_secret)
        if end_x and end_y:
            routes = get_route_distances(
                start_x, start_y, end_x, end_y, client_id, client_secret
            )
        else:
            print(f"⚠️ 주소를 찾을 수 없습니다: {address}")
            routes = {
                "실시간빠른길": None,
                "편한길": None,
                "최적경로": None,
                "무료우선": None,
                "second_highest": None,
            }

        data = row.to_dict()
        data.update(routes)
        data["index"] = idx
        new_results.append(data)

        # 중간 저장 로직 (매 100행마다)
        if count % 100 == 0:
            df_temp = pd.DataFrame(new_results)
            df_temp.set_index("index", inplace=True)
            df_interim = pd.concat([df_result, df_temp], axis=0)
            df_interim.to_csv(output_file, index=True, encoding="utf-8-sig")
            print(f"✓ 중간 저장 완료 (처리된 행: {count}/{len(df_new)})")

    # (7) 새로 계산한 행들 => DataFrame으로 만들기
    df_new_result = pd.DataFrame(new_results)
    df_new_result.set_index("index", inplace=True)

    # (8) 기존 df_result에 수직 결합(append)
    df_result = pd.concat([df_result, df_new_result], axis=0)
    print(
        f"\n✅ {len(df_new_result)}건의 행을 결과에 추가했습니다. 총 결과 shape={df_result.shape}"
    )

    # (9) 결과 CSV 저장
    df_result.to_csv(output_file, index=True, encoding="utf-8-sig")
    print(f"최종 결과가 {output_file}에 저장되었습니다.")

    return df_result


if __name__ == "__main__":
    # 설정
    CSV_FILE = "C:/MyMain/teckwah-dashboard/data/zipcode_address.csv"
    START_ADDRESS = "대전광역시 중구 대종로 434"
    NAVER_CLIENT_ID = "2qxc1i2ijz"
    NAVER_CLIENT_SECRET = "J9UWJv3QUeIPgwFNGOPMLqgcfatqh83uPTf8vXmG"

    try:
        df_final = process_new_rows(
            csv_file=CSV_FILE,
            start_address=START_ADDRESS,
            client_id=NAVER_CLIENT_ID,
            client_secret=NAVER_CLIENT_SECRET,
            output_file="C:/MyMain/teckwah-dashboard/data/zipcode_address_result_Daejeon.csv",
            max_rows=750,  # 750
        )
        print("\n🎉 실행 완료!")
        print(df_final.tail(5))
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
