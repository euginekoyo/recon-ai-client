import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVerifyEmailMutation } from '@/pages/AccessControl/AccessControlApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

interface AuthHandlerProps {
    token?: string;
}

const AuthHandler: React.FC<AuthHandlerProps> = ({ token }) => {
    const navigate = useNavigate();
    const [message, setMessage] = useState<string>('Verifying your email and activating your account...');
    const [isError, setIsError] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [verifyEmail] = useVerifyEmailMutation();

    useEffect(() => {
        const handleAuth = async () => {
            try {
                const verificationToken = token || new URLSearchParams(window.location.search).get('token');

                if (!verificationToken) {
                    setMessage('Invalid or missing verification token.');
                    setIsError(true);
                    setIsLoading(false);
                    return;
                }

                // Single API call handles both verification and activation
                const response = await verifyEmail(verificationToken).unwrap();

                setMessage(response.message || 'Email verified and account activated successfully! You can now log in.');
                setIsLoading(false);

                // Redirect to login after 3 seconds
                setTimeout(() => navigate('/'), 3000);

            } catch (error: any) {
                console.error('Authentication error:', error);
                const errorMessage = error?.data?.error || error?.data?.message || 'An error occurred during verification.';
                setMessage(errorMessage);
                setIsError(true);
                setIsLoading(false);
            }
        };

        handleAuth();
    }, [token, navigate, verifyEmail]);

    const getIcon = () => {
        if (isLoading) return <Loader className="animate-spin h-8 w-8 text-blue-500" />;
        if (isError) return <XCircle className="h-8 w-8 text-red-500" />;
        return <CheckCircle className="h-8 w-8 text-green-500" />;
    };

    const getTitle = () => {
        if (isLoading) return 'Processing...';
        if (isError) return 'Verification Failed';
        return 'Success!';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="max-w-md w-full mx-4">
                <CardHeader>
                    <CardTitle className="text-center flex flex-col items-center space-y-2">
                        {getIcon()}
                        <span>{getTitle()}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">{message}</p>

                    {isError && (
                        <div className="space-y-2">
                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="w-full"
                            >
                                Return to Login
                            </Button>
                            <p className="text-sm text-gray-500">
                                Need help? Contact support or try requesting a new verification email.
                            </p>
                        </div>
                    )}

                    {!isError && !isLoading && (
                        <div className="space-y-2">
                            <p className="text-sm text-green-600">
                                Redirecting to login page in a few seconds...
                            </p>
                            <Button
                                onClick={() => navigate('/')}
                                className="w-full"
                            >
                                Go to Login Now
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AuthHandler;