
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { ref, push, onValue, remove, get, query, orderByChild, equalTo, set, update } from 'firebase/database';
import Starfield from '@/components/auth/starfield';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, MapPin, Trash2, Users, Wand2, FileText, Download, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// Removed AI flow imports - using API routes instead
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { ThemeToggle } from '@/components/theme-toggle';
import { sendCompletionEmail } from '@/app/actions/send-completion-email';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Type for the report output
type GenerateDataReportOutput = {
  taskRecap: {
    title: string;
    date: string;
    status: string;
  };
  volunteerPerformance: {
    summary: string;
    strengths: string[];
    suggestions: string[];
  };
};


const taskSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  date: z.date({ required_error: "A date is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please use HH:MM format."),
  duration: z.coerce.number().min(0.5, "Duration must be at least 0.5 hours."),
  location: z.string().min(3, "Location is required."),
  volunteerSlots: z.coerce.number().min(1, "You must have at least one volunteer slot."),
});

const aiTaskSchema = z.object({
    prompt: z.string().min(10, "Please describe the task you want to create in more detail.")
})

type TaskFormValues = z.infer<typeof taskSchema>;
type AiTaskFormValues = z.infer<typeof aiTaskSchema>;

interface Volunteer {
    uid: string;
    email: string;
}

interface VolunteerStatus {
    signedUpAt: string;
    verificationRequested?: boolean;
    completed?: boolean;
}

interface Task {
    id: string;
    title: string;
    description: string;
    date: string; // Stored as ISO string
    time: string;
    location: string;
    volunteerSlots: number;
    duration: number;
    volunteers?: { [uid: string]: VolunteerStatus };
    volunteerDetails?: (Volunteer & { status: VolunteerStatus })[];
}

interface Report {
    reportId: string;
    volunteerUid: string;
    taskId: string;
    coordinatorUid: string;
    generatedAt: string;
    reportContent: GenerateDataReportOutput;
}


