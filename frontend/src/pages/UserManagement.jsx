import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, HardHat, User, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [filterRole, setFilterRole] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => cnpdrrmceoc.entities.User.list('-created_date', 100),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => cnpdrrmceoc.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => cnpdrrmceoc.entities.User.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const roleConfig = {
    admin: { label: 'Admin', icon: Shield, color: 'text-red-600 bg-red-500/10 border-red-500/20' },
    eoc_personnel: { label: 'EOC Personnel', icon: HardHat, color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
    citizen: { label: 'Citizen', icon: User, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  };

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter(u => u.role === filterRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform roles and access permissions</p>
        </div>
        <Button disabled><UserPlus className="w-4 h-4 mr-2" /> Invite Official</Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Administrators</SelectItem>
            <SelectItem value="eoc_personnel">EOC Personnel</SelectItem>
            <SelectItem value="citizen">Citizens</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredUsers.length} user(s) found</span>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <p>Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No users matching filter</p>
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const config = roleConfig[user.role] || roleConfig.citizen;
            const RoleIcon = config.icon;

            return (
              <Card key={user.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", config.color)}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground">Access Level</Label>
                       <Select
                        value={user.role}
                        onValueChange={(newRole) => updateRoleMutation.mutate({ id: user.id, role: newRole })}
                       >
                         <SelectTrigger className="h-8 w-36 text-xs">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="citizen">Citizen</SelectItem>
                           <SelectItem value="eoc_personnel">EOC Personnel</SelectItem>
                           <SelectItem value="admin">Admin</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => {
                      if(confirm('Delete user?')) deleteUserMutation.mutate(user.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
