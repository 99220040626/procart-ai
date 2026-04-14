import axios from 'axios';
import toast from 'react-hot-toast';

// 🚀 CLOUD ROUTING: Hardwired directly to your live Render Java Backend
const API = axios.create({
    baseURL: 'https://procart-ai.onrender.com/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
}, (error) => {
    return Promise.reject(error);
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            toast.error("Network Error: Ensure your Java Backend is running.");
        } else if (error.response.status === 403) {
            toast.error("Unauthorized: Please log in again.");
        }
        return Promise.reject(error);
    }
);

export default API;