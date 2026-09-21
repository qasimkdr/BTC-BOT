import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://btc-bot-lqzr.onrender.com/api",
  timeout: 20000,
});

export default api;
