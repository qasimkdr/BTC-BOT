import axios from "axios";

const api = axios.create({
  baseURL: "https://btc-bot-lqzr.onrender.com/api",
});

export default api;