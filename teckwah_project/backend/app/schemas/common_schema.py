"""공통 스키마 정의"""

from enum import Enum


class DeliveryType(str, Enum):
    """배송 유형 (init-db.sql ENUM 정의와 일치)"""

    DELIVERY = "DELIVERY"
    RETURN = "RETURN"




class DeliveryStatus(str, Enum):
    """배송 상태 (init-db.sql ENUM 정의와 일치)"""

    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"




class UserDepartment(str, Enum):
    """부서 (init-db.sql ENUM 정의와 일치)"""

    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    """창고 (init-db.sql ENUM 정의와 일치)"""

    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


class SLA(str, Enum):
    """SLA 유형 (init-db.sql ENUM 정의와 일치)"""

    XHR = "XHR"
    POX = "POX"
    EMC = "EMC"
    WEWORK = "WEWORK"
    LENOVO = "LENOVO"


class UserRole(str, Enum):
    """사용자 역할 (init-db.sql ENUM 정의와 일치)"""

    ADMIN = "ADMIN"
    USER = "USER"
