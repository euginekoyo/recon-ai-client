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
import { Mail, User } from 'lucide-react';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (userData: {
    name: string;
    email: string;
    roles: { Admin: boolean; Viewer: boolean; Finance: boolean };
  }) => void;
}

export const InviteUserModal = ({ 
  open, 
  onOpenChange, 
  onInvite 
}: InviteUserModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: {
      Admin: false,
      Viewer: true, // Default to viewer role
      Finance: false,
    }
  });

  const handleRoleToggle = (role: 'Admin' | 'Viewer' | 'Finance', enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: enabled
      }
    }));
  };

  const handleInvite = () => {
    if (formData.name.trim() && formData.email.trim()) {
      onInvite(formData);
      handleReset();
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      roles: {
        Admin: false,
        Viewer: true,
        Finance: false,
      }
    });
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  const isFormValid = formData.name.trim() && formData.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new user to join your financial platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Role Permissions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Assign Roles</Label>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Admin"
                  enabled={formData.roles.Admin}
                  onToggle={handleRoleToggle}
                />
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Full system access and user management
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Finance"
                  enabled={formData.roles.Finance}
                  onToggle={handleRoleToggle}
                />
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  Access to financial data and reconciliation
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <UserRoleToggle
                  role="Viewer"
                  enabled={formData.roles.Viewer}
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
          <Button onClick={handleInvite} disabled={!isFormValid}>
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};