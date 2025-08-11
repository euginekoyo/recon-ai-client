import { createApi, fetchBaseQuery, FetchArgs } from '@reduxjs/toolkit/query/react';
import {config} from "@/config.ts"
interface UserData {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    roleNames: string[];
    permissions: string[];
    isActive: boolean;
    isEmailVerified: boolean;
    last_active?: string;
}

interface Role {
    id: string;
    role: string;
    permissions: { name: string }[];
}

export interface Permission {
    id: string;
    name: string;
}

interface InviteUserRequest {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    roleNames: string[];
}

interface ChangePasswordRequest {
    username: string;
    currentPassword: string;
    newPassword: string;
}

interface ResendVerificationRequest {
    email: string;
}

interface ResetPasswordRequest {
    email: string;
}

interface UpdateProfileRequest {
    firstName: string;
    lastName: string;
    email: string;
}

export const accessControlApi = createApi({
    reducerPath: 'accessControlApi',
    baseQuery: fetchBaseQuery({
        baseUrl: config.apiBackendBaseUrl,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            headers.set('Content-Type', 'application/json');
            headers.set('Accept', 'application/json');
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
    tagTypes: ['Users', 'Roles', 'Permissions'],
    endpoints: (builder) => ({
        getUsers: builder.query<UserData[], void>({
            query: (): string => {
                console.log('Fetching all users');
                return '/api/admin/users';
            },
            providesTags: ['Users'],
        }),
        assignRolesToUser: builder.mutation<{ message: string }, { userId: string; roleNames: string[] }>({
            query: ({ userId, roleNames }): FetchArgs => {
                console.log('Assign Roles Payload:', { userId, roleNames });
                return {
                    url: `/api/admin/users/${userId}/roles`,
                    method: 'POST',
                    body: roleNames,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
            invalidatesTags: ['Users'],
        }),
        updateUser: builder.mutation<{ message: string }, { userId: string; userData: Partial<UserData> }>({
            query: ({ userId, userData }): FetchArgs => ({
                url: `/api/admin/users/${userId}`,
                method: 'PUT',
                body: userData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Update user failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
            invalidatesTags: ['Users'],
        }),
        deleteUser: builder.mutation<{ message: string }, string>({
            query: (userId): FetchArgs => ({
                url: `/api/admin/users/${userId}`,
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Delete user failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
            invalidatesTags: ['Users'],
        }),
        inviteUser: builder.mutation<{ message: string }, InviteUserRequest>({
            query: (user): FetchArgs => ({
                url: '/api/auth/register',
                method: 'POST',
                body: user,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Invite user failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
            invalidatesTags: ['Users'],
        }),
        createRole: builder.mutation<{ message: string; role: string }, { role: string }>({
            query: (roleData): FetchArgs => ({
                url: '/api/admin/roles',
                method: 'POST',
                body: { role: roleData.role, permissions: [] },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Create role failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
            invalidatesTags: ['Roles'],
        }),
        updateRole: builder.mutation<{ id: string; role: string }, { roleId: string; roleData: { role: string } }>({
            query: ({ roleId, roleData }): FetchArgs => {
                console.log('Update Role Payload:', { roleId, roleData });
                return {
                    url: `/api/admin/roles/${roleId}`,
                    method: 'PUT',
                    body: roleData,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
            invalidatesTags: ['Roles'],
        }),
        deleteRole: builder.mutation<{ message: string }, string>({
            query: (roleId): FetchArgs => {
                console.log('Delete Role ID:', roleId);
                return {
                    url: `/api/admin/roles/${roleId}`,
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
            invalidatesTags: ['Roles'],
        }),
        getRoles: builder.query<Role[], void>({
            query: (): string => {
                console.log('Fetching all roles');
                return '/api/admin/roles';
            },
            providesTags: ['Roles'],
        }),
        createPermission: builder.mutation<{ id: string; name: string }, { name: string }>({
            query: (permission): FetchArgs => {
                console.log('Create Permission Payload:', permission);
                return {
                    url: '/api/admin/permissions',
                    method: 'POST',
                    body: permission,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
            invalidatesTags: ['Permissions'],
        }),
        getPermissions: builder.query<Permission[], void>({
            query: (): string => {
                console.log('Fetching all permissions');
                return '/api/admin/permissions';
            },
            providesTags: ['Permissions'],
        }),
        assignPermissionToRole: builder.mutation<{ message: string }, { roleId: string; permission: { name: string } }>({
            query: ({ roleId, permission }): FetchArgs => {
                console.log('Assign Permission Payload:', { roleId, permission });
                return {
                    url: `/api/admin/roles/${roleId}/permissions`,
                    method: 'POST',
                    body: permission,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            },
            invalidatesTags: ['Roles', 'Permissions'],
        }),
        verifyEmail: builder.mutation<{ message: string }, string>({
            query: (token): FetchArgs => ({
                url: `/api/auth/verify?token=${token}`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Email verification failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
        }),
        activateUser: builder.mutation<{ message: string }, string>({
            query: (token): FetchArgs => ({
                url: `/api/auth/activate?token=${token}`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('User activation failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
        }),
        resendVerification: builder.mutation<{ message: string }, ResendVerificationRequest>({
            query: (request): FetchArgs => ({
                url: '/api/auth/resend-verification',
                method: 'POST',
                body: request,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Resend verification failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
        }),
        resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
            query: (request): FetchArgs => ({
                url: '/api/auth/reset-password',
                method: 'POST',
                body: request,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Reset password failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
        }),
        changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
            query: (request): FetchArgs => ({
                url: '/api/auth/change-password',
                method: 'POST',
                body: request,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                responseHandler: async (response) => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error('Change password failed:', error);
                        throw error;
                    }
                    return response.json();
                },
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetUsersQuery,
    useAssignRolesToUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useInviteUserMutation,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useGetRolesQuery,
    useCreatePermissionMutation,
    useGetPermissionsQuery,
    useAssignPermissionToRoleMutation,
    useVerifyEmailMutation,
    useActivateUserMutation,
    useResendVerificationMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
} = accessControlApi;