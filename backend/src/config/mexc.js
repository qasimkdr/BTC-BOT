import axios from "axios";

const mexcApi = axios.create({
  baseURL: "https://api.mexc.com",
});

export default mexcApi;