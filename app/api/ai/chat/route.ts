import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { AiService } from '@/lib/ai/ai-service';
import type { AiChatMessage, AiFeature } from '@/lib/ai/types';
const FEATURES=new Set<AiFeature>(['general_assistant','onboarding_guidance','profile_creation','bio_improvement','conversation_opener','reply_suggestion','safety_guidance','reporting_support']);
export async function POST(request:Request){
  const started=Date.now();
  try{
    const auth=request.headers.get('authorization');if(!auth?.startsWith('Bearer '))return NextResponse.json({error:'Authentication required.'},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY;if(!url||!key)throw new Error('Supabase configuration missing');
    const db=createClient(url,key,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});const user=await db.auth.getUser(auth.slice(7));if(user.error||!user.data.user)return NextResponse.json({error:'Invalid session.'},{status:401});
    const body=await request.json();const feature:AiFeature=FEATURES.has(body.feature)?body.feature:'general_assistant';const messages=validate(body.messages);const result=await new AiService().generate({context:{userId:user.data.user.id,feature},messages});
    await db.from('ai_usage_events').insert({user_id:user.data.user.id,feature,status:'success',latency_ms:Date.now()-started,request_finished_at:new Date().toISOString(),provider:result.usage?.provider,model:result.usage?.model,prompt_tokens:result.usage?.promptTokens,completion_tokens:result.usage?.completionTokens,total_tokens:result.usage?.totalTokens});
    return NextResponse.json({content:result.content,usage:{provider:result.usage?.provider,model:result.usage?.model}});
  }catch{return NextResponse.json({error:'AI assistant is unavailable right now.'},{status:500})}
}
function validate(value:unknown):AiChatMessage[]{if(!Array.isArray(value)||value.length<1||value.length>20)throw new Error('Invalid messages');return value.map(x=>{if(!x||typeof x!=='object')throw new Error('Invalid message');const m=x as Record<string,unknown>;if(!['user','assistant'].includes(String(m.role))||typeof m.content!=='string'||!m.content.trim()||m.content.length>8000)throw new Error('Invalid message');return{role:m.role as'user'|'assistant',content:m.content.trim()}})}
