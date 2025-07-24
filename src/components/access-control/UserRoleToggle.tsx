import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface UserRoleToggleProps {
  role: 'Admin' | 'Viewer' | 'Finance';
  enabled: boolean;
  onToggle: (role: 'Admin' | 'Viewer' | 'Finance', enabled: boolean) => void;
  disabled?: boolean;
}

const roleColors = {
  Admin: 'destructive',
  Finance: 'default',
  Viewer: 'secondary',
} as const;

export const UserRoleToggle = ({ role, enabled, onToggle, disabled }: UserRoleToggleProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`role-${role.toLowerCase()}`}
        checked={enabled}
        onCheckedChange={(checked) => onToggle(role, checked)}
        disabled={disabled}
      />
      <Label 
        htmlFor={`role-${role.toLowerCase()}`} 
        className="cursor-pointer"
      >
        <Badge 
          variant={enabled ? roleColors[role] : 'outline'}
          className="ml-2"
        >
          {role}
        </Badge>
      </Label>
    </div>
  );
};