
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config.ts';

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

interface StatusCounts {
    MATCH: number;
    PARTIAL_MATCH: number;
    MISMATCH: number;
    DUPLICATE: number;
    MISSING: number;
    [key: string]: number;
}

interface RefreshTokenResponse {
    token: string;
}

const baseQuery = fetchBaseQuery({
    baseUrl: config.apiBackendBaseUrl,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        } else {
            console.warn('No token found in localStorage');
        }
        return headers;
    },
    fetchFn: async (...args) => {
        try {
            const response = await fetch(...args);
            if (response.status === 401) {
                console.error('401 Unauthorized: Attempting to refresh token');
                // Attempt to refresh token
                const refreshResponse = await fetch(`${config.apiBackendBaseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('refreshToken') || ''}`,
                    },
                });
                if (refreshResponse.ok) {
                    const { token }: RefreshTokenResponse = await refreshResponse.json();
                    localStorage.setItem('token', token);
                    // Retry the original request with the new token
                    const retryArgs = [...args];
                    retryArgs[1].headers = {
                        ...args[1].headers,
                        Authorization: `Bearer ${token}`,
                    };
                    return await fetch(...retryArgs);
                } else {
                    console.error('Token refresh failed:', refreshResponse.status);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login'; // Redirect to login
                    throw new Error('Unauthorized: Please log in again');
                }
            }
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API request failed: ${response.status} - ${errorText}`);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    },
});

export const reconciliationApi = createApi({
    reducerPath: 'reconciliationApi',
    baseQuery,
    tagTypes: ['Batches', 'Batch', 'Records', 'StatusCounts'],
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
                    url: '/api/recon/upload',
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: ['Batches'],
        }),
        getBatches: builder.query<ReconBatch[], void>({
            query: () => '/api/recon/batches',
            providesTags: ['Batches'],
        }),
        getBatch: builder.query<ReconBatch, number>({
            query: (id) => {
                if (!Number.isInteger(id)) {
                    throw new Error('Invalid batch ID');
                }
                return `/api/recon/batches/${id}`;
            },
            providesTags: ['Batch'],
        }),
        getRecords: builder.query<
            ReconRecord[],
            { id: number; status?: string; resolved?: boolean }
        >({
            query: ({ id, status, resolved }) => {
                if (!Number.isInteger(id)) {
                    throw new Error('Invalid batch ID');
                }
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (resolved !== undefined) params.append('resolved', resolved.toString());
                return `/api/recon/batches/${id}/records?${params.toString()}`;
            },
            providesTags: ['Records'],
        }),
        getStatusCounts: builder.query<StatusCounts, number>({
            query: (batchId) => {
                if (!Number.isInteger(batchId)) {
                    throw new Error('Invalid batch ID');
                }
                return `/api/recon/batches/${batchId}/status-counts`;
            },
            providesTags: (result, error, batchId) => [
                { type: 'StatusCounts', id: batchId },
            ],
        }),
        retryBatch: builder.mutation<void, number>({
            query: (id) => {
                if (!Number.isInteger(id)) {
                    throw new Error('Invalid batch ID');
                }
                return {
                    url: `/api/recon/batches/${id}/retry`,
                    method: 'POST',
                };
            },
            invalidatesTags: ['Batch', 'Records', 'StatusCounts'],
        }),
        resolveRecord: builder.mutation<void, { id: number; comment: string }>({
            query: ({ id, comment }) => {
                if (!Number.isInteger(id)) {
                    throw new Error('Invalid record ID');
                }
                return {
                    url: `/api/recon/records/${id}/resolve`,
                    method: 'POST',
                    body: { comment },
                };
            },
            invalidatesTags: ['Records', 'StatusCounts'],
        }),
    }),
});

export const {
    useUploadReconciliationFilesMutation,
    useGetBatchesQuery,
    useGetBatchQuery,
    useGetRecordsQuery,
    useGetStatusCountsQuery,
    useRetryBatchMutation,
    useResolveRecordMutation,
} = reconciliationApi;
