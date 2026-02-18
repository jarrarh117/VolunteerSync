
'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ListTodo, BarChart } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
import { useEffect, useState, useMemo, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';

interface User {
  uid: string;
  email: string;
  role: 'volunteer' | 'coordinator' | 'admin';
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  coordinatorId: string;
  date: string;
  volunteers?: { [uid: string]: any };
  volunteerSlots: number;
}

const MotionCard = motion(Card);

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut",
    },
  }),
  hover: { 
    scale: 1.03, 
    boxShadow: "0px 10px 30px -5px hsl(var(--primary)/0.3)",
    transition: { duration: 0.2 } 
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Task
            </span>
            <span className="font-bold text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
             <span className="text-[0.70rem] uppercase text-muted-foreground">
              Sign-ups
            </span>
            <span className="font-bold text-foreground">
              {payload[0].value} / {payload[1].value}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};


export default function AnalyticsOverview() {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const tasksRef = ref(db, 'tasks');

    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(child => {
        usersData.push({ uid: child.key!, ...child.val() });
      });
      setUsers(usersData);
    });

    const tasksUnsubscribe = onValue(tasksRef, (snapshot) => {
      const tasksData: Task[] = [];
      snapshot.forEach(child => {
        tasksData.push({ id: child.key!, ...child.val() });
      });
      setTasks(tasksData);
    });

    return () => {
      usersUnsubscribe();
      tasksUnsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    const volunteerCount = users.filter(u => u.role === 'volunteer').length;
    const coordinatorCount = users.filter(u => u.role === 'coordinator').length;
    const taskCount = tasks.length;
    const totalSignups = tasks.reduce((acc, task) => acc + (task.volunteers ? Object.keys(task.volunteers).length : 0), 0);
    return { volunteerCount, coordinatorCount, taskCount, totalSignups };
  }, [users, tasks]);

  const taskDataForChart = useMemo(() => {
    return tasks.slice(-10).map(task => ({
      name: task.title.substring(0, 15) + (task.title.length > 15 ? '...' : ''),
      'Signed Up': task.volunteers ? Object.keys(task.volunteers).length : 0,
      'Total Slots': task.volunteerSlots
    }));
  }, [tasks]);

  const statCards = [
    { title: "Total Volunteers", value: stats.volunteerCount, description: "Active members in the community", icon: Users },
    { title: "Total Coordinators", value: stats.coordinatorCount, description: "Team leaders creating tasks", icon: Users },
    { title: "Total Tasks", value: stats.taskCount, description: "Opportunities created", icon: ListTodo },
    { title: "Total Sign-ups", value: stats.totalSignups, description: "Volunteer positions filled", icon: BarChart },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <MotionCard
            key={card.title}
            className="bg-card/60 backdrop-blur-sm"
            custom={i}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </MotionCard>
        ))}
      </div>

      <MotionCard
        className="bg-card/60 backdrop-blur-sm"
        custom={4}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
      >
          <CardHeader>
            <CardTitle>Recent Task Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={taskDataForChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<CustomTooltip />}
                  />
                <Bar dataKey="Signed Up" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Slots" fill="hsl(var(--primary) / 0.2)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>
    </div>
  );
}
