import PriceCard from "../components/PriceCard";
import SignalCard from "../components/SignalCard";
import StatsCard from "../components/StatsCard";
import TradesTable from "../components/TradesTable";
import ChartCard from "../components/ChartCard";
import ActiveTradeCard from "../components/ActiveTradeCard";
import PressureCard from "../components/PressureCard";
import BacktestLab from "../components/BacktestLab";
import OutOfSampleValidation from "../components/OutOfSampleValidation";
import WalkForwardResearch from "../components/WalkForwardResearch";
import ManagementComparison from "../components/ManagementComparison";

const Dashboard=()=> <main className="dashboard-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="ambient ambient-three"/><div className="dashboard-wrap"><header className="hero-panel glass-panel"><div><div className="eyebrow">BTC INTELLIGENCE SYSTEM</div><h1>Trading Intelligence<span>Live signals. Historical proof.</span></h1><p>A visual command center for BTC market structure, execution analytics, trade performance and V2 strategy research.</p></div><div className="hero-orbit" aria-hidden="true"><div className="btc-core">₿</div><span className="orbit orbit-a"/><span className="orbit orbit-b"/><span className="orbit orbit-c"/></div></header><section className="dashboard-grid dashboard-grid-top"><div className="panel-wrap float-card"><PriceCard/></div><div className="panel-wrap float-card delay-one"><StatsCard/></div></section><section className="panel-wrap full-panel reveal-card"><ActiveTradeCard/></section><section className="dashboard-grid dashboard-grid-mid"><div className="panel-wrap reveal-card"><SignalCard/></div><div className="panel-wrap reveal-card delay-one"><PressureCard/></div></section><BacktestLab/><OutOfSampleValidation/><WalkForwardResearch/><ManagementComparison/><section className="panel-wrap full-panel reveal-card"><ChartCard/></section><section className="panel-wrap full-panel reveal-card"><TradesTable/></section><footer className="dashboard-footer"><span>BTC Bot Research Console</span><span>V2 execution analytics enabled</span></footer></div></main>;
export default Dashboard;
