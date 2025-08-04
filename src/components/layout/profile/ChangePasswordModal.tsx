import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChangePasswordMutation } from '@/pages/AccessControl/AccessControlApi';
import { useAuth } from '@/lib/auth';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
    const [changePassword] = useChangePasswordMutation();
    const { toast } = useToast();
    const { username } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [error, setError] = useState('');

    // Cleanup backdrop when modal closes
    // useEffect(() => {
    //     if (!isOpen) {
    //         const backdrop = document.querySelector('[data-radix-dialog-overlay]');
    //         if (backdrop) backdrop.remove();
    //     }
    // }, [isOpen]);

    useEffect(() => {
        console.log('ChangePasswordModal open:', isOpen);
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmNewPassword) {
            setError('New passwords do not match');
            return;
        }
        if (formData.newPassword.length < 8) {
            setError('New password must be at least 8 characters long');
            return;
        }
        try {
            await changePassword({
                username: username || '',
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            }).unwrap();
            toast({
                title: "Password Changed",
                description: "Your password has been successfully updated.",
            });
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            });
            setError('');
            onClose();
            setTimeout(() => {
                window.location.reload();
            }, 500); // TEMP: auto-reload to restore interactivity
        } catch (error) {
            setError('Failed to change password. Please check your current password.');
            toast({
                title: "Error",
                description: "Failed to change password. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
        if (password.length < 8) return { strength: 2, label: 'Fair', color: 'bg-yellow-500' };
        if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
            return { strength: 4, label: 'Strong', color: 'bg-green-500' };
        }
        return { strength: 3, label: 'Good', color: 'bg-blue-500' };
    };

    const passwordStrength = getPasswordStrength(formData.newPassword);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-white via-red-50/20 to-orange-50/20 backdrop-blur-xl border-0 shadow-2xl rounded-2xl overflow-hidden z-50">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-400/5"></div>
                <div className="relative z-10">
                    <DialogHeader className="pb-6 pt-2">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent text-center">
                            Change Password
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-600">
                            Update your account password securely.
                        </DialogDescription>
                        <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mt-2"></div>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-sm font-semibold text-gray-700 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Current Password
                            </Label>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Enter your current password"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/60 bg-white/60 backdrop-blur-sm focus:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-400/20 transition-all duration-300 placeholder-gray-400 text-gray-700 hover:border-gray-300/80 hover:bg-white/80"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-700 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter your new password"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/60 bg-white/60 backdrop-blur-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 transition-all duration-300 placeholder-gray-400 text-gray-700 hover:border-gray-300/80 hover:bg-white/80"
                            />
                            {formData.newPassword && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Password Strength</span>
                                        <span className={`font-semibold ${passwordStrength.strength === 1 ? 'text-red-600' : passwordStrength.strength === 2 ? 'text-yellow-600' : passwordStrength.strength === 3 ? 'text-blue-600' : 'text-green-600'}`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword" className="text-sm font-semibold text-gray-700 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Confirm New Password
                            </Label>
                            <Input
                                id="confirmNewPassword"
                                name="confirmNewPassword"
                                type="password"
                                value={formData.confirmNewPassword}
                                onChange={handleChange}
                                placeholder="Confirm your new password"
                                className={`w-full px-4 py-3 rounded-xl border-2 bg-white/60 backdrop-blur-sm transition-all duration-300 placeholder-gray-400 text-gray-700 hover:bg-white/80 ${formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : formData.confirmNewPassword && formData.newPassword === formData.confirmNewPassword ? 'border-green-300 focus:border-green-400 focus:ring-green-400/20' : 'border-gray-200/60 focus:border-green-400 focus:ring-green-400/20'} focus:outline-none focus:ring-4 hover:border-gray-300/80`}
                            />
                            {formData.confirmNewPassword && formData.newPassword === formData.confirmNewPassword && (
                                <div className="flex items-center text-xs text-green-600 mt-1">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Passwords match
                                </div>
                            )}
                        </div>
                        {error && (
                            <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                </div>
                            </div>
                        )}
                        <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-xs text-blue-700">
                                    <p className="font-medium mb-1">Password Requirements:</p>
                                    <ul className="space-y-1 text-blue-600">
                                        <li>• At least 8 characters long</li>
                                        <li>• Include uppercase and lowercase letters</li>
                                        <li>• Include at least one number</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="flex gap-3 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-300/20"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold hover:from-red-600 hover:to-orange-700 transform hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-500/30 shadow-lg hover:shadow-xl"
                            >
                                Change Password
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};