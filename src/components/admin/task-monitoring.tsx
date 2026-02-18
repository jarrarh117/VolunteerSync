
'use client';
import { useEffect, useState, useMemo } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  coordinatorId: string;
  volunteerSlots: number;
  volunteers?: { [uid:string]: any };
  coordinatorEmail?: string;
}

export default function TaskMonitoring() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const tasksRef = ref(db, 'tasks');

    const unsubscribe = onValue(tasksRef, async (snapshot) => {
      const tasksData: Task[] = [];
      const coordinatorPromises: Promise<any>[] = [];

      snapshot.forEach((child) => {
        const task: Task = { id: child.key!, ...child.val() };
        tasksData.push(task);

        // Create a promise to fetch the coordinator's email
        const coordinatorPromise = get(ref(db, `users/${task.coordinatorId}/email`)).then((emailSnapshot) => {
          if (emailSnapshot.exists()) {
            task.coordinatorEmail = emailSnapshot.val();
          }
        });
        coordinatorPromises.push(coordinatorPromise);
      });
      
      // Wait for all coordinator emails to be fetched
      await Promise.all(coordinatorPromises);
      
      setTasks(tasksData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTaskStatus = (task: Task) => {
    const taskDate = new Date(task.date);
    const now = new Date();
    if (taskDate < now) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    return <Badge>Upcoming</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Platform Tasks</CardTitle>
        <CardDescription>Monitor all tasks created by coordinators across the platform.</CardDescription>
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
                <TableHead>Task Title</TableHead>
                <TableHead>Coordinator</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Sign-ups</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.coordinatorEmail || task.coordinatorId}</TableCell>
                  <TableCell>{format(new Date(task.date), 'PPP')}</TableCell>
                  <TableCell>
                    {task.volunteers ? Object.keys(task.volunteers).length : 0} / {task.volunteerSlots}
                  </TableCell>
                  <TableCell>{getTaskStatus(task)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
