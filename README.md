# BookingPro - Professional Appointment Scheduling Platform

## Overview

BookingPro is a comprehensive professional assistant platform that combines appointment scheduling with personal organization tools. The application serves as an all-in-one solution for industry professionals featuring appointment booking, memo management, task tracking, and is installable as a Progressive Web App (PWA). The platform includes Replit Auth authentication, allowing users to sign in/out and access their personalized dashboard with all functionality integrated into one professional assistant interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2025)

### New Features Added
- **5 New Core Pages**: My Bookings, Provider Settings, Appointment Confirmation, Reviews, Notifications
- **7 Complete Pages**: About, Help/FAQ, Contact, Privacy Policy, Terms of Service, Messages, Calendar
- **Improved 404 Page**: Better error handling with helpful navigation
- **Enhanced Navigation**: Quick-access buttons for bookings, notifications, settings, and messages
- **Footer Component**: Complete footer with links, social media, contact info
- **Total Pages**: 20+ fully functional pages covering entire platform lifecycle
- **Build Status**: All pages successfully compile, no TypeScript errors

### Complete Feature Set
- Authentication System (Replit Auth with sign-in/out)
- Provider Discovery & Search with filtering
- **Professional Personalization**: Customizable titles/prefixes (Dr., Prof., etc.)
- **Social Integration**: Linktree-style social links (Instagram, Twitter, LinkedIn, Website)
- **Robust Profiles**: Advanced bio management and personalized dashboard displays
- Full Appointment Booking Flow with confirmation
- Professional Analytics Dashboard
- Personal Assistant (Memos & Tasks)
- Client Appointment History
- Provider Profile Management
- Review & Rating System
- Notification Center
- In-App Messaging System
- Calendar View with event tracking
- Comprehensive Help Center with FAQ
- Contact & Support Pages
- Legal Pages (Privacy, Terms)
- Responsive Mobile-First Design
- Progressive Web App (PWA) Installable

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, utilizing a component-based architecture with the following key design decisions:

- **UI Framework**: Implements shadcn/ui components with Radix UI primitives for accessibility and consistent design
- **Styling**: Uses Tailwind CSS with a custom design system featuring CSS variables for theming
- **State Management**: Leverages TanStack Query (React Query) for server state management and data fetching
- **Routing**: Implements client-side routing with Wouter for lightweight navigation
- **Form Handling**: Uses React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds
- **Pages**: 20+ fully functional pages covering booking, management, and support flows
- **Components**: Reusable UI components with consistent styling and behavior

The frontend follows a pages-and-components pattern with reusable UI components and feature-specific components for all user journeys.

### Page Structure
**Public Pages** (accessible to all users):
- `/` - Home/Landing page with hero section
- `/find` - Provider discovery and search
- `/book/:providerId` - Booking form
- `/reviews/:providerId` - Review display
- `/confirmation/:appointmentId` - Booking confirmation
- `/about` - About BookingPro
- `/help` - Help & FAQ
- `/contact` - Contact form
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/404` - Not Found page

**Protected Pages** (authenticated users only):
- `/dashboard` - Professional analytics dashboard
- `/my-bookings` - Client appointment history
- `/settings` - Provider profile management
- `/notifications` - Alert center
- `/messages` - In-app messaging
- `/calendar` - Calendar view with events
- `/new-appointment` - Create new appointment
- `/memos` - Memo management
- `/tasks` - Task tracking

### Backend Architecture
The server-side application uses Node.js with Express.js in a RESTful API design:

- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints following resource-based URL patterns
- **Data Layer**: Abstracted storage interface allowing for different implementations (currently MemStorage for development)
- **Validation**: Zod schemas shared between frontend and backend for consistent validation
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Session Management**: In-memory session storage for development

The backend implements a clean architecture with separation of concerns between routing, business logic, and data access.

### Database Design
The application uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **ORM**: Drizzle ORM provides type-safe queries and schema management
- **Schema**: Normalized relational design with tables for providers, services, appointments, reviews, and more
- **Migrations**: Drizzle Kit handles schema migrations and database deployment
- **Connection**: Uses Neon Database serverless PostgreSQL for cloud deployment

Key entities include providers (service professionals), services (offered treatments), appointments (bookings), reviews (client feedback), and personal records (memos/tasks).

### Authentication & Authorization
The application implements Replit Auth for secure user management:

- **Replit Auth Integration**: Uses OpenID Connect with Replit as the authentication provider
- **Session Management**: Uses in-memory storage for session management in development
- **User Management**: Each user gets personalized access to their appointments, memos, and tasks
- **Security**: Implements CORS, secure session cookies, and proper authentication middleware
- **Landing Page**: Unauthenticated users see a landing page with sign-in prompt
- **Dashboard Access**: Authenticated users get full access to the professional assistant platform

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm** & **drizzle-kit**: Type-safe ORM and migration tools
- **@tanstack/react-query**: Server state management and data fetching
- **react-hook-form** & **@hookform/resolvers**: Form handling with validation
- **zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities

### UI Dependencies
- **@radix-ui/***: Accessible, unstyled UI primitives for complex components
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Type-safe component variants
- **lucide-react**: Consistent icon library
- **wouter**: Lightweight client-side routing

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js development
- **@replit/vite-plugin-***: Replit-specific development plugins

## Features Completed

✅ **Appointment Booking** - Complete booking flow from discovery to confirmation
✅ **Provider Management** - Profile settings, availability, services
✅ **Analytics Dashboard** - Bookings, revenue, ratings tracking
✅ **Personal Organization** - Memos and task management
✅ **Client Management** - My bookings, appointment history
✅ **Review System** - Client reviews and ratings
✅ **Notifications** - Alert center for appointments and messages
✅ **Messaging** - In-app communication system
✅ **Calendar** - Visual schedule with event tracking
✅ **Help & Support** - Comprehensive FAQ and support pages
✅ **Responsive Design** - Mobile-first, fully responsive across devices
✅ **PWA Ready** - Installable on mobile and desktop
✅ **Authentication** - Replit Auth integration with secure sessions
✅ **SEO Optimized** - Meta tags and proper page structure
✅ **Error Handling** - 404 pages and error boundaries

## Build & Deployment

- **Build Command**: `npm run build`
- **Development**: `npm run dev` (starts on port 5000)
- **Production**: Deploy using Replit's built-in deployment
- **Current Status**: All 20+ pages successfully compile
- **Bundle Size**: Optimized with Vite code splitting

The application is designed to be cloud-native and can be easily deployed to platforms like Replit, Vercel, or similar Node.js hosting environments.
