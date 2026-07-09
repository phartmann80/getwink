import type { AiProvider } from './types';import { LangdockAiProvider } from './langdock-provider';
export function createAiProvider():AiProvider{return new LangdockAiProvider({endpointUrl:process.env.LANGDOCK_ENDPOINT_URL,apiCode:process.env.LANGDOCK_API_CODE,model:process.env.MODEL})}
