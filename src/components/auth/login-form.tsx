
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${email}, you will receive an email with instructions to reset your password.`,
      });
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      toast({
        variant: "destructive",
        title: "Error Sending Email",
        description: error.message || "Could not send password reset email.",
      });
    }
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const seedUsers = {
        'gazi2agmfin@gmail.com': { firstName: 'Gazi', lastName: 'AGM' },
        'admin@example.com': { firstName: 'Admin', lastName: 'User' },
    };

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      const isSeedUser = Object.keys(seedUsers).includes(email);
      const isSeedPassword = password === '123456';

      if (error.code === 'auth/user-not-found' && isSeedUser && isSeedPassword) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const { firstName, lastName } = (seedUsers as any)[email];
          const userProfile = {
            id: userCredential.user.uid,
            email: email,
            firstName: firstName,
            lastName: lastName,
          };
          const userDocRef = doc(firestore, "users", userCredential.user.uid);
          await setDoc(userDocRef, userProfile);

          toast({
            title: "Account Created",
            description: `Welcome! Your account for ${email} has been set up.`,
          });
        } catch (creationError: any) {
          console.error("Seed User Creation Error:", creationError);
          toast({
            variant: "destructive",
            title: "Account Creation Failed",
            description: creationError.message || "Could not create the account.",
          });
        }
      } else {
        console.error("Login Error:", error);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "Invalid credentials. Please check your email and password.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isUserLoading || user) {
      return <div className="flex justify-center items-center p-8"><p>Loading...</p></div>
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
      <Button
        type="button"
        variant="link"
        onClick={handlePasswordReset}
        className="w-full text-sm underline"
      >
        Forgot your password?
      </Button>
    </div>
  );
}
