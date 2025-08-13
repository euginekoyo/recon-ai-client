
import { config } from '@/config.ts';

const api = {
    get: async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        const headers = new Headers(options.headers || {});
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        const response = await fetch(`${config.apiBackendBaseUrl}${url}`, {
            ...options,
            headers,
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    },
};

export const downloadReport = async (batchId: string, reportType: 'summary' | 'details') => {
    try {
        const endpoint = reportType === 'summary'
            ? `/api/reports/summary/${batchId}`
            : `/api/reports/details/${batchId}`;

        const response = await api.get(endpoint, {
            headers: {
                'Content-Type': 'application/octet-stream',
            },
        });

        return response.blob();
    } catch (error) {
        console.error('Error downloading report:', error);
        throw error;
    }
};
