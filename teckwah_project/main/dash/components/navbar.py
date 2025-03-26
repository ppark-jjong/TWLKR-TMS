# teckwah_project/main/dash/components/navbar.py
from dash import html
import dash_bootstrap_components as dbc


def create_navbar(user_info=None):
    """네비게이션 바 컴포넌트 생성"""
    # 로그인하지 않은 경우 빈 컨테이너 반환
    if not user_info:
        return html.Div()

    # 사용자 정보 추출
    user_id = user_info.get("user_id", "사용자")
    department = user_info.get("department", "")
    is_admin = user_info.get("is_admin", False)

    # 관리자용 추가 메뉴 아이템
    admin_items = []
    if is_admin:
        admin_items.append(
            dbc.NavItem(dbc.NavLink("다운로드", href="/download", className="px-3"))
        )

    # 네비게이션 바 생성
    navbar = dbc.Navbar(
        dbc.Container(
            [
                # 로고 및 시스템 이름
                html.A(
                    dbc.Row(
                        [
                            dbc.Col(html.Img(src="/assets/logo.png", height="30px")),
                            dbc.Col(
                                dbc.NavbarBrand(
                                    "배송 실시간 관제 시스템", className="ms-2"
                                )
                            ),
                        ],
                        align="center",
                        className="g-0",
                    ),
                    href="/dashboard",
                    style={"textDecoration": "none"},
                ),
                # 네비게이션 토글
                dbc.NavbarToggler(id="navbar-toggler", n_clicks=0),
                # 네비게이션 메뉴
                dbc.Collapse(
                    dbc.Nav(
                        [
                            # 기본 메뉴 아이템
                            dbc.NavItem(
                                dbc.NavLink(
                                    "대시보드", href="/dashboard", className="px-3"
                                )
                            ),
                            dbc.NavItem(
                                dbc.NavLink(
                                    "시각화", href="/visualization", className="px-3"
                                )
                            ),
                            # 관리자용 메뉴 아이템
                            *admin_items,
                            # 세션 상태 확인 및 토큰 갱신 버튼
                            dbc.NavItem(
                                dbc.Button(
                                    "세션 확인",
                                    id="check-session-button",
                                    color="secondary",
                                    outline=True,
                                    size="sm",
                                    className="ms-3",
                                )
                            ),
                            dbc.NavItem(
                                dbc.Button(
                                    "토큰 갱신",
                                    id="refresh-token-button",
                                    color="primary",
                                    outline=True,
                                    size="sm",
                                    className="ms-2",
                                )
                            ),
                            # 사용자 정보 및 로그아웃 버튼
                            dbc.NavItem(
                                dbc.NavLink(
                                    [
                                        html.I(className="fas fa-user me-2"),
                                        f"{user_id} ({department})",
                                    ],
                                    href="#",
                                    className="px-3",
                                )
                            ),
                            dbc.NavItem(
                                dbc.Button(
                                    "로그아웃",
                                    id="logout-button",
                                    color="light",
                                    outline=True,
                                    size="sm",
                                    className="ms-3",
                                )
                            ),
                        ],
                        className="ms-auto",
                        navbar=True,
                    ),
                    id="navbar-collapse",
                    navbar=True,
                ),
            ],
            fluid=True,
        ),
        color="light",
        light=True,
        className="mb-4 shadow-sm",
    )

    return navbar