export default function CoordinatorDashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [selectedReportContext, setSelectedReportContext] = useState<{ volunteer: Volunteer, task: Task } | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<GenerateDataReportOutput | null>(null);
    const [existingReports, setExistingReports] = useState<Report[]>([]);


    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            title: "",
            description: "",
            time: "12:00",
            duration: 2,
            location: "",
            volunteerSlots: 10,
        },
    });

    const aiForm = useForm<AiTaskFormValues>({
        resolver: zodResolver(aiTaskSchema),
        defaultValues: {
            prompt: ""
        }
    })

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user && !user.emailVerified) {
            router.push('/verify-email');
        }
    }, [user, loading, router]);
    
    useEffect(() => {
        if (!user) return;
        
        const tasksRef = ref(db, "tasks");
        const q = query(tasksRef, orderByChild("coordinatorId"), equalTo(user.uid));

        const unsubscribe = onValue(q, async (snapshot) => {
            const tasksData: Task[] = [];
            const taskPromises: Promise<void>[] = [];

            snapshot.forEach((childSnapshot) => {
                const id = childSnapshot.key;
                const data = childSnapshot.val();
                if (id) {
                    const task: Task = { id, ...data, volunteerDetails: [] };
                    tasksData.push(task);
                    if (data.volunteers) {
                        const volunteerUids = Object.keys(data.volunteers);

                        const detailPromise = (async () => {
                            const volunteerDetails: (Volunteer & { status: VolunteerStatus })[] = [];
                            for (const uid of volunteerUids) {
                                const userSnapshot = await get(ref(db, `users/${uid}`));
                                if (userSnapshot.exists()) {
                                    const userData = userSnapshot.val();
                                    volunteerDetails.push({ 
                                        uid, 
                                        email: userData.email, 
                                        status: data.volunteers[uid] 
                                    });
                                }
                            }
                            task.volunteerDetails = volunteerDetails;
                        })();
                        taskPromises.push(detailPromise);
                    }
                }
            });

            await Promise.all(taskPromises);
            setTasks(tasksData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });

        const reportsRef = ref(db, 'reports');
        const reportsQuery = query(reportsRef, orderByChild('coordinatorUid'), equalTo(user.uid));
        const unsubscribeReports = onValue(reportsQuery, (snapshot) => {
            const reportsData: Report[] = [];
            snapshot.forEach((childSnapshot) => {
                reportsData.push({ ...childSnapshot.val(), reportId: childSnapshot.key });
            });
            setExistingReports(reportsData);
        });

        return () => {
            unsubscribe();
            unsubscribeReports();
        }
    }, [user]);

    const onSubmit = useCallback(async (data: TaskFormValues) => {
        if (!user) return;
        setIsCreatingTask(true);
        try {
            const tasksRef = ref(db, "tasks");
            await push(tasksRef, {
                ...data,
                date: data.date.toISOString(),
                coordinatorId: user.uid,
                createdAt: new Date().toISOString(),
            });
            toast({
                title: "Task Created!",
                description: "Your new task has been added to the list.",
            });
            form.reset({
                title: "",
                description: "",
                date: undefined,
                time: "12:00",
                duration: 2,
                location: "",
                volunteerSlots: 10,
            });
        } catch (error: any) {
            toast({
                title: "Error Creating Task",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCreatingTask(false);
        }
    }, [user, toast, form]);

     const onAiSubmit = async (data: AiTaskFormValues) => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: data.prompt }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate task');
            }
            
            const result = await response.json();
            form.setValue('title', result.title);
            form.setValue('description', result.description);
            form.setValue('location', result.location);
            toast({
                title: "Task Generated!",
                description: "The task details have been filled in for you.",
            });
            setIsAiModalOpen(false);
            aiForm.reset();
        } catch (error: any) {
            toast({
                title: "AI Generation Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const deleteTask = async (taskId: string) => {
        try {
            const taskRef = ref(db, `tasks/${taskId}`);
            await remove(taskRef);
            toast({
                title: "Task Deleted",
                description: "The task has been successfully removed.",
            })
        } catch (error: any) {
            toast({
                title: "Error Deleting Task",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    const handleVerifyCompletion = async (task: Task, volunteer: Volunteer) => {
        if (!user || !user.email) return;

        try {
            const verificationRef = ref(db, `tasks/${task.id}/volunteers/${volunteer.uid}`);
            await update(verificationRef, {
                completed: true,
                verificationRequested: false, 
            });
            
            const coordinatorName = user.email.split('@')[0];
            await sendCompletionEmail(volunteer.email, task.title, coordinatorName);

            toast({
                title: "Verification Complete",
                description: `Confirmation email sent to ${volunteer.email}.`,
            });
        } catch (error: any) {
            toast({
                title: "Verification Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleGenerateReport = async () => {
        if (!selectedReportContext || !user) return;
        
        const { volunteer, task } = selectedReportContext;

        setIsGenerating(true);
        
        try {
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    volunteerEmail: volunteer.email,
                    task: {
                        title: task.title,
                        description: task.description,
                        duration: task.duration,
                        date: task.date
                    }
                }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }
            
            const result = await response.json();
            
            setGeneratedReport(result);

            const reportId = push(ref(db, 'reports')).key;
            if (!reportId) throw new Error("Could not generate report ID.");

            const reportData: Omit<Report, 'reportId'> = {
                volunteerUid: volunteer.uid,
                taskId: task.id,
                coordinatorUid: user.uid,
                generatedAt: new Date().toISOString(),
                reportContent: result,
            };
            
            const newReport = { ...reportData, reportId };

            const reportRef = ref(db, `reports/${reportId}`);
            await set(reportRef, newReport);
            
            setExistingReports(prev => [...prev, newReport]);

            toast({
                title: "Report Generated & Saved",
                description: `A performance report for ${volunteer.email} for task "${task.title}" has been created.`,
            });

        } catch (error: any) {
             toast({
                title: "Report Generation Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    }
    
    const downloadPdf = (volunteer: Volunteer, task: Task, report: GenerateDataReportOutput) => {
        const doc = new jsPDF();
        const { taskRecap, volunteerPerformance } = report;
        
        doc.setFontSize(18);
        doc.text(`Performance Report for ${volunteer.email}`, 14, 22);
        doc.setFontSize(12);
        doc.text(`Task: ${task.title}`, 14, 30);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 36);
        
        autoTable(doc, {
            startY: 45,
            head: [['Task Detail', 'Information']],
            body: [
                ['Title', taskRecap.title],
                ['Date', format(new Date(taskRecap.date), "PPP")],
                ['Status', taskRecap.status],
            ],
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Performance Summary", 14, finalY);
        doc.setFontSize(11);
        doc.setTextColor(100);
        const summaryLines = doc.splitTextToSize(volunteerPerformance.summary, 180);
        doc.text(summaryLines, 14, finalY + 6);
        finalY += (summaryLines.length * 5) + 12;

        if (volunteerPerformance.strengths.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("Identified Strengths", 14, finalY);
            finalY += 6;
            doc.setFontSize(11);
            doc.setTextColor(100);
            volunteerPerformance.strengths.forEach((strength) => {
                doc.text(`- ${strength}`, 16, finalY);
                finalY += 6;
            });
        }

         if (volunteerPerformance.suggestions.length > 0) {
            finalY += 4;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("Suggestions for Growth", 14, finalY);
            finalY += 6;
            doc.setFontSize(11);
            doc.setTextColor(100);
            volunteerPerformance.suggestions.forEach((suggestion) => {
                doc.text(`- ${suggestion}`, 16, finalY);
                finalY += 6;
            });
        }
        
        doc.save(`report-${volunteer.uid}-${task.id}.pdf`);
    };

    const downloadDocx = async (volunteer: Volunteer, task: Task, report: GenerateDataReportOutput) => {
        const { taskRecap, volunteerPerformance } = report;

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: `Performance Report for ${volunteer.email}`,
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: "\n" }),
                    new Paragraph({ text: "Task Recap", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ children: [ new TextRun({ text: "Title: ", bold: true }), new TextRun(taskRecap.title) ]}),
                    new Paragraph({ children: [ new TextRun({ text: "Date: ", bold: true }), new TextRun(format(new Date(taskRecap.date), "PPP")) ]}),
                    new Paragraph({ children: [ new TextRun({ text: "Status: ", bold: true }), new TextRun(taskRecap.status) ]}),
                    new Paragraph({ text: "\n" }),
                    new Paragraph({ text: "Volunteer Performance", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }),
                    new Paragraph(volunteerPerformance.summary),
                    new Paragraph({ text: "\n" }),
                    ...(volunteerPerformance.strengths.length > 0 ? [
                        new Paragraph({ text: "Identified Strengths", heading: HeadingLevel.HEADING_2 }),
                        ...volunteerPerformance.strengths.map(s => new Paragraph({ text: `- ${s}`, bullet: { level: 0 } })),
                         new Paragraph({ text: "\n" }),
                    ] : []),
                     ...(volunteerPerformance.suggestions.length > 0 ? [
                        new Paragraph({ text: "Suggestions for Growth", heading: HeadingLevel.HEADING_2 }),
                        ...volunteerPerformance.suggestions.map(s => new Paragraph({ text: `- ${s}`, bullet: { level: 0 } })),
                    ] : []),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `report-${volunteer.uid}-${task.id}.docx`);
    };

    const openReportModal = (volunteer: Volunteer, task: Task) => {
        setSelectedReportContext({ volunteer, task });
        
        const existingReport = existingReports.find(r => r.volunteerUid === volunteer.uid && r.taskId === task.id);
        if (existingReport) {
            setGeneratedReport(existingReport.reportContent);
        } else {
            setGeneratedReport(null);
        }

        setIsReportModalOpen(true);
    }


    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [tasks]);

    const { upcomingTasks, pastTasks } = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        const upcoming = tasks
            .filter(task => new Date(task.date).getTime() >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = tasks
            .filter(task => new Date(task.date).getTime() < today)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcomingTasks: upcoming, pastTasks: past };
    }, [tasks]);

    const chartData = useMemo(() => {
        return sortedTasks.map(task => ({
            name: task.title.slice(0, 15) + (task.title.length > 15 ? '...' : ''),
            "Signed Up": task.volunteers ? Object.keys(task.volunteers).length : 0,
            "Slots": task.volunteerSlots,
        }));
    }, [sortedTasks]);

    if (loading || !user || !user.emailVerified) {
        return (
          <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
            <Starfield />
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        );
    }

    const isTaskPast = (task: Task) => new Date(task.date).getTime() < new Date().setHours(0, 0, 0, 0);

    const renderTaskCard = (task: Task) => (
        <Card key={task.id} className="bg-card/60 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <CardDescription>{format(new Date(task.date), "PPP")} @ {task.time}</CardDescription>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/20">
                            <Trash2 className="h-5 w-5"/>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task
                            and remove all associated volunteer data.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardHeader>
            <CardContent>
                <p className="mb-4">{task.description}</p>
                <div className="flex flex-wrap items-center text-muted-foreground text-sm gap-4">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4"/> {task.location}</div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4"/> {task.volunteers ? Object.keys(task.volunteers).length : 0} / {task.volunteerSlots} slots</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4"/> {task.duration} hours</div>
                </div>
            </CardContent>
            {(task.volunteerDetails && task.volunteerDetails.length > 0) && (
                <CardFooter className="flex-col items-start gap-4 pt-4">
                    <h4 className="font-semibold text-sm">Volunteers:</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-4">
                        {task.volunteerDetails.map(volunteer => {
                            const { status } = volunteer;

                            let statusIndicator;
                            if (status.completed) {
                                statusIndicator = (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost"
                                                        className="h-6 w-6 text-primary hover:bg-primary/20 rounded-full"
                                                        onClick={() => openReportModal(volunteer, task)}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Generate/View Report</p>
                                                </TooltipContent>
                                            </Tooltip>
                                    </div>
                                );
                            } else if (status.verificationRequested && isTaskPast(task)) {
                                statusIndicator = <Button size="sm" onClick={() => handleVerifyCompletion(task, volunteer)}>Verify Completion</Button>;
                            } else if (isTaskPast(task)) {
                                statusIndicator = <Tooltip><TooltipTrigger asChild><HelpCircle className="h-5 w-5 text-yellow-500" /></TooltipTrigger><TooltipContent><p>Awaiting volunteer verification request</p></TooltipContent></Tooltip>;
                            }

                            return (
                                <div key={volunteer.uid} className="flex items-center gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                                <Avatar className="h-8 w-8 border-2 border-muted hover:border-primary">
                                                <AvatarFallback>{volunteer.email.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{volunteer.email}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    {statusIndicator && <div className="ml-2">{statusIndicator}</div>}
                                </div>
                            );
                        })}
                    </div>
                </CardFooter>
            )}
        </Card>
    );

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground overflow-hidden">
                <Starfield />
                <div className="container mx-auto p-4 md:p-8 z-10 relative">
                    <header className="flex justify-between items-center mb-8">
                         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
                            Coordinator Dashboard
                        </h1>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <Button onClick={() => auth.signOut()} className="font-bold hover:shadow-[0_0_20px_theme(colors.accent)] transition-shadow">
                                Logout
                            </Button>
                        </div>
                    </header>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                           <Card className="bg-card/60 backdrop-blur-md border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)]">
                               <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col space-y-1.5">
                                            <CardTitle>Create New Task</CardTitle>
                                            <CardDescription>Fill out the details for a new volunteer opportunity.</CardDescription>
                                        </div>
                                        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                                            <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className='text-primary hover:bg-primary/20'>
                                                        <Wand2 className='h-5 w-5' />
                                                    </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Generate Task with AI</DialogTitle>
                                                    <DialogDescription>
                                                        Describe the task you want to create. The AI will generate a title, description, and location for you.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Form {...aiForm}>
                                                        <form onSubmit={aiForm.handleSubmit(onAiSubmit)} className="space-y-4">
                                                            <FormField control={aiForm.control} name="prompt" render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Task Idea</FormLabel>
                                                                    <FormControl><Textarea placeholder="E.g., A community clean-up event at the local park..." {...field} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            <Button type="submit" disabled={isGenerating} className="w-full font-bold">
                                                                {isGenerating ? "Generating..." : "Generate Task"}
                                                            </Button>
                                                        </form>
                                                </Form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>
                               <CardContent>
                                   <Form {...form}>
                                       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                           <FormField control={form.control} name="title" render={({ field }) => (
                                               <FormItem>
                                                   <FormLabel>Title</FormLabel>
                                                   <FormControl><Input placeholder="E.g., Community Park Cleanup" {...field} /></FormControl>
                                                   <FormMessage />
                                               </FormItem>
                                           )} />
                                           <FormField control={form.control} name="description" render={({ field }) => (
                                               <FormItem>
                                                   <FormLabel>Description</FormLabel>
                                                   <FormControl><Textarea placeholder="Describe the volunteer task..." {...field} /></FormControl>
                                                   <FormMessage />
                                               </FormItem>
                                           )} />
                                            <FormField control={form.control} name="date" render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-full pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                                >
                                                                {field.value ? (
                                                                    format(field.value, "PPP")
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="time" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Time (24h)</FormLabel>
                                                        <FormControl><Input type="time" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="duration" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Duration (h)</FormLabel>
                                                        <FormControl><Input type="number" min="0.5" step="0.5" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="volunteerSlots" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Slots</FormLabel>
                                                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="location" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Location</FormLabel>
                                                        <FormControl><Input placeholder="E.g., City Center Park" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                           <Button type="submit" disabled={isCreatingTask} className="w-full font-bold">
                                                {isCreatingTask ? "Creating..." : "Create Task"}
                                           </Button>
                                       </form>
                                   </Form>
                               </CardContent>
                           </Card>
                        </div>
                        <div className="lg:col-span-2 space-y-8">
                             <div>
                                <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">Your Tasks</h2>
                                <Tabs defaultValue="upcoming" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6">
                                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                                        <TabsTrigger value="past">Past</TabsTrigger>
                                        <TabsTrigger value="all">All</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="upcoming">
                                        <div className="space-y-4">
                                            {upcomingTasks.length > 0 ? (
                                                upcomingTasks.map(renderTaskCard)
                                            ) : (
                                                <Card className="bg-card/60 border-dashed border-border">
                                                    <CardContent className="p-10 text-center">
                                                        <p className="text-muted-foreground">You have no upcoming tasks.</p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="past">
                                        <div className="space-y-4">
                                            {pastTasks.length > 0 ? (
                                                pastTasks.map(renderTaskCard)
                                            ) : (
                                                <Card className="bg-card/60 border-dashed border-border">
                                                    <CardContent className="p-10 text-center">
                                                        <p className="text-muted-foreground">You have no past tasks.</p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="all">
                                        <div className="space-y-4">
                                            {tasks.length > 0 ? (
                                                tasks.map(renderTaskCard)
                                            ) : (
                                                <Card className="bg-card/60 border-dashed border-border">
                                                    <CardContent className="p-10 text-center">
                                                        <p className="text-muted-foreground">You haven't created any tasks yet.</p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                             <div>
                                <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">Task Analytics</h2>
                                 <Card className="bg-card/60 backdrop-blur-sm border-border">
                                     <CardHeader>
                                         <CardTitle>Volunteer Sign-ups</CardTitle>
                                         <CardDescription>A summary of volunteers signed up versus available slots for each task.</CardDescription>
                                     </CardHeader>
                                     <CardContent>
                                        {chartData.length > 0 ? (
                                             <ResponsiveContainer width="100%" height={300}>
                                                 <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                     <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                     <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                                     <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                                     <RechartsTooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: 'hsl(var(--background))', 
                                                            borderColor: 'hsl(var(--border))'
                                                        }}
                                                     />
                                                     <Bar dataKey="Signed Up" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                     <Bar dataKey="Slots" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                                                 </RechartsBarChart>
                                             </ResponsiveContainer>
                                        ) : (
                                            <div className="h-[300px] flex items-center justify-center">
                                                <p className="text-muted-foreground">No task data to display. Create a task to see analytics.</p>
                                            </div>
                                        )}
                                     </CardContent>
                                 </Card>
                             </div>
                        </div>
                    </div>
                </div>

                <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Performance Report for {selectedReportContext?.volunteer.email}</DialogTitle>
                            <DialogDescription>
                                For task: <span className='font-semibold'>{selectedReportContext?.task.title}</span>. This report is generated by AI.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                            {isGenerating && !generatedReport && (
                                <div className="flex items-center justify-center h-40">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {generatedReport ? (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Task Recap</h3>
                                        <dl className="grid grid-cols-3 gap-2 text-sm border p-3 rounded-md">
                                            <dt className="font-medium text-muted-foreground">Title</dt>
                                            <dd className="col-span-2">{generatedReport.taskRecap.title}</dd>
                                            <dt className="font-medium text-muted-foreground">Date</dt>
                                            <dd className="col-span-2">{format(new Date(generatedReport.taskRecap.date), "PPP")}</dd>
                                            <dt className="font-medium text-muted-foreground">Status</dt>
                                            <dd className="col-span-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                   {generatedReport.taskRecap.status}
                                                </span>
                                            </dd>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Performance Analysis</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-medium mb-1">Summary</h4>
                                                <p className="text-sm text-muted-foreground">{generatedReport.volunteerPerformance.summary}</p>
                                            </div>
                                            {generatedReport.volunteerPerformance.strengths.length > 0 && (
                                                <div>
                                                    <h4 className="font-medium mb-1">Identified Strengths</h4>
                                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                        {generatedReport.volunteerPerformance.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {generatedReport.volunteerPerformance.suggestions.length > 0 && (
                                                <div>
                                                    <h4 className="font-medium mb-1">Suggestions</h4>
                                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                        {generatedReport.volunteerPerformance.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40">
                                    <p className="text-muted-foreground">Click "Generate Report" to create a performance summary for this task.</p>
                                </div>
                            )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                {generatedReport ? (
                                     <>
                                        <Button variant="outline" onClick={() => selectedReportContext && downloadPdf(selectedReportContext.volunteer, selectedReportContext.task, generatedReport)} className="w-full">
                                            <Download className="mr-2 h-4 w-4" /> PDF
                                        </Button>
                                        <Button variant="outline" onClick={() => selectedReportContext && downloadDocx(selectedReportContext.volunteer, selectedReportContext.task, generatedReport)} className="w-full">
                                            <Download className="mr-2 h-4 w-4" /> DOCX
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full font-bold">
                                        {isGenerating ? "Generating..." : "Generate New Report"}
                                    </Button>
                                )}
                            </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
