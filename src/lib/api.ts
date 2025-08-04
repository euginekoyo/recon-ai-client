import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`; // Use bracket notation for consistency
        }
        // Ensure Content-Type is set for POST requests
        if (config.method?.toUpperCase() === 'POST') {
            config.headers['Content-Type'] = 'application/json';
        }
        console.log('Request:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data,
        });
        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        console.log('Response:', {
            url: response.config.url,
            status: response.status,
            data: response.data,
        });
        return response;
    },
    (error) => {
        console.error('Response Error:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data || error.message,
        });
        return Promise.reject(error);
    }
);

export default apiClient;