import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface ReconBatch {
    id: number;
    backofficeFile: string;
    vendorFile: string;
    backofficeMappings: string; // JSON string
    vendorMappings: string; // JSON string
    status: string;
    failureReason?: string;
    processedRecords?: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}

interface ReconRecord {
    id: number;
    batch: ReconBatch;
    matchStatus: string;
    confidence?: number;
    discrepancies?: string;
    fieldFlags?: string;
    displayData: string;
    vendorData: string;
    backofficeData?: string;
    resolved: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}

interface BatchResponse {
    batchId: number;
}

export const reconciliationApi = createApi({
    reducerPath: 'reconciliationApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:5000/api',
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
    tagTypes: ['Batches', 'Batch', 'Records'],
    endpoints: (builder) => ({
        uploadReconciliationFiles: builder.mutation<
            BatchResponse,
            { backofficeFile: File; vendorFile: File; backofficeTemplateId: string; vendorTemplateId: string }
        >({
            query: ({ backofficeFile, vendorFile, backofficeTemplateId, vendorTemplateId }) => {
                const formData = new FormData();
                formData.append('backofficeFile', backofficeFile);
                formData.append('vendorFile', vendorFile);
                formData.append('backofficeTemplateId', backofficeTemplateId);
                formData.append('vendorTemplateId', vendorTemplateId);
                return {
                    url: '/recon/upload',
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: ['Batches'],
        }),
        getBatches: builder.query<ReconBatch[], void>({
            query: () => '/recon/batches',
            providesTags: ['Batches'],
        }),
        getBatch: builder.query<ReconBatch, number>({
            query: (id) => `/recon/batches/${id}`,
            providesTags: ['Batch'],
        }),
        getRecords: builder.query<
            ReconRecord[],
            { id: number; status?: string; resolved?: boolean }
        >({
            query: ({ id, status, resolved }) => {
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (resolved !== undefined) params.append('resolved', resolved.toString());
                return `/recon/batches/${id}/records?${params.toString()}`;
            },
            providesTags: ['Records'],
        }),
        retryBatch: builder.mutation<void, number>({
            query: (id) => ({
                url: `/recon/batches/${id}/retry`,
                method: 'POST',
            }),
            invalidatesTags: ['Batch', 'Records'],
        }),
        resolveRecord: builder.mutation<void, number>({
            query: (id) => ({
                url: `/recon/records/${id}/resolve`,
                method: 'POST',
            }),
            invalidatesTags: ['Records'],
        }),
    }),
});

export const {
    useUploadReconciliationFilesMutation,
    useGetBatchesQuery,
    useGetBatchQuery,
    useGetRecordsQuery,
    useRetryBatchMutation,
    useResolveRecordMutation,
} = reconciliationApi;