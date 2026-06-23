import fs from "fs";
import path from "path";

const folders = [
  "src/pages",
  "src/components",
  "src/services",
  "src/hooks",
  "src/layouts",
];

const files = {
  "src/pages/Dashboard.jsx": `
const Dashboard = () => {
  return (
    <div>
      Dashboard
    </div>
  );
};

export default Dashboard;
`,

  "src/components/PriceCard.jsx": `
const PriceCard = () => {
  return (
    <div>
      PriceCard
    </div>
  );
};

export default PriceCard;
`,

  "src/components/SignalCard.jsx": `
const SignalCard = () => {
  return (
    <div>
      SignalCard
    </div>
  );
};

export default SignalCard;
`,

  "src/components/StatsCard.jsx": `
const StatsCard = () => {
  return (
    <div>
      StatsCard
    </div>
  );
};

export default StatsCard;
`,

  "src/components/TradesTable.jsx": `
const TradesTable = () => {
  return (
    <div>
      TradesTable
    </div>
  );
};

export default TradesTable;
`,

  "src/services/api.js": `
import axios from "axios";

const api = axios.create({
  baseURL: "https://btc-bot-lqzr.onrender.com/api",
});

export default api;
`,

  "src/services/socket.js": `
import { io } from "socket.io-client";

const socket = io(
  "https://btc-bot-lqzr.onrender.com"
);

export default socket;
`,

  "src/hooks/useSocket.js": `
const useSocket = () => {
  return null;
};

export default useSocket;
`,

  "src/layouts/MainLayout.jsx": `
const MainLayout = ({
  children,
}) => {
  return (
    <div>
      {children}
    </div>
  );
};

export default MainLayout;
`,
};

folders.forEach((folder) => {
  fs.mkdirSync(folder, {
    recursive: true,
  });
});

Object.entries(files).forEach(
  ([filePath, content]) => {
    fs.writeFileSync(
      filePath,
      content.trim()
    );
  }
);

console.log(
  "✅ React Structure Created Successfully"
);