import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetUsersQuery, useUpdateUserMutation } from '@/store/redux/AccessControlApi.ts';
import { useAuth } from '@/lib/auth';

interface UserData {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    roleNames: string[];
    permissions: string[];
    isActive: boolean;
    isEmailVerified: boolean;
    last_active?: string;
}

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
    const { username } = useAuth();
    const { data: users, isLoading } = useGetUsersQuery();
    const [updateUser] = useUpdateUserMutation();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });

    useEffect(() => {
        if (users && username) {
            const currentUser = users.find(user => user.username === username);
            if (currentUser) {
                setFormData({
                    firstName: currentUser.firstName || '',
                    lastName: currentUser.lastName || '',
                    email: currentUser.email || ''
                });
            }
        }
    }, [users, username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) {
            toast({
                title: "Error",
                description: "User not authenticated",
                variant: "destructive"
            });
            return;
        }

        const currentUser = users?.find(user => user.username === username);
        if (!currentUser) {
            toast({
                title: "Error",
                description: "User not found",
                variant: "destructive"
            });
            return;
        }

        try {
            await updateUser({
                userId: currentUser.id,
                userData: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email
                }
            }).unwrap();
            toast({
                title: "Profile Updated",
                description: "Your profile has been successfully updated.",
            });
            onClose();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 backdrop-blur-xl border-0 shadow-2xl rounded-2xl overflow-hidden z-50">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-purple-400/5"></div>
                <div className="relative z-10">
                    <DialogHeader className="pb-6 pt-2">
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
                            Edit Profile
                        </DialogTitle>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mt-2"></div>
                    </DialogHeader>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-blue-200"></div>
                                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                            </div>
                            <span className="ml-4 text-gray-600 font-medium">Loading profile...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 px-1">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    First Name
                                </Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter your first name"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/60 bg-white/60 backdrop-blur-sm
                                             focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20
                                             transition-all duration-300 placeholder-gray-400 text-gray-700
                                             hover:border-gray-300/80 hover:bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Last Name
                                </Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter your last name"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/60 bg-white/60 backdrop-blur-sm
                                             focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20
                                             transition-all duration-300 placeholder-gray-400 text-gray-700
                                             hover:border-gray-300/80 hover:bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email address"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/60 bg-white/60 backdrop-blur-sm
                                             focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-400/20
                                             transition-all duration-300 placeholder-gray-400 text-gray-700
                                             hover:border-gray-300/80 hover:bg-white/80"
                                />
                            </div>
                            <DialogFooter className="flex gap-3 pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 font-semibold
                                             hover:bg-gray-50 hover:border-gray-400 transition-all duration-300
                                             focus:outline-none focus:ring-4 focus:ring-gray-300/20"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold
                                             hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300
                                             focus:outline-none focus:ring-4 focus:ring-blue-500/30 shadow-lg hover:shadow-xl"
                                >
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};