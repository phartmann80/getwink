import type{AiGenerateRequest,AiGenerateResponse,AiProvider}from'./types';
interface LangdockProviderConfig{endpointUrl?:string;apiCode?:string;model?:string}
export class LangdockAiProvider implements AiProvider{readonly name='langdock';constructor(private readonly config:LangdockProviderConfig){}async generate(request:AiGenerateRequest):Promise<AiGenerateResponse>{if(!this.config.endpointUrl||!this.config.apiCode)throw new Error('AI provider is not configured');const startedAt=Date.now();
    let endpoint = this.config.endpointUrl;
    if (endpoint && !endpoint.endsWith('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.config.apiCode}`},body:JSON.stringify({model:this.config.model,messages:request.messages,temperature:request.temperature??0.7,max_tokens:request.maxTokens,metadata:{feature:request.context.feature,user_id:request.context.userId,conversation_id:request.context.conversationId}})});if(!response.ok)throw new Error(`AI provider request failed with status ${response.status}`);const data=await response.json();return{content:extractContent(data),usage:{provider:this.name,model:this.config.model,promptTokens:data?.usage?.prompt_tokens,completionTokens:data?.usage?.completion_tokens,totalTokens:data?.usage?.total_tokens,raw:{latencyMs:Date.now()-startedAt,responseId:data?.id}}}}}
function extractContent(data:any):string{const openAiStyle=data?.choices?.[0]?.message?.content;if(typeof openAiStyle==='string')return openAiStyle;const text=data?.text??data?.content??data?.message;if(typeof text==='string')return text;throw new Error('AI provider response did not include text content')}
