
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, update, remove, query, get } from 'firebase/database';
import Starfield from '@/components/auth/starfield';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarIcon, MapPin, Users, Check, X, Clock, Medal, Hourglass, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from '@/components/theme-toggle';

interface VolunteerStatus {
    signedUpAt: string;
    verificationRequested?: boolean;
    completed?: boolean;
}

interface Task {
    id: string;
    title: string;
    description: string;
    date: string; // ISO string
    time: string;
    location: string;
    volunteerSlots: number;
    volunteers?: { [uid: string]: VolunteerStatus };
    duration: number;
    coordinatorId: string;
}

type UserRole = 'volunteer' | 'coordinator' | null;


export default function VolunteerDashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [userRole, setUserRole] = useState<UserRole>(null);


    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            if (!user.emailVerified) {
                router.push('/verify-email');
                return;
            }
             const userRef = ref(db, `users/${user.uid}/role`);
            get(userRef).then((snapshot) => {
                if(snapshot.exists()) {
                    const role = snapshot.val();
                    setUserRole(role);
                    if (role === 'coordinator') {
                        router.push('/dashboard/coordinator');
                    }
                }
            });
        }
    }, [user, loading, router]);

     useEffect(() => {
        if (!user) return;
        
        const tasksRef = ref(db, "tasks");
        const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
            const tasksData: Task[] = [];
            snapshot.forEach((childSnapshot) => {
                tasksData.push({
                    id: childSnapshot.key!,
                    ...childSnapshot.val(),
                });
            });
            setTasks(tasksData);
        });

        return () => {
            unsubscribeTasks();
        }
    }, [user]);

    const handleSignUp = async (taskId: string) => {
        if (!user) return;
        try {
            const updates: { [key: string]: any } = {};
            updates[`/tasks/${taskId}/volunteers/${user.uid}`] = {
                signedUpAt: new Date().toISOString(),
                completed: false,
                verificationRequested: false,
            };
            await update(ref(db), updates);

            toast({
                title: "Signed Up!",
                description: "You have successfully signed up for the task.",
            });
        } catch (error: any) {
             toast({
                title: "Error Signing Up",
                description: error.message,
                variant: "destructive",
            });
        }
    };
    
    const handleCancel = async (taskId: string) => {
        if (!user) return;
        try {
            const volunteerRef = ref(db, `/tasks/${taskId}/volunteers/${user.uid}`);
            await remove(volunteerRef);

            toast({
                title: "Registration Cancelled",
                description: "You have cancelled your registration for this task.",
                variant: "destructive"
            });
        } catch (error: any) {
             toast({
                title: "Error Cancelling",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleRequestVerification = async (taskId: string) => {
        if (!user) return;
        try {
            const updates: { [key: string]: any } = {};
            updates[`/tasks/${taskId}/volunteers/${user.uid}/verificationRequested`] = true;
            await update(ref(db), updates);
            toast({
                title: "Verification Requested",
                description: "Your coordinator has been notified to verify your participation.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }

    const { upcomingTasks, pastTasks, completedTasksCount, totalHours } = useMemo(() => {
        if (!user) {
            return { upcomingTasks: [], pastTasks: [], completedTasksCount: 0, totalHours: 0 };
        }
        
        const mySignedUpTasks = tasks.filter(task => task.volunteers && task.volunteers[user.uid]);

        const upcoming = mySignedUpTasks
            .filter(task => new Date(task.date).getTime() >= new Date().setHours(0, 0, 0, 0))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const past = mySignedUpTasks
            .filter(task => new Date(task.date).getTime() < new Date().setHours(0, 0, 0, 0))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const completed = mySignedUpTasks.filter(task => task.volunteers?.[user.uid]?.completed);
        const hours = completed.reduce((acc, task) => acc + (task.duration || 0), 0);
        
        return { upcomingTasks: upcoming, pastTasks: past, completedTasksCount: completed.length, totalHours: hours };
    }, [tasks, user]);


    const sortedAllTasks = useMemo(() => {
        if (!user) return [];
        return tasks
            .filter(task => 
                new Date(task.date).getTime() >= new Date().setHours(0,0,0,0) &&
                task.coordinatorId !== user.uid // Don't show tasks created by this user if they are a coordinator
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [tasks, user]);
    
    if (loading || !user || !user.emailVerified || !userRole) {
        return (
          <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
            <Starfield />
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        );
    }

    const renderTaskCard = (task: Task, context: "all" | "signed-up-upcoming" | "signed-up-past") => {
        if (!user) return null;
        const volunteerStatus = task.volunteers ? task.volunteers[user.uid] : undefined;
        const volunteerCount = task.volunteers ? Object.keys(task.volunteers).length : 0;
        const isSignedUp = !!volunteerStatus;
        const isFull = volunteerCount >= task.volunteerSlots;

        let actionButton;

        switch (context) {
            case 'all':
                 if (isSignedUp) {
                    actionButton = <Button variant="outline" disabled>Already Signed Up</Button>;
                } else {
                    actionButton = (
                        <Button onClick={() => handleSignUp(task.id)} disabled={isFull}>
                            {isFull ? "Fully Booked" : <><Check className="mr-2 h-4 w-4" /> Sign Up</>}
                        </Button>
                    );
                }
                break;
            case 'signed-up-upcoming':
                 actionButton = <Button variant="destructive" onClick={() => handleCancel(task.id)}><X className="mr-2 h-4 w-4" /> Cancel Signup</Button>;
                 break;
            case 'signed-up-past':
                if (volunteerStatus?.completed) {
                    actionButton = <div className="flex items-center text-green-400 font-semibold"><CheckCircle2 className="mr-2 h-5 w-5"/> Completed</div>;
                } else if (volunteerStatus?.verificationRequested) {
                    actionButton = <div className="flex items-center text-yellow-400 font-semibold"><Hourglass className="mr-2 h-5 w-5"/> Verification Pending</div>;
                } else {
                    actionButton = <Button onClick={() => handleRequestVerification(task.id)}>Request Verification</Button>;
                }
                break;
        }

        return (
            <Card key={task.id} className={`bg-card/60 backdrop-blur-sm border-border transition-colors ${isSignedUp ? 'border-primary' : 'hover:border-primary/50'}`}>
                <CardHeader>
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <CardDescription>{format(new Date(task.date), "PPP")} @ {task.time}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">{task.description}</p>
                    <div className="flex flex-wrap items-center text-muted-foreground text-sm gap-4">
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4"/> {task.location}</div>
                        <div className="flex items-center gap-2"><Users className="h-4 w-4"/> {task.volunteerSlots - volunteerCount > 0 ? `${task.volunteerSlots - volunteerCount} of ${task.volunteerSlots} slots available` : 'Fully Booked'}</div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4"/> {task.duration} hours</div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end items-center">
                    {actionButton}
                </CardFooter>
            </Card>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden">
            <Starfield />
            <div className="container mx-auto p-4 md:p-8 z-10 relative">
                 <header className="flex justify-between items-center mb-8">
                     <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
                        Volunteer Dashboard
                    </h1>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Button onClick={() => auth.signOut()} className="font-bold hover:shadow-[0_0_20px_theme(colors.accent)] transition-shadow">
                            Logout
                        </Button>
                    </div>
                </header>

                <div className="mb-8">
                     <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">Your Progress</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Card className="bg-card/60 backdrop-blur-sm border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                                <Medal className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{completedTasksCount}</div>
                                <p className="text-xs text-muted-foreground">tasks successfully undertaken</p>
                            </CardContent>
                         </Card>
                         <Card className="bg-card/60 backdrop-blur-sm border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
                                <Hourglass className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalHours}</div>
                                <p className="text-xs text-muted-foreground">hours contributed to the community</p>
                            </CardContent>
                         </Card>
                     </div>
                </div>

                <Tabs defaultValue="available" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-6">
                        <TabsTrigger value="available">Available Opportunities</TabsTrigger>
                        <TabsTrigger value="my-missions">My Tasks</TabsTrigger>
                    </TabsList>
                    <TabsContent value="available">
                         <h2 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">All Upcoming Opportunities</h2>
                         <div className="space-y-6">
                            {sortedAllTasks.length > 0 ? (
                                sortedAllTasks.map(task => renderTaskCard(task, 'all'))
                            ) : (
                                <Card className="bg-card/60 border-dashed border-border">
                                     <CardContent className="p-10 text-center">
                                        <p className="text-muted-foreground">No upcoming opportunities. Check back soon!</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="my-missions">
                        <Tabs defaultValue="upcoming" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto mb-4">
                                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                                <TabsTrigger value="past">Past</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upcoming">
                                <div className="space-y-4">
                                    {upcomingTasks.length > 0 ? (
                                        upcomingTasks.map(task => renderTaskCard(task, 'signed-up-upcoming'))
                                    ) : (
                                         <p className="text-muted-foreground text-center">You haven't signed up for any upcoming tasks.</p>
                                    )}
                                </div>
                            </TabsContent>
                             <TabsContent value="past">
                                <div className="space-y-4">
                                    {pastTasks.length > 0 ? (
                                        pastTasks.map(task => renderTaskCard(task, 'signed-up-past'))
                                    ) : (
                                         <p className="text-muted-foreground text-center">You have no past tasks.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

    