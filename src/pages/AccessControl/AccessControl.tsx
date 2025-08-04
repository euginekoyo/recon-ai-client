import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, UserPlus, MoreHorizontal, Shield, Clock, Crown, Eye, Mail, Key, Users, Settings, Plus, Trash2, Edit, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import {
    useGetUsersQuery,
    useAssignRolesToUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useInviteUserMutation,
    useCreateRoleMutation,
    useGetRolesQuery,
    useCreatePermissionMutation,
    useGetPermissionsQuery,
    useAssignPermissionToRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    UserData,
    Role,
    Permission
} from './AccessControlApi';
import { isAuthenticated, isAdmin, hasPermission } from '@/lib/auth';

const navigationItems = [
    { name: 'Dashboard', permission: 'VIEW_DASHBOARD', description: 'View dashboard metrics.', category: 'Navigation' },
    { name: 'Transactions', permission: 'VIEW_TRANSACTIONS', description: 'Manage transactions.', category: 'Navigation' },
    { name: 'Reconciliation', permission: 'VIEW_RECONCILIATION', description: 'Real-time reconciliation.', category: 'Navigation' },
    { name: 'Reconciled', permission: 'VIEW_RECONCILED_TRANSACTIONS', description: 'View reconciled transactions.', category: 'Navigation' },
    { name: 'Access Control', permission: 'VIEW_ACCESS_CONTROL', description: 'Manage access.', category: 'Navigation' },
    { name: 'Settings', permission: 'VIEW_SETTINGS', description: 'Configure settings.', category: 'Navigation' },
];

interface EditUserModalProps { open: boolean; onOpenChange: (open: boolean) => void; user: UserData | null; }
interface CreateUserModalProps { open: boolean; onOpenChange: (open: boolean) => void; }
interface RoleManagementModalProps { open: boolean; onOpenChange: (open: boolean) => void; }

