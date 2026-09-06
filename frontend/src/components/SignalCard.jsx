import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import socket from "../socket/socket";

const fmt = (value, digits = 2) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
};

const ConditionList = ({ title, score, conditions, tone }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black tracking-[0.16em] text-slate-400">{title}</p>
        <p className="mt-1 text-sm text-slate-500">Setup alignment, not probability</p>
      </div>
      <strong className={`text-2xl ${tone}`}>{score ?? 0}%</strong>
    </div>

    <div className="space-y-2">
      {Object.entries(conditions || {}).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2">
          <span className="text-sm font-semibold text-slate-600">{key}</span>
          <span className={`text-xs font-black ${value ? "text-emerald-600" : "text-rose-500"}`}>
            {value ? "ALIGNED" : "NO"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SignalCard = () => {
  const [signal, setSignal] = useState(null);
  const [stats, setStats] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [lastSignal, setLastSignal] = useState(null);
  const [error, setError] = useState("");

  const loadAnalysis = async () => {
    try {
      setError("");
      const [signalRes, statsRes] = await Promise.all([
        api.get("/signals/test"),
        api.get("/stats"),
      ]);

      const nextSignal = signalRes.data;
      setSignal(nextSignal);
      setStats(statsRes.data);

      if (
        nextSignal.signal !== "NONE" &&
        nextSignal.signal !== lastSignal &&
        Notification.permission === "granted"
      ) {
        new Notification(`BTC ${nextSignal.signal}`, {
          body: `V2 setup alignment: ${nextSignal.signal === "BUY" ? nextSignal.buyScore : nextSignal.sellScore}%`,
        });
      }

      if (nextSignal.signal !== "NONE") setLastSignal(nextSignal.signal);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Live analysis unavailable");
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    loadAnalysis();
    const interval = setInterval(loadAnalysis, 15000);

    socket.on("countdown-update", (data) => {
      setCountdown(data.remainingSeconds);
    });

    return () => {
      clearInterval(interval);
      socket.off("countdown-update");
    };
  }, []);

  const research = useMemo(() => {
    if (!signal) return null;

    const direction = signal.signal;
    const buyAlignment = Number(signal.buyScore || 0);
    const sellAlignment = Number(signal.sellScore || 0);
    const dominant = buyAlignment === sellAlignment ? "NEUTRAL" : buyAlignment > sellAlignment ? "BUY" : "SELL";
    const alignment = Math.max(buyAlignment, sellAlignment);
    const gap = Math.abs(buyAlignment - sellAlignment);

    const directionStats = stats?.performance?.byDirection?.[direction];
    const historicalExpectancy = Number(directionStats?.expectancyPoints ?? directionStats?.expectancyR ?? 0);
    const historicalWinRate = Number(directionStats?.closedWinRate ?? directionStats?.winRate ?? 0);
    const historicalTrades = Number(directionStats?.closed ?? directionStats?.trades ?? 0);

    const emaDistance = Number(signal.currentPrice) - Number(signal.ema200);
    const atr = Number(signal.atr || 0);
    const emaDistanceAtr = atr ? emaDistance / atr : 0;

    let verdict = "WAIT FOR ALIGNMENT";
    let verdictTone = "text-amber-600";
    let reason = "The engine does not currently have a fully aligned executable setup.";

    if (direction === "BUY" || direction === "SELL") {
      if (historicalTrades > 0 && historicalExpectancy < 0) {
        verdict = `${direction} · RESEARCH CAUTION`;
        verdictTone = "text-rose-600";
        reason = `The live rules are aligned for ${direction}, but recent stored ${direction} performance has negative expectancy.`;
      } else if (alignment >= 80 && gap >= 20) {
        verdict = `${direction} · STRONG ALIGNMENT`;
        verdictTone = direction === "BUY" ? "text-emerald-600" : "text-rose-600";
        reason = `Trend, EMA, volume, liquidity and session conditions are strongly concentrated toward ${direction}.`;
      } else {
        verdict = `${direction} · MODERATE ALIGNMENT`;
        verdictTone = direction === "BUY" ? "text-emerald-600" : "text-rose-600";
        reason = `The engine has an executable ${direction} setup, but the evidence gap is not especially wide.`;
      }
    }

    return {
      dominant,
      alignment,
      gap,
      verdict,
      verdictTone,
      reason,
      historicalExpectancy,
      historicalWinRate,
      historicalTrades,
      emaDistanceAtr,
    };
  }, [signal, stats]);

  if (!signal) {
    return (
      <div className="rounded-3xl p-6 text-slate-600">
        <div className="eyebrow">LIVE RESEARCH</div>
        <h2 className="text-2xl font-black text-slate-800">Reading BTC market state…</h2>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  const activeTone =
    signal.signal === "BUY"
      ? "text-emerald-600"
      : signal.signal === "SELL"
      ? "text-rose-600"
      : "text-amber-600";

  return (
    <div className="rounded-3xl p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="eyebrow">V2 LIVE RESEARCH</div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Signal Intelligence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Live market evidence plus your bot&apos;s stored direction performance. Alignment scores describe rule agreement, not win probability.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-5 py-3 text-right shadow-sm">
          <p className="text-xs font-bold tracking-wider text-slate-400">NEXT 15M CANDLE</p>
          <strong className="text-2xl text-slate-800">
            {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </strong>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400">ENGINE SIGNAL</p>
          <p className={`mt-2 text-4xl font-black ${activeTone}`}>{signal.signal}</p>
          <p className="mt-3 text-sm text-slate-500">Legacy engine score: {signal.score ?? 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400">BTC PRICE</p>
          <p className="mt-2 text-2xl font-black text-slate-800">${Number(signal.currentPrice || 0).toLocaleString()}</p>
          <p className="mt-3 text-sm text-slate-500">EMA200 ${Number(signal.ema200 || 0).toLocaleString()}</p>
          <p className="text-sm text-slate-500">Distance {fmt(research?.emaDistanceAtr)} ATR</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400">MARKET STATE</p>
          <p className="mt-2 text-xl font-black capitalize text-slate-800">{signal.trend || "sideways"}</p>
          <p className="mt-3 text-sm text-slate-500">ATR {fmt(signal.atr)}</p>
          <p className="text-sm text-slate-500">Volume ratio {fmt(signal.volumeRatio)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-black tracking-[0.16em] text-slate-400">DOMINANT EVIDENCE</p>
          <p className={`mt-2 text-2xl font-black ${research?.dominant === "BUY" ? "text-emerald-600" : research?.dominant === "SELL" ? "text-rose-600" : "text-amber-600"}`}>
            {research?.dominant}
          </p>
          <p className="mt-3 text-sm text-slate-500">Alignment {research?.alignment}%</p>
          <p className="text-sm text-slate-500">Evidence gap {research?.gap} pts</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-cyan-50/80 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-indigo-400">RESEARCH VERDICT</p>
            <p className={`mt-1 text-2xl font-black ${research?.verdictTone}`}>{research?.verdict}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{research?.reason}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400">HIST TRADES</span>
              <strong className="text-slate-700">{research?.historicalTrades || "—"}</strong>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400">HIST WIN</span>
              <strong className="text-slate-700">{research?.historicalTrades ? `${fmt(research.historicalWinRate)}%` : "—"}</strong>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400">EXPECTANCY</span>
              <strong className={research?.historicalExpectancy < 0 ? "text-rose-600" : "text-emerald-600"}>
                {research?.historicalTrades ? fmt(research.historicalExpectancy, 3) : "—"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConditionList title="BUY EVIDENCE" score={signal.buyScore} conditions={signal.buyConditions} tone="text-emerald-600" />
        <ConditionList title="SELL EVIDENCE" score={signal.sellScore} conditions={signal.sellConditions} tone="text-rose-600" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
          <p className="text-xs font-black tracking-wider text-slate-400">STRUCTURE</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Trend <strong className="float-right capitalize text-slate-800">{signal.trend || "—"}</strong></p>
            <p>BOS <strong className="float-right text-slate-800">{signal.bos ?? "—"}</strong></p>
            <p>CHOCH <strong className="float-right text-slate-800">{signal.choch ?? "—"}</strong></p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
          <p className="text-xs font-black tracking-wider text-slate-400">FLOW FILTERS</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Volume spike <strong className="float-right text-slate-800">{signal.volumeSpike ? "YES" : "NO"}</strong></p>
            <p>Liquidity <strong className="float-right text-slate-800">{signal.liquidity ? signal.liquidityType : "NONE"}</strong></p>
            <p>Session <strong className="float-right text-slate-800">{signal.session ? "ACTIVE" : "OFF"}</strong></p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
          <p className="text-xs font-black tracking-wider text-slate-400">TRADE MAP</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Entry <strong className="float-right text-slate-800">{signal.entry ? fmt(signal.entry) : "—"}</strong></p>
            <p>Stop <strong className="float-right text-rose-600">{signal.stopLoss ? fmt(signal.stopLoss) : "—"}</strong></p>
            <p>TP1 <strong className="float-right text-emerald-600">{signal.takeProfit1 ? fmt(signal.takeProfit1) : "—"}</strong></p>
            <p>TP2 <strong className="float-right text-emerald-600">{signal.takeProfit2 ? fmt(signal.takeProfit2) : "—"}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
