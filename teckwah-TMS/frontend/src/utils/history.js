/**
 * 애플리케이션 전체에서 사용할 수 있는 history 객체
 * Axios 인터셉터 등 컴포넌트 외부에서 라우팅 제어가 필요할 때 사용
 */
import { createBrowserHistory } from 'history';

export const history = createBrowserHistory();
