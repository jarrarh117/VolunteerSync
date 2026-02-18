# CosmicConnect 🌌

AI-powered volunteer coordination platform connecting community volunteers with coordinators. Features role-based dashboards, real-time task tracking, and Google Gemini AI integration for automated task generation and performance analytics.

## ✨ Features

### For Volunteers
- Browse and sign up for community volunteer opportunities
- Real-time task tracking and status updates
- View completed tasks and contribution history
- Receive AI-generated performance reports

### For Coordinators
- Create and manage volunteer tasks with ease
- AI-powered task generation from simple prompts
- Monitor volunteer sign-ups and task completion
- Generate detailed performance reports for volunteers
- Real-time dashboard with analytics

### For Administrators
- Comprehensive user management system
- Platform-wide task monitoring
- Role-based access control
- Analytics overview and insights
- Secure admin authentication system

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI (ShadCN)
- **Backend:** Firebase (Authentication & Realtime Database)
- **AI Integration:** Google Gemini AI via Genkit
- **Form Handling:** React Hook Form + Zod
- **Email:** React Email + Resend
- **Charts:** Recharts
- **Animations:** Framer Motion

## 📋 Prerequisites

- Node.js 20+ 
- npm or yarn
- Firebase account
- Google AI (Gemini) API key
- Resend API key (for email functionality)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cosmicconnect.git
cd cosmicconnect
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:

Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Create `env.txt` (or add to `.env.local`):
```env
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
```

4. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Realtime Database
   - Deploy the security rules from `database.rules.json`

5. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:9002`

## 🤖 AI Development

To work with Genkit AI flows:

```bash
# Start Genkit development server
npm run genkit:dev

# Start with auto-reload
npm run genkit:watch
```

## 📦 Available Scripts

- `npm run dev` - Start development server (port 9002)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development
- `npm run genkit:watch` - Start Genkit with auto-reload

## 🏗️ Project Structure

```
cosmicconnect/
├── src/
│   ├── ai/                    # Genkit AI flows
│   │   ├── flows/
│   │   │   ├── task-generator-flow.ts
│   │   │   └── data-report-flow.ts
│   │   ├── genkit.ts
│   │   └── dev.ts
│   ├── app/                   # Next.js app router
│   │   ├── actions/           # Server actions
│   │   ├── admin/             # Admin dashboard
│   │   ├── dashboard/         # User dashboards
│   │   └── verify-email/
│   ├── components/
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Authentication components
│   │   └── ui/                # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   │   ├── firebase.ts
│   │   ├── firebase-admin.ts
│   │   └── utils.ts
│   └── emails/                # Email templates
├── database.rules.json        # Firebase security rules
└── package.json
```

## 🔐 Security

- Role-based access control (RBAC) with three user roles
- Firebase Realtime Database security rules
- Separate admin authentication system
- Environment variable protection for API keys
- Server-side validation with Zod schemas

## 🎨 UI Features

- Dark/Light theme support
- Responsive design for all screen sizes
- Animated starfield background
- Modern card-based layouts
- Interactive data visualizations
- Toast notifications
- Loading states and skeletons

## 📧 Email Integration

The platform uses React Email and Resend for sending:
- Task completion notifications
- Performance reports
- Admin password reset emails

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Developed as an internship project demonstrating full-stack development with AI integration.

## 🙏 Acknowledgments

- Built with Firebase Studio
- AI assistance from Gemini
- UI components from ShadCN
- Icons from Lucide React

---

Made with ❤️ and AI
