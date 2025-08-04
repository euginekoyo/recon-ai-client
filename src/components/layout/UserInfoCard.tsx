import { useState, useEffect } from 'react';
import { User, Shield, Key, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    getUsername,
    getUserRoles,
    getUserPermissions,
    isAuthenticated,
    isAdmin,
    isModerator,
    logAuthDebugInfo,
    decodeJWT,
    isTokenValid
} from '@/lib/auth'; // Adjust the import path as needed

interface UserInfo {
    username: string | null;
    roles: string[];
    permissions: string[];
    isAuthenticated: boolean;
    isAdmin: boolean;
    isModerator: boolean;
    tokenValid: boolean;
    tokenExpiry: number | null;
}

export const UserInfoCard = () => {
    const [userInfo, setUserInfo] = useState<UserInfo>({
        username: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        isAdmin: false,
        isModerator: false,
        tokenValid: false,
        tokenExpiry: null
    });

    const [showDebugInfo, setShowDebugInfo] = useState(false);

    useEffect(() => {
        const loadUserInfo = () => {
            const token = localStorage.getItem('token');
            let tokenExpiry = null;

            if (token) {
                const payload = decodeJWT(token);
                tokenExpiry = payload?.exp || null;
            }

            setUserInfo({
                username: getUsername(),
                roles: getUserRoles(),
                permissions: getUserPermissions(),
                isAuthenticated: isAuthenticated(),
                isAdmin: isAdmin(),
                isModerator: isModerator(),
                tokenValid: token ? isTokenValid(token) : false,
                tokenExpiry
            });
        };

        loadUserInfo();

        // Refresh user info every 30 seconds
        const interval = setInterval(loadUserInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatTokenExpiry = () => {
        if (!userInfo.tokenExpiry) return 'No expiry';

        const expiryDate = new Date(userInfo.tokenExpiry * 1000);
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();

        if (diffMs <= 0) return 'Expired';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m remaining`;
        }
        return `${diffMinutes}m remaining`;
    };

    const handleDebugInfo = () => {
        logAuthDebugInfo();
        setShowDebugInfo(!showDebugInfo);
    };

    return (
        <div className="space-y-4">
            {/* Main User Info Card */}
            <Card className="w-full max-w-2xl">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Authentication Status */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                            {userInfo.isAuthenticated ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                                <p className="font-medium">Authentication Status</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {userInfo.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                                </p>
                            </div>
                        </div>
                        <Badge variant={userInfo.isAuthenticated ? 'default' : 'destructive'}>
                            {userInfo.isAuthenticated ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>

                    {/* User Details */}
                    {userInfo.isAuthenticated && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</p>
                                    <p className="text-slate-900 dark:text-slate-100">
                                        {userInfo.username || 'Not available'}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Type</p>
                                    <div className="flex gap-2">
                                        {userInfo.isAdmin && (
                                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                <Shield className="h-3 w-3 mr-1" />
                                                Admin
                                            </Badge>
                                        )}
                                        {userInfo.isModerator && !userInfo.isAdmin && (
                                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                <Shield className="h-3 w-3 mr-1" />
                                                Moderator
                                            </Badge>
                                        )}
                                        {!userInfo.isAdmin && !userInfo.isModerator && (
                                            <Badge variant="secondary">User</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Token Status */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Token Status
                                </p>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <div>
                                        <p className="text-sm">
                                            Status: {userInfo.tokenValid ? 'Valid' : 'Invalid/Expired'}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {formatTokenExpiry()}
                                        </p>
                                    </div>
                                    <Badge variant={userInfo.tokenValid ? 'default' : 'destructive'}>
                                        {userInfo.tokenValid ? 'Valid' : 'Invalid'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Roles */}
                            {userInfo.roles.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Roles</p>
                                    <div className="flex flex-wrap gap-2">
                                        {userInfo.roles.map((role, index) => (
                                            <Badge key={index} variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Permissions */}
                            {userInfo.permissions.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        Permissions
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {userInfo.permissions.map((permission, index) => (
                                            <Badge key={index} variant="outline" className="bg-green-50 dark:bg-green-900/20">
                                                {permission}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Debug Button */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDebugInfo}
                            className="w-full"
                        >
                            {showDebugInfo ? 'Hide' : 'Show'} Debug Info (Check Console)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Debug Information Card */}
            {showDebugInfo && (
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-sm">Debug Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-xs font-mono">
                            <p>Check the browser console for detailed debug information.</p>
                            <p className="text-slate-600 dark:text-slate-400">
                                This includes token payload, validation status, and all auth-related data.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// Simple hook for using auth data in other components
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