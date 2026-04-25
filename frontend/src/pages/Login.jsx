import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ShieldCheck, HardHat, Info } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, 'password');
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (roleEmail) => {
    setEmail(roleEmail);
    setLoading(true);
    await login(roleEmail, 'password');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto w-16 h-16 mb-4 rounded-xl overflow-hidden border">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">CN-PDRRMO Portal</CardTitle>
          <CardDescription>Enter your credentials to access the DSS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Demo Role Access</span></div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" className="justify-start gap-3 h-12" onClick={() => quickLogin('admin@camnorte.gov.ph')}>
              <ShieldCheck className="w-5 h-5 text-red-600" />
              <div className="text-left"><p className="font-semibold text-xs leading-none">System Administrator</p><p className="text-[10px] text-muted-foreground mt-1">Full control over GIS, Users, and Policy</p></div>
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-3 h-12" onClick={() => quickLogin('eoc@camnorte.gov.ph')}>
              <HardHat className="w-5 h-5 text-orange-500" />
              <div className="text-left"><p className="font-semibold text-xs leading-none">EOC Personnel</p><p className="text-[10px] text-muted-foreground mt-1">Incident management and risk tracking</p></div>
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-3 h-12" onClick={() => quickLogin('citizen@gmail.com')}>
              <User className="w-5 h-5 text-blue-500" />
              <div className="text-left"><p className="font-semibold text-xs leading-none">Public / Citizen</p><p className="text-[10px] text-muted-foreground mt-1">Public alerts, basic maps, and field reporting</p></div>
            </Button>
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10 text-[10px] text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <p>Registration for public users is open. Official accounts are assigned by the PDRRM Office.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
