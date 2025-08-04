import { useState, useEffect } from 'react';

interface JWTPayload {
    sub?: string;
    roles?: string[];
    permissions?: string[];
    exp?: number;
    iat?: number;
}

export const decodeJWT = (token: string): JWTPayload | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('Invalid JWT format: token must have 3 parts');
            return null;
        }

        const payload = parts[1];
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        const decodedPayload = atob(paddedPayload);
        const parsed = JSON.parse(decodedPayload);

        console.debug('Decoded JWT payload:', parsed);
        return parsed;
    } catch (error) {
        console.error('Failed to decode JWT token:', error);
        return null;
    }
};

export const isTokenValid = (token: string): boolean => {
    try {
        const payload = decodeJWT(token);
        if (!payload || !payload.exp) {
            console.debug('Token has no expiration or is invalid');
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const isValid = payload.exp > currentTime;

        if (!isValid) {
            console.debug('Token expired:', {
                exp: payload.exp,
                current: currentTime,
                expiredBy: currentTime - payload.exp
            });
        }

        return isValid;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
};

export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.debug('No token found');
        return false;
    }

    const valid = isTokenValid(token);
    if (!valid) {
        console.debug('Token invalid, removing from storage');
        localStorage.removeItem('token');
    }

    return valid;
};

export const getUserRoles = (): string[] => {
    try {
        const token = localStorage.getItem('token');
        if (!token || !isTokenValid(token)) {
            console.debug('No valid token for getting roles');
            return [];
        }

        const payload = decodeJWT(token);
        const roles = payload?.roles || [];
        console.debug('User roles from token:', roles);
        return roles;
    } catch (error) {
        console.error('Error getting user roles:', error);
        return [];
    }
};

export const getUserPermissions = (): string[] => {
    try {
        const token = localStorage.getItem('token');
        if (!token || !isTokenValid(token)) {
            console.debug('No valid token for getting permissions');
            return [];
        }

        const payload = decodeJWT(token);
        const permissions = payload?.permissions || [];
        console.debug('User permissions from token:', permissions);
        return permissions;
    } catch (error) {
        console.error('Error getting user permissions:', error);
        return [];
    }
};

export const getUsername = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token || !isTokenValid(token)) {
            console.debug('No valid token for getting username');
            return null;
        }

        const payload = decodeJWT(token);
        const username = payload?.sub || null;
        console.debug('Username from token:', username);
        return username;
    } catch (error) {
        console.error('Error getting username:', error);
        return null;
    }
};

export const isAdmin = (): boolean => {
    try {
        const roles = getUserRoles();
        const admin = roles.includes('ROLE_ADMIN');
        console.debug('Is admin check:', { roles, admin });
        return admin;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

export const isModerator = (): boolean => {
    try {
        const roles = getUserRoles();
        const moderator = roles.includes('ROLE_MODERATOR') || roles.includes('ROLE_ADMIN');
        console.debug('Is moderator check:', { roles, moderator });
        return moderator;
    } catch (error) {
        console.error('Error checking moderator status:', error);
        return false;
    }
};

export const hasRole = (role: string): boolean => {
    try {
        const roles = getUserRoles();
        const hasRequestedRole = roles.includes(role);
        console.debug('Has role check:', { requestedRole: role, userRoles: roles, hasRequestedRole });
        return hasRequestedRole;
    } catch (error) {
        console.error('Error checking role:', error);
        return false;
    }
};

export const hasPermission = (permission: string): boolean => {
    try {
        const permissions = getUserPermissions();
        const hasRequestedPermission = permissions.includes(permission);
        console.debug('Has permission check:', { requestedPermission: permission, userPermissions: permissions, hasRequestedPermission });
        return hasRequestedPermission;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
};

export const refreshToken = async (): Promise<boolean> => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.debug('No token to refresh');
            return false;
        }

        console.debug('Attempting to refresh token');
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            console.error('Token refresh failed:', response.status, response.statusText);
            localStorage.removeItem('token');
            return false;
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            console.debug('Token refreshed successfully');
            return true;
        } else {
            console.error('No token in refresh response');
            return false;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        localStorage.removeItem('token');
        return false;
    }
};

export const updateToken = (newToken: string): void => {
    if (newToken) {
        localStorage.setItem('token', newToken);
        console.debug('Updated JWT token in localStorage');
    } else {
        console.error('No token provided for update');
    }
};

export const logout = (): void => {
    localStorage.removeItem('token');
    console.debug('User logged out');
};

export const logAuthDebugInfo = (): void => {
    console.group('Auth Debug Info');
    console.log('Token exists:', !!localStorage.getItem('token'));
    console.log('Is authenticated:', isAuthenticated());
    console.log('Username:', getUsername());
    console.log('User roles:', getUserRoles());
    console.log('User permissions:', getUserPermissions());
    console.log('Is admin:', isAdmin());
    console.log('Is moderator:', isModerator());

    const token = localStorage.getItem('token');
    if (token) {
        const payload = decodeJWT(token);
        console.log('Token payload:', payload);
        console.log('Token valid:', isTokenValid(token));
    }
    console.groupEnd();
};

// Add the useAuth hook
export const useAuth = () => {
    const [authData, setAuthData] = useState({
        username: null as string | null,
        roles: [] as string[],
        permissions: [] as string[],
        isAuthenticated: false,
        isAdmin: false,
        isModerator: false,
    });

    useEffect(() => {
        const updateAuthData = () => {
            setAuthData({
                username: getUsername(),
                roles: getUserRoles(),
                permissions: getUserPermissions(),
                isAuthenticated: isAuthenticated(),
                isAdmin: isAdmin(),
                isModerator: isModerator(),
            });
        };

        updateAuthData();
    }, []);

    return authData;
};