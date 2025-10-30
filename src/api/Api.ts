import axios from "axios";


export const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'https://pinkpunknestbot-production.up.railway.app',
    withCredentials: true,
});




