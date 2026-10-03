"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { installForgeSyncListeners, setForgeSyncToken, flushForgeEventQueue } from "../lib/forge-sync";

export default function ForgeSyncBridge(){
  const { getToken, isSignedIn } = useAuth();
  useEffect(()=>{
    let disposed=false;
    const sync=async()=>{
      const token=isSignedIn ? await getToken() : null;
      if(disposed) return;
      setForgeSyncToken(token);
      if(token) void flushForgeEventQueue(token);
    };
    void sync();
    const cleanup=installForgeSyncListeners();
    return ()=>{disposed=true;setForgeSyncToken(null);cleanup();};
  },[getToken,isSignedIn]);
  return null;
}
