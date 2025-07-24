import { useState, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserRoleToggle } from '@/components/access-control/UserRoleToggle';
import { UserPermissionsModal } from '@/components/access-control/UserPermissionsModal';
import { InviteUserModal } from '@/components/access-control/InviteUserModal';
import { Search, UserPlus, Edit, MoreHorizontal, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  roles: {
    Admin: boolean;
    Viewer: boolean;
    Finance: boolean;
  };
  avatar?: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'pending';
}

// Sample user data
const initialUsers: UserData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    roles: { Admin: true, Viewer: true, Finance: false },
    lastActive: '2024-01-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'Sarah Smith',
    email: 'sarah.smith@company.com',
    roles: { Admin: false, Viewer: true, Finance: true },
    lastActive: '2024-01-14',
    status: 'active'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    roles: { Admin: false, Viewer: true, Finance: false },
    lastActive: '2024-01-10',
    status: 'inactive'
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    roles: { Admin: false, Viewer: false, Finance: true },
    lastActive: 'Never',
    status: 'pending'
  }
];

// Reducer for user management
type UserAction = 
  | { type: 'UPDATE_ROLES'; userId: string; roles: UserData['roles'] }
  | { type: 'ADD_USER'; user: Omit<UserData, 'id' | 'lastActive' | 'status'> }
  | { type: 'TOGGLE_ROLE'; userId: string; role: 'Admin' | 'Viewer' | 'Finance'; enabled: boolean };

const userReducer = (state: UserData[], action: UserAction): UserData[] => {
  switch (action.type) {
    case 'UPDATE_ROLES':
      return state.map(user =>
        user.id === action.userId
          ? { ...user, roles: action.roles }
          : user
      );
    case 'ADD_USER':
      return [...state, {
        ...action.user,
        id: Date.now().toString(),
        lastActive: 'Never',
        status: 'pending'
      }];
    case 'TOGGLE_ROLE':
      return state.map(user =>
        user.id === action.userId
          ? {
              ...user,
              roles: {
                ...user.roles,
                [action.role]: action.enabled
              }
            }
          : user
      );
    default:
      return state;
  }
};

const AccessControl = () => {
  const [users, dispatch] = useReducer(userReducer, initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleToggle = (userId: string, role: 'Admin' | 'Viewer' | 'Finance', enabled: boolean) => {
    dispatch({ type: 'TOGGLE_ROLE', userId, role, enabled });
    toast({
      title: "Role Updated",
      description: `${role} role ${enabled ? 'granted' : 'revoked'} successfully.`,
    });
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = (userId: string, roles: UserData['roles']) => {
    dispatch({ type: 'UPDATE_ROLES', userId, roles });
    toast({
      title: "Permissions Updated",
      description: "User permissions have been updated successfully.",
    });
  };

  const handleInviteUser = (userData: Omit<UserData, 'id' | 'lastActive' | 'status'>) => {
    dispatch({ type: 'ADD_USER', user: userData });
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${userData.email} successfully.`,
    });
  };

  const getStatusBadge = (status: UserData['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getUserRoles = (roles: UserData['roles']) => {
    return Object.entries(roles)
      .filter(([_, enabled]) => enabled)
      .map(([role]) => role);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Access Control</h1>
          <p className="text-muted-foreground">
            Manage user permissions and role assignments
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{users.length}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {users.filter(u => u.status === 'pending').length}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users & Permissions</CardTitle>
          <CardDescription>
            Manage user roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Finance</TableHead>
                  <TableHead>Viewer</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getUserRoles(user.roles).map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserRoleToggle
                        role="Admin"
                        enabled={user.roles.Admin}
                        onToggle={(role, enabled) => handleRoleToggle(user.id, role, enabled)}
                        disabled={user.status === 'pending'}
                      />
                    </TableCell>
                    <TableCell>
                      <UserRoleToggle
                        role="Finance"
                        enabled={user.roles.Finance}
                        onToggle={(role, enabled) => handleRoleToggle(user.id, role, enabled)}
                        disabled={user.status === 'pending'}
                      />
                    </TableCell>
                    <TableCell>
                      <UserRoleToggle
                        role="Viewer"
                        enabled={user.roles.Viewer}
                        onToggle={(role, enabled) => handleRoleToggle(user.id, role, enabled)}
                        disabled={user.status === 'pending'}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastActive}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Permissions
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedUser && (
        <UserPermissionsModal
          open={showPermissionsModal}
          onOpenChange={setShowPermissionsModal}
          user={selectedUser}
          onSave={handleSavePermissions}
        />
      )}

      <InviteUserModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInvite={handleInviteUser}
      />
    </div>
  );
};

export default AccessControl;