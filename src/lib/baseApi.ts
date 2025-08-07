import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {config} from "@/config.ts";

export const baseApi = createApi({
    reducerPath: 'baseApi',
    baseQuery: fetchBaseQuery({
        baseUrl: config.apiBackendBaseUrl,
        prepareHeaders: (headers, { getState }) => {
            // Get token from localStorage or Redux state
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            headers.set('Content-Type', 'application/json');
            headers.set('Accept', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Auth'],
    endpoints: () => ({}),
});