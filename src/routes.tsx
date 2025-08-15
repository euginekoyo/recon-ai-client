import {Routes, Route, Navigate, useLocation} from "react-router-dom";
import {DashboardLayout} from "@/components/layout/DashboardLayout";
import Index from "@/pages/Index";
import AccessControl from "@/pages/AccessControl/AccessControl.tsx";
import Reconciliation from "@/pages/Reconciliation/Reconciliation.tsx";
import ReconciledTransactions from "@/pages/Reconciled/ReconciledTransactions.tsx";
import SignIn from "@/pages/Auth/SignIn.tsx";
import NotFound from "@/pages/NotFound";
import {
    isAuthenticated,
    isAdmin,
    isModerator,
    getUserRoles,
    hasPermission,
    getUserPermissions,
    getUsername
} from '@/lib/auth.ts';
import AuthHandler from "@/pages/Auth/AuthHandler.tsx";
import TemplateCreator from "@/pages/TemplateCreator/TemplateCreator.tsx";

interface ProtectedRouteProps {
    children: JSX.Element;
    requireAdmin?: boolean;
    requireModerator?: boolean;
    requiredPermission?: string;
    allowedRoles?: string[];
}

// ProtectedRoute component to guard routes based on authentication and permissions
const ProtectedRoute = ({
                            children,
                            requireAdmin = false,
                            requireModerator = false,
                            requiredPermission,
                            allowedRoles = []
                        }: ProtectedRouteProps) => {
    if (!isAuthenticated()) {
        console.log('Unauthenticated access attempt. Redirecting to sign-in.');
        return <Navigate to="/" replace/>;
    }

    // Log debug info for admin-restricted routes
    if (requireAdmin) {
        console.log('Admin required. Current status:', {
            isAuthenticated: isAuthenticated(),
            isAdmin: isAdmin(),
            userRoles: getUserRoles(),
            userPermissions: getUserPermissions()
        });
    }

    // Check admin role
    if (requireAdmin && !isAdmin()) {
        console.log('User is not an admin. Redirecting to /unauthorized.');
        return <Navigate to="/unauthorized" replace/>;
    }

    // Check moderator role
    if (requireModerator && !isModerator()) {
        console.log('User is not a moderator. Redirecting to /unauthorized.');
        return <Navigate to="/unauthorized" replace/>;
    }

    // Check required permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
        console.log(`User lacks permission: ${requiredPermission}. Redirecting to /unauthorized.`);
        return <Navigate to="/unauthorized" replace/>;
    }

    // Check allowed roles
    if (allowedRoles.length > 0) {
        const userRoles = getUserRoles();
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            console.log(`User lacks required roles: ${allowedRoles.join(', ')}. Redirecting to /unauthorized.`);
            return <Navigate to="/unauthorized" replace/>;
        }
    }

    return children;
};

// Unauthorized component for access denied scenarios
const Unauthorized = () => {
    const userRoles = getUserRoles();
    const userPermissions = getUserPermissions();
    const username = getUsername();

    return (
        <DashboardLayout>
            <div className="p-6 text-center">
                <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
                <p className="text-muted-foreground mt-2">
                    You don't have permission to access this page.
                </p>
                <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
                    <h3 className="font-semibold mb-2">Debug Info:</h3>
                    <p><strong>Username:</strong> {username || 'Not found'}</p>
                    <p><strong>Current Roles:</strong> {userRoles.length > 0 ? userRoles.join(', ') : 'No roles'}</p>
                    <p><strong>Current
                        Permissions:</strong> {userPermissions.length > 0 ? userPermissions.join(', ') : 'No permissions'}
                    </p>
                    <p><strong>Is Admin:</strong> {isAdmin() ? 'Yes' : 'No'}</p>
                    <p><strong>Is Authenticated:</strong> {isAuthenticated() ? 'Yes' : 'No'}</p>
                </div>
                <button
                    onClick={() => window.history.back()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                >
                    Go Back
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    Refresh & Retry
                </button>
            </div>
        </DashboardLayout>
    );
};

// Main routing component
const RoutesPage = () => {
    const location = useLocation();

    // Extract token from query parameter for /auth/verify and /auth/activate
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');

    return (
        <Routes>
            {/* Dashboard route: Requires VIEW_DASHBOARD permission */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requiredPermission="VIEW_DASHBOARD">
                        <Index/>
                    </ProtectedRoute>
                }
            />
            {/* Access Control route: Requires VIEW_ACCESS_CONTROL permission */}
            <Route
                path="/access-control"
                element={
                    <ProtectedRoute requiredPermission="VIEW_ACCESS_CONTROL">
                        <DashboardLayout>
                            <AccessControl/>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            {/* Transactions route: Requires VIEW_TRANSACTIONS permission */}
            <Route
                path="/transactions"
                element={
                    <ProtectedRoute requiredPermission="VIEW_TRANSACTIONS">
                        <DashboardLayout>
                            <div className="p-6">
                                <h1 className="text-3xl font-bold">Transactions</h1>
                                <p className="text-muted-foreground mt-2">
                                    Transaction management coming soon...
                                </p>
                            </div>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            {/* Reconciliation route: Requires VIEW_RECONCILIATION permission */}
            <Route
                path="/reconciliation"
                element={
                    <ProtectedRoute requiredPermission="VIEW_RECONCILIATION">
                        <DashboardLayout>
                            <Reconciliation/>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            {/* Reconciled Transactions route: Requires VIEW_RECONCILED_TRANSACTIONS permission */}
            <Route
                path="/reconciled"
                element={
                    <ProtectedRoute requiredPermission="VIEW_RECONCILED_TRANSACTIONS">
                        <DashboardLayout>
                            <ReconciledTransactions/>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reconciled/results/:batchId"
                element={
                    <ProtectedRoute requiredPermission="VIEW_RECONCILED_TRANSACTIONS">
                        <DashboardLayout>
                            <ReconciledTransactions/>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            {/* Settings route: Requires VIEW_SETTINGS permission */}
            <Route
                path="/settings"
                element={
                    <ProtectedRoute requiredPermission="VIEW_SETTINGS">
                        <DashboardLayout>
                            <div className="p-6">
                                <h1 className="text-3xl font-bold">Settings</h1>
                                <p className="text-muted-foreground mt-2">
                                    System settings coming soon...
                                </p>
                            </div>
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            {/* Authentication routes */}
            <Route
                path="/auth/verify"
                element={<AuthHandler token={new URLSearchParams(location.search).get('token')}/>}
            />
            <Route
                path="/auth/activate"
                element={<AuthHandler token={new URLSearchParams(location.search).get('token')}/>}
            />
            <Route path="/template-creator" element={
                <ProtectedRoute requiredPermission="VIEW_RECONCILED_TRANSACTIONS">
                    <DashboardLayout>
                        <TemplateCreator/>
                    </DashboardLayout>
                </ProtectedRoute>
            }/>

            <Route
                path="/"
                element={isAuthenticated() ? <Navigate to="/dashboard" replace/> : <SignIn/>}
            />
            {/* Unauthorized page for access denied */}
            <Route path="/unauthorized" element={<Unauthorized/>}/>
            {/* Catch-all for undefined routes */}
            <Route path="*" element={<NotFound/>}/>
        </Routes>
    );
};

export default RoutesPage;