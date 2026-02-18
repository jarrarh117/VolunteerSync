
'use client';
import { useEffect, useState, useCallback } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { db, app as mainApp } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, UserPlus, Briefcase, AtSign, Lock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteUser } from '@/app/actions/delete-user';


interface User {
  uid: string;
  email: string;
  role: 'volunteer' | 'coordinator' | 'admin';
  createdAt: string;
}

const newUserSchema = z.object({
  email: z.string().email({ message: "A valid email is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(['volunteer', 'coordinator', 'admin'], { required_error: "A role must be selected." }),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { toast } = useToast();

  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "volunteer",
    },
  });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((childSnapshot) => {
        usersData.push({ uid: childSnapshot.key!, ...childSnapshot.val() });
      });
      setUsers(usersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
      setLoading(false);
    });

    // In a real app, you might want to return the unsubscribe function
    // to be called on cleanup, but for a manual refresh this is okay.
    return unsubscribe;
  }, [toast]);


  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, [fetchUsers]);

  const handleRoleChange = async (uid: string, newRole: User['role']) => {
    try {
      await set(ref(db, `users/${uid}/role`), newRole);
      toast({ title: "Role Updated", description: "The user's role has been successfully changed." });
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to update role: ${error.message}`, variant: "destructive" });
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
        await deleteUser(userToDelete.uid);
        toast({ title: "User Deleted", description: `${userToDelete.email} has been permanently deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to delete user: ${error.message}`, variant: "destructive" });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleAddUser = async (values: NewUserFormValues) => {
    setIsCreatingUser(true);
    // Create a temporary, secondary Firebase app instance.
    // This allows us to create a user without logging out the current admin.
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(mainApp.options, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
      const user = userCredential.user;
      
      const userData = {
        uid: user.uid,
        email: user.email,
        role: values.role,
        createdAt: new Date().toISOString(),
      };
      
      await set(ref(db, `users/${user.uid}`), userData);
      
      toast({ title: "User Created", description: `${values.email} has been added successfully.` });
      form.reset();
      setIsAddUserOpen(false);

    } catch (error: any) {
       toast({
        title: "Creation Failed",
        description: error.code === 'auth/email-already-in-use' ? 'This email is already in use.' : error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
      // Clean up the temporary app instance
      await deleteApp(tempApp);
    }
  }


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View, edit, and manage all users on the platform.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2" /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New User</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new user. They will be prompted to verify their email on first login.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="email" placeholder="user@example.com" {...field} className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="password" placeholder="Must be at least 8 characters" {...field} className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="volunteer">Volunteer</SelectItem>
                                    <SelectItem value="coordinator">Coordinator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isCreatingUser}>
                        {isCreatingUser ? 'Creating...' : 'Create User'}
                      </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
           </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center h-40">
                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'coordinator' ? 'secondary' : 'outline'}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleRoleChange(user.uid, 'volunteer')}>Set as Volunteer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(user.uid, 'coordinator')}>Set as Coordinator</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(user.uid, 'admin')}>Set as Admin</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/20 focus:text-destructive" onClick={() => confirmDeleteUser(user)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user's authentication record and all of their associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
