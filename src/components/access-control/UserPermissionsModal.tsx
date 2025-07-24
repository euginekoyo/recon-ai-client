import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { UserRoleToggle } from './UserRoleToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    roles: {
      Admin: boolean;
      Viewer: boolean;
      Finance: boolean;
    };
    avatar?: string;
  };
  onSave: (userId: string, roles: { Admin: boolean; Viewer: boolean; Finance: boolean }) => void;
}

export const UserPermissionsModal = ({ 
  open, 
  onOpenChange, 
  user, 
  onSave 
}: UserPermissionsModalProps) => {
  const [roles, setRoles] = useState(user.roles);

  const handleRoleToggle = (role: 'Admin' | 'Viewer' | 'Finance', enabled: boolean) => {
    setRoles(prev => ({
      ...prev,
      [role]: enabled
    }));
  };

  const handleSave = () => {
    onSave(user.id, roles);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRoles(user.roles); // Reset to original roles
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User Permissions</DialogTitle>
          <DialogDescription>
            Update roles and permissions for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          {/* User Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={user.name}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <Separator />

          {/* Role Permissions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Role Permissions</Label>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Admin"
                  enabled={roles.Admin}
                  onToggle={handleRoleToggle}
                />
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Full system access and user management
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Finance"
                  enabled={roles.Finance}
                  onToggle={handleRoleToggle}
                />
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Access to financial data and reconciliation
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Viewer"
                  enabled={roles.Viewer}
                  onToggle={handleRoleToggle}
                />
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Read-only access to dashboard and reports
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};