const PermissionSelector: React.FC<{
    permissions: Permission[];
    selectedPermissions: string[];
    onPermissionChange: (permissions: string[]) => void;
    permissionCategories: any;
}> = ({ permissions, selectedPermissions, onPermissionChange, permissionCategories }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const getPermissionDescription = (permissionName: string): string => {
        for (const category of Object.values(permissionCategories)) {
            if (category.permissions.includes(permissionName)) {
                return category.descriptions[permissionName] || 'No description.';
            }
        }
        return 'No description.';
    };

    const filteredPermissions = permissions.filter(permission => {
        const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (selectedCategory === 'all') return matchesSearch;
        const category = Object.values(permissionCategories).find(cat => cat.permissions.includes(permission.name));
        return matchesSearch && category && Object.keys(permissionCategories).find(key => permissionCategories[key] === category) === selectedCategory;
    });

    const handlePermissionToggle = (permissionName: string) => {
        onPermissionChange(
            selectedPermissions.includes(permissionName)
                ? selectedPermissions.filter(p => p !== permissionName)
                : [...selectedPermissions, permissionName]
        );
    };

    return (
        <div className="space-y-3">
            {selectedPermissions.length > 0 && (
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-blue-900">Selected ({selectedPermissions.length})</Label>
                    <div className="flex flex-wrap gap-1 p-2 bg-blue-50 rounded border border-blue-200 max-h-24 overflow-y-auto">
                        {selectedPermissions.map((permissionName) => (
                            <Badge key={permissionName} className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                                {permissionName}
                                <button onClick={() => handlePermissionToggle(permissionName)} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm border-blue-300 focus:border-blue-500" />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 text-sm border-blue-300">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(permissionCategories).map(([key, category]) => (
                            <SelectItem key={key} value={key}>{category.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label className="text-xs font-medium text-blue-900">Permissions</Label>
                <Select onValueChange={handlePermissionToggle}>
                    <SelectTrigger className="h-9 text-sm border-blue-300">
                        <SelectValue placeholder="Add permission..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                        {filteredPermissions.filter(p => !selectedPermissions.includes(p.name)).map((permission) => (
                            <SelectItem key={permission.id} value={permission.name}>
                                <div className="flex flex-col">
                                    <span className="text-sm">{permission.name}</span>
                                    <span className="text-xs text-blue-600">{getPermissionDescription(permission.name)}</span>
                                </div>
                            </SelectItem>
                        ))}
                        {filteredPermissions.filter(p => !selectedPermissions.includes(p.name)).length === 0 && (
                            <div className="p-3 text-center text-blue-600 text-xs">{searchTerm ? 'No permissions found' : 'All selected'}</div>
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

const EditUserModal: React.FC<EditUserModalProps> = ({ open, onOpenChange, user }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        isActive: user?.isActive || true,
        roleNames: user?.roles.map(r => r.role) || ['ROLE_USER'],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const { data: roles, isLoading: isRolesLoading } = useGetRolesQuery();
    const { toast } = useToast();

    useEffect(() => {
        if (user) setFormData({
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            roleNames: user.roles.map(r => r.role),
        });
    }, [user]);

    const safeRoleDisplay = (roleString: string | undefined | null): string => {
        return roleString && typeof roleString === 'string' ? roleString.replace('ROLE_', '') : 'Unknown Role';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (role: string, checked: boolean) => {
        setFormData({
            ...formData,
            roleNames: checked ? [...formData.roleNames, role] : formData.roleNames.filter(r => r !== role),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || formData.roleNames.length === 0) {
            toast({ title: 'Error', description: 'At least one role is required.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await updateUser({ userId: user.id, userData: formData }).unwrap();
            onOpenChange(false);
            toast({ title: 'Success', description: `User ${formData.username} updated.` });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.message || 'Failed to update user.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-lg p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Edit className="w-5 h-5 text-blue-600" /> Edit User
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="firstName" className="text-xs font-medium text-blue-900">First Name</Label>
                            <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                        </div>
                        <div>
                            <Label htmlFor="lastName" className="text-xs font-medium text-blue-900">Last Name</Label>
                            <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="username" className="text-xs font-medium text-blue-900">Username</Label>
                        <Input id="username" name="username" value={formData.username} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                    </div>
                    <div>
                        <Label htmlFor="email" className="text-xs font-medium text-blue-900">Email</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })} />
                        <Label htmlFor="isActive" className="text-xs font-medium text-blue-900">Active</Label>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-blue-900">Roles</Label>
                        <div className="max-h-32 overflow-y-auto border border-blue-200 rounded p-2 bg-blue-50">
                            {isRolesLoading ? (
                                <div className="flex items-center justify-center py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-xs text-blue-600">Loading roles...</span>
                                </div>
                            ) : (
                                (roles || []).map((role) => (
                                    <div key={role.id} className="flex items-center gap-2 p-1 hover:bg-blue-100 rounded">
                                        <Checkbox
                                            id={role.id}
                                            checked={formData.roleNames.includes(role.role)}
                                            onCheckedChange={(checked) => handleRoleChange(role.role, !!checked)}
                                        />
                                        <Label htmlFor={role.id} className="text-xs text-blue-900 cursor-pointer">{safeRoleDisplay(role.role)}</Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-9 text-sm border-blue-300 text-blue-700 hover:bg-blue-50" disabled={isSubmitting || isUpdating || isRolesLoading}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || isUpdating || isRolesLoading} className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm">
                            {(isSubmitting || isUpdating) ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Updating...</> : 'Update'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const CreateUserModal: React.FC<CreateUserModalProps> = ({ open, onOpenChange }) => {
    const [formData, setFormData] = useState({
        username: '', email: '', firstName: '', lastName: '', roleNames: ['ROLE_USER'], sendWelcomeEmail: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteUser, { isLoading: isCreating, error }] = useInviteUserMutation();
    const { data: roles, isLoading: isRolesLoading } = useGetRolesQuery();
    const { toast } = useToast();

    const safeRoleDisplay = (roleString: string | undefined | null): string => {
        return roleString && typeof roleString === 'string' ? roleString.replace('ROLE_', '') : 'Unknown Role';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (role: string, checked: boolean) => {
        setFormData({
            ...formData,
            roleNames: checked ? [...formData.roleNames, role] : formData.roleNames.filter(r => r !== role),
        });
    };

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) password += charset.charAt(Math.floor(Math.random() * charset.length));
        return password;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.roleNames.length === 0) {
            toast({ title: 'Error', description: 'At least one role is required.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await inviteUser({ ...formData, password: generatePassword() }).unwrap();
            onOpenChange(false);
            toast({ title: 'Success', description: `User ${formData.username} created.` });
            setFormData({ username: '', email: '', firstName: '', lastName: '', roleNames: ['ROLE_USER'], sendWelcomeEmail: true });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.data?.message || 'Failed to create user.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (error) toast({ title: 'Error', description: error?.data?.message || 'An error occurred.', variant: 'destructive' });
    }, [error, toast]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-lg p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="w-5 h-5 text-blue-600" /> New User
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="firstName" className="text-xs font-medium text-blue-900">First Name</Label>
                            <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                        </div>
                        <div>
                            <Label htmlFor="lastName" className="text-xs font-medium text-blue-900">Last Name</Label>
                            <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="username" className="text-xs font-medium text-blue-900">Username</Label>
                        <Input id="username" name="username" value={formData.username} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                    </div>
                    <div>
                        <Label htmlFor="email" className="text-xs font-medium text-blue-900">Email</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="h-9 text-sm border-blue-300" required />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-blue-900">Roles</Label>
                        <div className="max-h-32 overflow-y-auto border border-blue-200 rounded p-2 bg-blue-50">
                            {isRolesLoading ? (
                                <div className="flex items-center justify-center py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-xs text-blue-600">Loading roles...</span>
                                </div>
                            ) : (
                                (roles || []).map((role) => (
                                    <div key={role.id} className="flex items-center gap-2 p-1 hover:bg-blue-100 rounded">
                                        <Checkbox
                                            id={role.id}
                                            checked={formData.roleNames.includes(role.role)}
                                            onCheckedChange={(checked) => handleRoleChange(role.role, !!checked)}
                                        />
                                        <Label htmlFor={role.id} className="text-xs text-blue-900 cursor-pointer">{safeRoleDisplay(role.role)}</Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-900">A secure password will be sent to the user's email.</div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-9 text-sm border-blue-300 text-blue-700 hover:bg-blue-50" disabled={isSubmitting || isCreating || isRolesLoading}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || isCreating || isRolesLoading} className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm">
                            {(isSubmitting || isCreating) ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Creating...</> : 'Create'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({ open, onOpenChange }) => {
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: roles, refetch: refetchRoles, isLoading: isRolesLoading } = useGetRolesQuery();
    const { data: permissions, isLoading: isPermissionsLoading } = useGetPermissionsQuery();
    const [createRole, { isLoading: isCreatingRole }] = useCreateRoleMutation();
    const [updateRole, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();
    const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();
    const [assignPermissionToRole, { isLoading: isAssigningPermission }] = useAssignPermissionToRoleMutation();
    const [createPermission, { isLoading: isCreatingPermission }] = useCreatePermissionMutation();
    const { toast } = useToast();

    const defaultPermissions = [
        'VIEW_USERS', 'CREATE_USER', 'UPDATE_USER',
        'VIEW_ROLES', 'CREATE_ROLE', 'UPDATE_ROLE', 'MANAGE_PERMISSIONS',
        ...navigationItems.map(item => item.permission)
    ];

    const permissionCategories = {
        navigation: {
            name: 'Navigation',
            permissions: navigationItems.map(item => item.permission),
            descriptions: Object.fromEntries(navigationItems.map(item => [item.permission, item.description]))
        },
        accessControl: {
            name: 'Access Control',
            permissions: ['VIEW_USERS', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'VIEW_ROLES', 'CREATE_ROLE', 'UPDATE_ROLE', 'MANAGE_PERMISSIONS'],
            descriptions: {
                VIEW_USERS: 'View user details.',
                CREATE_USER: 'Create users.',
                UPDATE_USER: 'Modify users.',
                DELETE_USER: 'Remove users.',
                VIEW_ROLES: 'View roles.',
                CREATE_ROLE: 'Create roles.',
                UPDATE_ROLE: 'Modify roles.',
                DELETE_ROLE: 'Remove roles.',
                MANAGE_PERMISSIONS: 'Manage role permissions.'
            }
        }
    };

    useEffect(() => {
        const ensurePermissions = async () => {
            if (!permissions) return;
            const existingPermissionNames = permissions.map(p => p.name);
            const missingPermissions = defaultPermissions.filter(p => !existingPermissionNames.includes(p));
            for (const permissionName of missingPermissions) {
                try {
                    setIsSubmitting(true);
                    await createPermission({ name: permissionName }).unwrap();
                } catch (error) {
                    console.error(`Failed to create permission ${permissionName}:`, error);
                } finally {
                    setIsSubmitting(false);
                }
            }
        };
        ensurePermissions();
    }, [permissions, createPermission]);

    const handleCreateOrUpdateRole = async () => {
        if (!newRoleName.trim()) {
            toast({ title: 'Error', description: 'Role name required.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const roleName = newRoleName.startsWith('ROLE_') ? newRoleName : `ROLE_${newRoleName.toUpperCase()}`;
            let newRole: any;
            if (editingRole) {
                const existingPermissionNames = (permissions || []).map(p => p.name);
                const missingPermissions = selectedPermissions.filter(p => !existingPermissionNames.includes(p));
                for (const permissionName of missingPermissions) {
                    await createPermission({ name: permissionName }).unwrap();
                }
                newRole = await updateRole({ roleId: editingRole.id, roleData: { role: roleName } }).unwrap();
                for (const permissionName of selectedPermissions) {
                    await assignPermissionToRole({ roleId: editingRole.id, permission: { name: permissionName } }).unwrap();
                }
                await refetchRoles();
                toast({ title: 'Success', description: `Role "${newRoleName}" updated.` });
                onOpenChange(false);
            } else {
                const existingPermissionNames = (permissions || []).map(p => p.name);
                const missingPermissions = selectedPermissions.filter(p => !existingPermissionNames.includes(p));
                for (const permissionName of missingPermissions) {
                    await createPermission({ name: permissionName }).unwrap();
                }
                newRole = await createRole({ role: roleName, permissions: selectedPermissions.map(name => ({ name })) }).unwrap();
                if (newRole?.id && selectedPermissions.length > 0) {
                    await Promise.all(selectedPermissions.map(async (permissionName) => {
                        await assignPermissionToRole({ roleId: newRole.id, permission: { name: permissionName } }).unwrap();
                    }));
                }
                await refetchRoles();
                toast({ title: 'Success', description: `Role "${newRoleName}" created.` });
                onOpenChange(false);
            }
            setNewRoleName('');
            setSelectedPermissions([]);
            setEditingRole(null);
        } catch (error: any) {
            toast({ title: 'Error', description: error?.data?.message || (editingRole ? 'Failed to update role.' : 'Failed to create role.'), variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setNewRoleName(role.role.replace('ROLE_', ''));
        setSelectedPermissions(role.permissions.map(p => p.name));
    };

    const handleDeleteRole = async (roleId: string) => {
        setIsSubmitting(true);
        try {
            await deleteRole(roleId).unwrap();
            await refetchRoles();
            toast({ title: 'Success', description: 'Role deleted.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.data?.message || 'Failed to delete role.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-2xl p-4 max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Shield className="w-5 h-5 text-blue-600" /> Role Management
                    </DialogTitle>
                </DialogHeader>
                {isSubmitting && (
                    <div className="absolute inset-0 bg-blue-50/50 flex items-center justify-center z-10">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-xs text-blue-600">Processing...</span>
                        </div>
                    </div>
                )}
                <Tabs defaultValue="create" className="w-full mt-4">
                    <TabsList className="grid grid-cols-2 h-10">
                        <TabsTrigger value="create" className="h-8 text-sm">{editingRole ? 'Edit Role' : 'Create Role'}</TabsTrigger>
                        <TabsTrigger value="manage" className="h-8 text-sm">Manage Roles</TabsTrigger>
                    </TabsList>
                    <TabsContent value="create" className="space-y-4">
                        <div>
                            <Label htmlFor="roleName" className="text-xs font-medium text-blue-900">Role Name</Label>
                            <Input id="roleName" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g., MANAGER" className="h-9 text-sm border-blue-300" />
                        </div>
                        {isPermissionsLoading ? (
                            <div className="flex items-center justify-center py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-xs text-blue-600">Loading permissions...</span>
                            </div>
                        ) : (
                            <PermissionSelector
                                permissions={permissions || []}
                                selectedPermissions={selectedPermissions}
                                onPermissionChange={setSelectedPermissions}
                                permissionCategories={permissionCategories}
                            />
                        )}
                        <Button
                            onClick={handleCreateOrUpdateRole}
                            disabled={isSubmitting || isCreatingRole || isUpdatingRole || isAssigningPermission || isCreatingPermission}
                            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        >
                            {(isSubmitting || isCreatingRole || isUpdatingRole || isAssigningPermission || isCreatingPermission) ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{editingRole ? 'Updating...' : 'Creating...'}</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-1" /> {editingRole ? 'Update Role' : 'Create Role'}</>
                            )}
                        </Button>
                    </TabsContent>
                    <TabsContent value="manage" className="space-y-2">
                        {isRolesLoading ? (
                            <div className="flex items-center justify-center py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-xs text-blue-600">Loading roles...</span>
                            </div>
                        ) : (
                            (roles || []).map((role) => (
                                <div key={role.id} className="flex items-center justify-between p-2 border border-blue-200 rounded bg-blue-50 hover:bg-blue-100">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-900">{role.role.replace('ROLE_', '')}</h4>
                                            <p className="text-xs text-blue-600">{role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditRole(role)}
                                            className="h-8 text-xs border-blue-300 hover:bg-blue-200"
                                            disabled={isSubmitting || isDeletingRole}
                                        >
                                            {isSubmitting && editingRole?.id === role.id ? (
                                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>Editing...</>
                                            ) : (
                                                <>Edit</>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRole(role.id)}
                                            className="h-8 text-xs border-blue-300 text-red-600 hover:bg-red-100"
                                            disabled={isSubmitting || isDeletingRole}
                                        >
                                            {isSubmitting && isDeletingRole ? (
                                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>Deleting...</>
                                            ) : (
                                                <>Delete</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

const AccessControl: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isRoleManagementModalOpen, setIsRoleManagementModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [roleLoadingStates, setRoleLoadingStates] = useState<{ [key: string]: boolean }>({});
    const [deleteLoadingStates, setDeleteLoadingStates] = useState<{ [key: string]: boolean }>({});
    const { data: users, isLoading: isUsersLoading, error: usersError } = useGetUsersQuery();
    const { data: roles, isLoading: isRolesLoading } = useGetRolesQuery();
    const [assignRolesToUser] = useAssignRolesToUserMutation();
    const [deleteUser] = useDeleteUserMutation();
    const { toast } = useToast();

    const safeRoleDisplay = (roleString: string | undefined | null): string => {
        return roleString && typeof roleString === 'string' ? roleString.replace('ROLE_', '') : 'Unknown Role';
    };

    const handleRoleToggle = async (userId: string, role: string, enabled: boolean) => {
        setRoleLoadingStates(prev => ({ ...prev, [`${userId}-${role}`]: true }));
        try {
            const user = users?.find((u) => u.id === userId);
            if (!user) return;
            const normalizedRole = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
            const newRoles = enabled ? [...user.roleNames, normalizedRole] : user.roleNames.filter((r) => r !== normalizedRole);
            await assignRolesToUser({ userId, roleNames: newRoles }).unwrap();
            toast({ title: 'Success', description: `${safeRoleDisplay(role)} ${enabled ? 'granted' : 'revoked'}.` });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.data?.message || 'Failed to update roles.', variant: 'destructive' });
        } finally {
            setRoleLoadingStates(prev => ({ ...prev, [`${userId}-${role}`]: false }));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setDeleteLoadingStates(prev => ({ ...prev, [userId]: true }));
        try {
            await deleteUser(userId).unwrap();
            toast({ title: 'Success', description: 'User deleted.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error?.message || 'Failed to delete user.', variant: 'destructive' });
        } finally {
            setDeleteLoadingStates(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleEditUser = (user: UserData) => {
        setSelectedUser(user);
        setIsEditUserModalOpen(true);
    };

    const filteredUsers = users?.filter(
        (user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const getStatusBadge = (isActive: boolean, isEmailVerified: boolean) => {
        if (isActive || isEmailVerified) {
            return <Badge className="bg-blue-600 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
        }
        if (isEmailVerified) {
            return <Badge className="bg-yellow-600 text-white text-xs"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
        }
        return <Badge className="bg-gray-600 text-white text-xs"><XCircle className="w-3 h-3 mr-1" /> Inactive</Badge>;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ROLE_ADMIN': return <Crown className="w-3 h-3" />;
            case 'ROLE_MODERATOR':
            case 'ROLE_MANAGER': return <Shield className="w-3 h-3" />;
            default: return <Eye className="w-3 h-3" />;
        }
    };

    if (!isAuthenticated()) {
        return (
            <Card className="border-none shadow-md bg-blue-50">
                <CardContent className="p-6 text-center">
                    <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">Authentication Required</p>
                    <p className="text-xs text-blue-600">Please log in to access the panel.</p>
                </CardContent>
            </Card>
        );
    }

    if (!isAdmin() && !hasPermission('VIEW_ACCESS_CONTROL')) {
        return (
            <Card className="border-none shadow-md bg-blue-50">
                <CardContent className="p-6 text-center">
                    <XCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">Access Denied</p>
                    <p className="text-xs text-blue-600">Admin or VIEW_ACCESS_CONTROL permission required.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="p-4 bg-blue-50 min-h-screen">
            <Card className="border-none shadow-md bg-white">
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5 text-blue-600" /> Access Control
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsRoleManagementModalOpen(true)} className="h-9 text-xs border-blue-300 text-blue-700 hover:bg-blue-100">
                                <Settings className="w-4 h-4 mr-1" /> Roles
                            </Button>
                            <Button onClick={() => setIsCreateUserModalOpen(true)} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                                <UserPlus className="w-4 h-4 mr-1" /> New User
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                        <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 text-sm border-blue-300" />
                    </div>
                    {isUsersLoading ? (
                        <Card className="border-none bg-blue-50">
                            <CardContent className="p-6 text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-xs text-blue-600">Loading users...</p>
                            </CardContent>
                        </Card>
                    ) : usersError ? (
                        <Card className="border-none bg-blue-50">
                            <CardContent className="p-6 text-center">
                                <XCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs font-medium text-blue-900">{usersError.status === 403 ? 'Permission Denied' : 'Failed to Load'}</p>
                                <p className="text-xs text-blue-600">{usersError.status === 403 ? 'Contact an administrator.' : 'Please try again.'}</p>
                            </CardContent>
                        </Card>
                    ) : filteredUsers.length === 0 ? (
                        <Card className="border-none bg-blue-50">
                            <CardContent className="p-6 text-center">
                                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs font-medium text-blue-900">{searchTerm ? 'No users found' : 'No users'}</p>
                                <p className="text-xs text-blue-600">{searchTerm ? 'Adjust search criteria.' : 'Create a new user.'}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded border border-blue-200 bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-50 hover:bg-blue-100">
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">User</TableHead>
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">Status</TableHead>
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">Roles</TableHead>
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">Quick Roles</TableHead>
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">Last Active</TableHead>
                                        <TableHead className="text-xs font-medium text-blue-900 h-10">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-blue-50">
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-8 h-8 border border-blue-300">
                                                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                                                            {user.firstName?.[0] || 'U'}{user.lastName?.[0] || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="text-sm font-medium text-blue-900">{user.firstName} {user.lastName}</div>
                                                        <div className="text-xs text-blue-600">@{user.username}</div>
                                                        <div className="text-xs text-blue-600 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">{getStatusBadge(user.isActive, user.isEmailVerified)}</TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roleNames.map((roleName) => (
                                                        <Badge key={roleName} className="bg-blue-600 text-white text-xs px-2 py-1">
                                                            {getRoleIcon(roleName)} <span className="ml-1">{safeRoleDisplay(roleName)}</span>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {isRolesLoading ? (
                                                        <div className="flex items-center gap-1">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                            <span className="text-xs text-blue-600">Loading...</span>
                                                        </div>
                                                    ) : (
                                                        (roles || []).map((role) => (
                                                            <div key={role.id} className="flex items-center gap-1 p-1 hover:bg-blue-100 rounded">
                                                                <Checkbox
                                                                    id={`${user.id}-${role.id}`}
                                                                    checked={user.roleNames.includes(role.role)}
                                                                    onCheckedChange={(checked) => handleRoleToggle(user.id, role.role, !!checked)}
                                                                    disabled={roleLoadingStates[`${user.id}-${role.role}`]}
                                                                />
                                                                <Label htmlFor={`${user.id}-${role.id}`} className="text-xs text-blue-900 cursor-pointer">
                                                                    {roleLoadingStates[`${user.id}-${role.role}`] ? (
                                                                        <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 inline-block mr-1"></div>Loading...</>
                                                                    ) : (
                                                                        safeRoleDisplay(role.role)
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                                    <Clock className="w-3 h-3" />
                                                    {user.last_active ? format(parseISO(user.last_active), 'MMM d, h:mm a') : 'Never'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-40">
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)} className="text-xs">
                                                            <Edit className="w-3 h-3 mr-1" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-xs text-red-600 hover:bg-red-100">
                                                            {deleteLoadingStates[user.id] ? (
                                                                <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>Deleting...</>
                                                            ) : (
                                                                <><Trash2 className="w-3 h-3 mr-1" /> Delete</>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs">
                                                            <Key className="w-3 h-3 mr-1" /> Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs">
                                                            <Mail className="w-3 h-3 mr-1" /> Resend Email
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <CreateUserModal open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen} />
            <EditUserModal open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen} user={selectedUser} />
            <RoleManagementModal open={isRoleManagementModalOpen} onOpenChange={setIsRoleManagementModalOpen} />
        </div>
    );
};

export default AccessControl;