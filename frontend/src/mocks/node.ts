import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers.ts'

/** Node(테스트)용 MSW 서버. 브라우저의 worker와 같은 핸들러를 쓴다. */
export const server = setupServer(...handlers)
