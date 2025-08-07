import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {config} from "@/config.ts";

interface TemplateField {
    id?: string; // Optional, as it may not always be returned
    fileHeader: string; // Matches `fileHeader` in TemplateField.java
    coreField: string; // Matches `coreField` in TemplateField.java
    type: 'string' | 'number' | 'date'; // Retained for frontend validation
}

export interface Template {
    id: string; // Convert Long to string for TypeScript
    name: string;
    type: 'BACKOFFICE' | 'VENDOR'; // Matches TemplateType.java enum
    fields: TemplateField[]; // Matches `fields` in Template.java
    createdAt?: string;
    updatedAt?: string;
}

export const templateApi = createApi({
    reducerPath: 'templateApi',
    baseQuery: fetchBaseQuery({
        baseUrl: config.apiBackendBaseUrl, // Ensure this matches your backend URL
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
        fetchFn: async (...args) => {
            try {
                return await fetch(...args);
            } catch (error) {
                console.error('API request failed:', error);
                throw error;
            }
        },
    }),
    tagTypes: ['Templates', 'Template'],
    endpoints: (builder) => ({
        getTemplates: builder.query<Template[], void>({
            query: () => '/templates',
            providesTags: ['Templates'],
        }),
        getTemplatesByType: builder.query<Template[], string>({
            query: (type) => `/templates/${type.toUpperCase()}`,
            providesTags: ['Templates'],
        }),
        getTemplate: builder.query<Template, string>({
            query: (id) => `/templates/id/${id}`,
            providesTags: ['Template'],
        }),
        createTemplate: builder.mutation<Template, Omit<Template, 'id' | 'createdAt' | 'updatedAt'>>({
            query: (template) => ({
                url: '/templates',
                method: 'POST',
                body: template,
            }),
            invalidatesTags: ['Templates'],
        }),
        updateTemplate: builder.mutation<Template, Partial<Template> & { id: string }>({
            query: ({ id, ...template }) => ({
                url: `/templates/${id}`,
                method: 'PUT',
                body: template,
            }),
            invalidatesTags: ['Templates', 'Template'],
        }),
        deleteTemplate: builder.mutation<void, string>({
            query: (id) => ({
                url: `/templates/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Templates'],
        }),
    }),
});

export const {
    useGetTemplatesQuery,
    useGetTemplatesByTypeQuery,
    useGetTemplateQuery,
    useCreateTemplateMutation,
    useUpdateTemplateMutation,
    useDeleteTemplateMutation,
} = templateApi;