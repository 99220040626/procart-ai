import axios from 'axios';
import toast from 'react-hot-toast';

// 🚀 Optimized API Instance
const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://procart-ai.onrender.com/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 // prevent long hanging requests
});

// ✅ Request Interceptor
API.interceptors.request.use(
    (req) => {
        const token = localStorage.getItem('token');

        if (token) {
            req.headers.Authorization = `Bearer ${token}`;
        }

        // 🚀 Prevent duplicate requests / cache busting issue
        if (req.method === 'get') {
            req.params = {
                ...(req.params || {}),
                _t: Date.now() // avoid stale cache issues
            };
        }

        return req;
    },
    (error) => Promise.reject(error)
);

// ✅ Response Interceptor
API.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (!error.response) {
            toast.error("Network error. Please check your connection.");
        } else {
            const { status, data } = error.response;

            if (status === 401) {
                localStorage.removeItem('token');
                toast.error("Session expired. Please login again.");
                window.location.href = "/login";
            } else if (status === 403) {
                toast.error("Access denied.");
            } else if (status === 500) {
                toast.error("Server error. Please try again later.");
            } else {
                toast.error(data?.message || "Something went wrong.");
            }
        }

        return Promise.reject(error);
    }
);

// 🚀 Helper for optimized API calls (prevents repeated slow calls)
export const fetchWithCache = async (key, requestFn, ttl = 300000) => {
    const cached = sessionStorage.getItem(key);

    if (cached) {
        const { data, expiry } = JSON.parse(cached);
        if (Date.now() < expiry) {
            return data;
        }
    }

    const response = await requestFn();

    sessionStorage.setItem(
        key,
        JSON.stringify({
            data: response,
            expiry: Date.now() + ttl
        })
    );

    return response;
};

export default API;