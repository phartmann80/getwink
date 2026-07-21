export type Gender = 'woman' | 'man' | 'non_binary' | 'other' | 'prefer_not_to_say';
export type Profile = { id:string; display_name:string|null; gender:Gender|null; bio:string|null; birthdate:string|null; city:string|null; country:string|null; onboarding_completed_at:string|null };
export type Candidate = Pick<Profile,'id'|'display_name'|'gender'|'bio'|'city'|'country'> & { photoUrl:string|null };
export type MatchCard = { id:string; conversationId:string|null; otherUserId:string; name:string; photoUrl:string|null };
export type ChatMessage = { id:string; sender_user_id:string|null; sender_type:'user'|'assistant'|'system'; content:string; created_at:string };
