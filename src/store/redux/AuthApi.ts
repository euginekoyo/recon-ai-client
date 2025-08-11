import { baseApi } from '@/lib/baseApi.ts';
import type { FetchArgs } from '@reduxjs/toolkit/query';

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<
            { token: string },
            { username: string; password: string }
        >({
            query: (credentials): FetchArgs => {
                const body = { username: credentials.username, password: credentials.password };
                console.log('Login Query Payload:', body); // Debug payload
                return {
                    url: '/api/auth/login',
                    method: 'POST',
                    body, // Let Axios handle JSON.stringify
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
        }),
        register: builder.mutation<
            { message: string },
            { username: string; email: string; password: string; firstName: string; lastName: string }
        >({
            query: (newUser): FetchArgs => ({
                url: '/api/auth/register',
                method: 'POST',
                body: newUser,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        }),
        getProfile: builder.query<any, void>({
            query: (): string => '/api/auth/profile',
            providesTags: ['Auth'],
        }),
    }),
    overrideExisting: false,
});

export const { useLoginMutation, useRegisterMutation, useGetProfileQuery } = authApi;