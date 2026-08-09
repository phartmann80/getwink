import { apiBaseUrl, supabase } from './supabase';
import type { Candidate, ChatMessage, Gender, MatchCard, Profile } from './types';
const check=(error:{message:string}|null)=>{if(error)throw new Error(error.message)};
async function userId(){const{data,error}=await supabase.auth.getUser();check(error);if(!data.user)throw new Error('Sign in required');return data.user.id}
export async function signIn(email:string,password:string){const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});check(error)}
export async function signUp(email:string,password:string){const{data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:'getwink://auth/callback'}});check(error);return Boolean(data.session)}
export async function resendConfirmation(email:string){const{error}=await supabase.auth.resend({type:'signup',email:email.trim()});check(error)}
export async function signOut(){const{error}=await supabase.auth.signOut();check(error)}
export async function ownProfile():Promise<Profile|null>{const id=await userId();const{data,error}=await supabase.from('profiles').select('id,display_name,gender,bio,birthdate,city,country,onboarding_completed_at').eq('id',id).maybeSingle();check(error);return data as Profile|null}
export async function saveProfile(input:{displayName:string;gender:Gender;bio:string;birthdate:string;city:string;country:string;interestedIn:Gender[];photoUri?:string}){
  const id=await userId();
  let r=await supabase.from('profiles').upsert({id,display_name:input.displayName.trim(),gender:input.gender,bio:input.bio.trim(),birthdate:input.birthdate,city:input.city.trim()||null,country:input.country.trim()||null},{onConflict:'id'});
  check(r.error);
  const prefs=await supabase.rpc('save_profile_preferences',{p_interested_in:input.interestedIn,p_min_age:18,p_max_age:80});
  check(prefs.error);
  if(input.photoUri){
    const previous=await supabase.from('profile_photos').select('id,storage_path').eq('user_id',id).order('sort_order').limit(1).maybeSingle();
    check(previous.error);
    const blob=await(await fetch(input.photoUri)).blob();
    console.log('[diag-photo] blob size/type',blob.size,blob.type);
    if(blob.size>10*1024*1024)throw new Error('Photo must be smaller than 10 MB');
    const path=`${id}/${Date.now()}.jpg`;
    const upload=await supabase.storage.from('profile-photos').upload(path,blob,{contentType:blob.type||'image/jpeg'});
    if(upload.error)console.log('[diag-photo] upload error',JSON.stringify({message:upload.error.message,name:(upload.error as any).name,status:(upload.error as any).statusCode||(upload.error as any).status,cause:String((upload.error as any).cause||'')}));
    check(upload.error);
    const photoRow:{id?:string;user_id:string;storage_path:string;sort_order:number}={user_id:id,storage_path:path,sort_order:0};
    if(previous.data?.id)photoRow.id=previous.data.id;
    const photo=await supabase.from('profile_photos').upsert(photoRow,{onConflict:'id'});
    check(photo.error);
    // Only remove the old object once the new upload and row are confirmed, so a failed
    // save never leaves the user without any photo.
    if(previous.data&&previous.data.storage_path!==path)await supabase.storage.from('profile-photos').remove([previous.data.storage_path]);
  }
  const done=await supabase.rpc('complete_profile_if_ready',{p_user_id:id});
  check(done.error);
  const row=Array.isArray(done.data)?done.data[0]:done.data;
  if(!row?.profile_complete)throw new Error('Complete every required field and add a photo');
  return row;
}
async function photo(user:string){const{data,error}=await supabase.from('profile_photos').select('storage_path').eq('user_id',user).order('sort_order').limit(1).maybeSingle();check(error);if(!data?.storage_path)return null;return (await supabase.storage.from('profile-photos').createSignedUrl(data.storage_path,3600)).data?.signedUrl??null}
export async function candidates():Promise<Candidate[]>{const me=await userId();const acted=await supabase.from('discovery_actions').select('target_user_id').eq('actor_user_id',me);check(acted.error);const excluded=new Set([me,...(acted.data??[]).map(x=>x.target_user_id)]);const result=await supabase.from('discovery_candidate_profiles').select('id,display_name,gender,bio,city,country').limit(30);check(result.error);return Promise.all((result.data??[]).filter(x=>!excluded.has(x.id)).map(async x=>({...x,photoUrl:await photo(x.id)}))) as Promise<Candidate[]>}
export async function act(target:string,action:'wink'|'pass'){const{data,error}=await supabase.rpc('record_discovery_action',{p_target_user_id:target,p_action:action});check(error);return Array.isArray(data)?data[0]:data}
export async function matches():Promise<MatchCard[]>{const me=await userId();const{data,error}=await supabase.from('matches').select('id,user_low_id,user_high_id,status,conversations(id)').eq('status','active').or(`user_low_id.eq.${me},user_high_id.eq.${me}`);check(error);return Promise.all((data??[]).map(async(row:any)=>{const other=row.user_low_id===me?row.user_high_id:row.user_low_id;const p=await supabase.from('profiles').select('display_name').eq('id',other).single();check(p.error);const c=Array.isArray(row.conversations)?row.conversations[0]:row.conversations;return{id:row.id,conversationId:c?.id??null,otherUserId:other,name:p.data?.display_name??'New match',photoUrl:await photo(other)}}))}
export async function messages(conversation:string):Promise<ChatMessage[]>{const{data,error}=await supabase.from('messages').select('id,sender_user_id,sender_type,content,created_at').eq('conversation_id',conversation).is('deleted_at',null).order('created_at');check(error);return(data??[])as ChatMessage[]}
export async function send(conversation:string,content:string){const sender=await userId();const{error}=await supabase.from('messages').insert({conversation_id:conversation,sender_user_id:sender,sender_type:'user',content:content.trim()});check(error)}
export async function block(target:string){const{error}=await supabase.rpc('block_user',{p_blocked_user_id:target,p_reason:'Blocked from Android beta'});check(error)}
export async function report(target:string){const{error}=await supabase.rpc('report_user',{p_reported_user_id:target,p_reason:'safety_concern',p_details:'Reported from Android beta'});check(error)}
export async function deleteAccount(){const{error}=await supabase.rpc('request_account_deletion',{p_reason:'Requested from Android beta'});check(error)}
export async function ask(prompt:string){const session=await supabase.auth.getSession();const token=session.data.session?.access_token;if(!token)throw new Error('Sign in required');const res=await fetch(`${apiBaseUrl}/api/ai/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({feature:'general_assistant',messages:[{role:'user',content:prompt.trim()}]})});const body=await res.json();if(!res.ok)throw new Error(body.error||'Assistant unavailable');return body.content as string}
