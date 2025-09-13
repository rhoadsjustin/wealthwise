import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { useToast } from '@/context/useToast';

interface BiometricAuthProps {
  onAuthenticated: (username: string) => void;
  onShowOnboarding: () => void;
}

export default function BiometricAuth({ onAuthenticated, onShowOnboarding }: BiometricAuthProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricsSupport();
    checkExistingAccount();
  }, []);

  const checkBiometricsSupport = async () => {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricsSupported(available);
      }
    } catch (error) {
      console.log('Biometrics check failed:', error);
      setBiometricsSupported(false);
    }
  };

  const checkExistingAccount = () => {
    const savedUsername = localStorage.getItem('smartbudget_username');
    if (savedUsername) {
      setHasExistingAccount(true);
      setUsername(savedUsername);
    }
  };

  const authenticateWithBiometrics = async () => {
    if (!biometricsSupported || !username) return;

    setIsLoading(true);
    try {
      const credentialId = localStorage.getItem(`biometric_${username}`);
      if (!credentialId) {
        toast({
          title: 'Biometric Not Setup',
          description: 'Please use your username to sign in',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [
            {
              id: new TextEncoder().encode(credentialId),
              type: 'public-key',
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (credential) {
        onAuthenticated(username);
        toast({
          title: 'Welcome Back!',
          description: 'Successfully authenticated with biometrics',
        });
      }
    } catch (error) {
      toast({
        title: 'Authentication Failed',
        description: 'Please try again or use your username',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithUsername = () => {
    if (!username.trim()) {
      toast({
        title: 'Username Required',
        description: 'Please enter your username',
        variant: 'destructive',
      });
      return;
    }

    // Save username and authenticate
    localStorage.setItem('smartbudget_username', username.trim());
    onAuthenticated(username.trim());

    toast({
      title: 'Welcome Back!',
      description: 'Successfully signed in',
    });
  };

  const hasBiometricSetup = username && localStorage.getItem(`biometric_${username}`);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="space-y-2 text-center">
          <div className="inline-block rounded-full bg-black p-4 shadow-md">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-black">SmartBudget</h1>
          <p className="text-gray-600">Your personal finance companion</p>
        </div>

        {/* Authentication Card */}
        <Card className="border border-gray-400 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-center text-black">
              {hasExistingAccount ? 'Welcome Back' : 'Sign In'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="auth-username" className="font-medium text-black">
                Username
              </Label>
              <Input
                id="auth-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="border-gray-400 text-black"
                disabled={hasExistingAccount}
              />
            </div>

            {/* Biometric Authentication */}
            {biometricsSupported && hasBiometricSetup && (
              <Button
                onClick={authenticateWithBiometrics}
                disabled={isLoading}
                className="w-full bg-black text-white hover:bg-gray-800">
                {isLoading ? (
                  'Authenticating...'
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Use FaceID/TouchID
                  </>
                )}
              </Button>
            )}

            {/* Username Authentication */}
            <Button
              onClick={authenticateWithUsername}
              variant="outline"
              className="w-full border-gray-400 text-black hover:bg-gray-100">
              <User className="mr-2 h-4 w-4" />
              Continue with Username
            </Button>

            {/* Privacy Notice */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Privacy First</span>
              </div>
              <p className="text-xs text-gray-600">
                Your data stays on your device. No cloud storage, no data sharing.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* New User */}
        {!hasExistingAccount && (
          <div className="space-y-2 text-center">
            <p className="text-gray-600">New to SmartBudget?</p>
            <Button
              onClick={onShowOnboarding}
              variant="outline"
              className="border-gray-400 text-black hover:bg-gray-100">
              Get Started
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
