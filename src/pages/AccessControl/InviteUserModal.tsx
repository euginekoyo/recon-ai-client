import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import api from '@/lib/api.ts';
import { useToast } from '@/hooks/use-toast.ts';

interface InviteUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInvite: (userData: any) => void;
}

const InviteUserModal = ({ open, onOpenChange, onInvite }: InviteUserModalProps) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        roleNames: ['ROLE_USER'],
    });
    const { toast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (role: string, checked: boolean) => {
        setFormData({
            ...formData,
            roleNames: checked
                ? [...formData.roleNames, role]
                : formData.roleNames.filter(r => r !== role),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/auth/admin/register-user', formData);
            onInvite(formData);
            onOpenChange(false);
            toast({
                title: 'Invitation Sent',
                description: `Invitation sent to ${formData.email}.`,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send invitation.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Username</Label>
                        <Input name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label>Email</Label>
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label>First Name</Label>
                        <Input name="firstName" value={formData.firstName} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label>Last Name</Label>
                        <Input name="lastName" value={formData.lastName} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label>Roles</Label>
                        <div className="space-y-2">
                            {['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'].map(role => (
                                <label key={role} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.roleNames.includes(role)}
                                        onChange={(e) => handleRoleChange(role, e.target.checked)}
                                    />
                                    <span>{role.replace('ROLE_', '')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <Button type="submit" className="w-full">Send Invitation</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InviteUserModal;