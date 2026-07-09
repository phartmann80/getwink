export type AiFeature='general_assistant'|'onboarding_guidance'|'profile_creation'|'bio_improvement'|'conversation_opener'|'reply_suggestion'|'safety_guidance'|'reporting_support';
export type AiRole='system'|'user'|'assistant';
export interface AiChatMessage{role:AiRole;content:string}
export interface AiRequestContext{userId:string;feature:AiFeature;conversationId?:string;metadata?:Record<string,unknown>}
export interface AiGenerateRequest{context:AiRequestContext;messages:AiChatMessage[];temperature?:number;maxTokens?:number}
export interface AiUsageMetadata{promptTokens?:number;completionTokens?:number;totalTokens?:number;provider?:string;model?:string;raw?:unknown}
export interface AiGenerateResponse{content:string;usage?:AiUsageMetadata}
export interface AiProvider{readonly name:string;generate(request:AiGenerateRequest):Promise<AiGenerateResponse>}
