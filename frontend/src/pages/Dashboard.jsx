import PriceCard from "../components/PriceCard";
import SignalCard from "../components/SignalCard";
import StatsCard from "../components/StatsCard";
import TradesTable from "../components/TradesTable";
import ChartCard from "../components/ChartCard";
import ActiveTradeCard from "../components/ActiveTradeCard";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">
        BTC Trading Dashboard
      </h1>

      
      {/* Other Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PriceCard />
        <ActiveTradeCard />
        <StatsCard />
      </div>

      {/* Full Width Signal */}
      <div className="mb-6 mt-4">
        <SignalCard />
      </div>



      <div className="mt-6">
        <ChartCard />
      </div>

      <div className="mt-6">
        <TradesTable />
      </div>
    </div>
  );
};

export default Dashboard;