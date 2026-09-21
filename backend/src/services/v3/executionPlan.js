export function buildV2EquivalentPlan(decision, snapshot){
 if(!["BUY","SELL"].includes(decision)) return null;
 const close=Number(snapshot?.m15?.close),atr=Number(snapshot?.m15?.atr);
 if(!Number.isFinite(close)||!Number.isFinite(atr)||atr<=0)return null;
 const buy=decision==="BUY";
 const entry=close+(buy?-0.3:0.3)*atr;
 const stopLoss=entry+(buy?-2.5:2.5)*atr;
 const risk=Math.abs(entry-stopLoss);
 return {
  managementPlan:"TP1_LOCK_TO_TP1",direction:decision,signalClose:close,atr,
  entry,stopLoss,originalStopLoss:stopLoss,
  takeProfit1:entry+(buy?1:-1)*risk,
  takeProfit2:entry+(buy?2:-2)*risk,
  riskPoints:risk,rewardPoints:risk*2
 };
}
