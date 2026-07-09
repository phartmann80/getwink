import { NextResponse } from 'next/server';
export function GET(){return NextResponse.json({ok:true,service:'getwink',timestamp:new Date().toISOString()})}
