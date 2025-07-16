# Frontend Development Plan for On-Demand Service Platform

## Introduction
This plan outlines the development of the frontend for an on-demand service platform, combining features of Urban Company (home services across six categories) and Ola/Rapido (transportation services). As the frontend developer (Team Member 1), you are responsible for building:

- Customer App (mobile with React Native and web with React)
- Worker App (mobile, React Native)
- Driver App (mobile, React Native)
- Admin Panel (web, React)
- Super Admin Panel (web, React)

The backend is handled by Team Member 2.

## Table of Contents
1. [Project Requirements](#project-requirements)
2. [Project Structure](#project-structure)
3. [Development Plan](#development-plan)
4. [Getting Started](#getting-started)
5. [Tools and Libraries](#tools-and-libraries)
6. [Collaboration](#collaboration)
7. [Deployment Strategy](#deployment-strategy)
8. [Sample Code Snippets](#sample-code-snippets)

## Project Requirements
Based on the project specifications, the platform supports:

### Customer App (Mobile and Web)
- Accessible at urbango.ca
- Defaults to a public customer view with a login prompt
- Features:
  - Service/trip browsing
  - Booking
  - Payment integration
  - Real-time tracking
  - Ratings
  - Notifications

### Worker App (Mobile)
- For service providers
- Features:
  - Profile creation
  - Service listing
  - Availability management
  - Job acceptance/rejection
  - In-app chat
  - Earnings dashboard

### Driver App (Mobile)
- For drivers
- Features:
  - Trip assignments
  - Live location tracking
  - Navigation
  - Booking history
  - Earnings summaries

### Admin Panel (Web)
- Accessible at admin.urbango.ca
- Features:
  - KPI dashboard
  - User management
  - Category/pricing management
  - Query/complaint handling

### Super Admin Panel (Web)
- Accessible at superadmin.urbango.ca
- Features:
  - Platform-wide control
  - Admin management
  - System configuration
  - Audit logs
  - Report exports

The platform must be scalable, secure, and intuitive, integrating with backend services for:
- Authentication (JWT/OAuth 2.0)
- Payments (Razorpay/Stripe)
- Notifications (Firebase Cloud Messaging)
- Location services (Google Maps API)

## Project Structure
Inspired by the provided Angular-style structure, the following folder organization ensures modularity and role-based separation:

### Root Directory
- `package.json`: Project dependencies and scripts
- `.gitignore`: Files to exclude from version control
- Configuration files (e.g., `.eslintrc`, `tsconfig.json` if using TypeScript)

### src Directory (Common for All Projects)
```
app/
  core/         # Shared services, global state management, utilities
  shared/       # Reusable components, hooks, and styles
  layouts/      # Role-specific layouts
    CustomerLayout.js
    WorkerLayout.js
    DriverLayout.js
    AdminLayout.js
    SuperAdminLayout.js
  
  features/     # Role-specific components and pages
    customer/   # Components for browsing, booking, payment, tracking
    worker/     # Components for profile, service listing, job management
    driver/     # Components for trip assignment, tracking, earnings
    admin/      # Components for user management, analytics, disputes
    superadmin/ # Components for admin management, audit logs, reports
  
  auth/         # Authentication components
  App.js        # Main entry point with routing

assets/         # Static resources (images, fonts, maps data)
environments/   # Environment-specific configurations
```

## Project-Specific Notes

### Customer App (Mobile and Web)
Shares components for consistency (e.g., ServiceBrowser.js). The web version defaults to a public view at urbango.ca, prompting login.

### Worker/Driver Apps (Mobile)
Mobile-only, with role-specific layouts and features.

### Admin/Super Admin Panels (Web)
Deployed on subdomains, with role-specific authentication and navigation.

## Development Plan
### Task Division

| Team Member | Role | Assigned Tasks | Technology |
| --- | --- | --- | --- |
| Team Member 1 (You) | Frontend | Customer App (Mobile/Web), Worker App, Driver App, Admin Panel, Super Admin Panel | React Native, React |
| Team Member 2 | Backend | APIs for authentication, services, trips, payments, notifications, tracking | Node.js/Java, PostgreSQL/MongoDB |

### Timeline and Tasks
Assuming a 12-week internship period, the following timeline prioritizes the Admin, Super Admin, Worker, and Driver interfaces as requested:

#### Week 1-2: Project Setup and Core Components

- Frontend (You):
  - Initialize projects:
    - React Native: `npx react-native init WorkerApp`, `npx react-native init DriverApp`.
    - React: `npx create-react-app admin-panel`, `npx create-react-app super-admin-panel`.
  - Set up folder structure as outlined.
  - Implement layouts/ (e.g., AdminLayout.js, WorkerLayout.js) with navigation (React Navigation for mobile, React Router for web).
  - Develop auth/ components for role-specific logins (e.g., AdminLogin.js, WorkerLogin.js).

- Backend (Team Member 2):
  - Set up backend environment (Node.js/Express or Java/Spring Boot, PostgreSQL/MongoDB).
  - Develop authentication APIs for Admin, Super Admin, Worker, and Driver roles.

#### Week 3-4: Core Feature Development

- Frontend (You):
  - Admin Panel: Build KPI dashboard (features/admin/Dashboard.js), user management (UserManagement.js).
  - Super Admin Panel: Implement admin management (features/superadmin/AdminManagement.js).
  - Worker App: Develop profile creation (features/worker/Profile.js), service listing (ServiceList.js).
  - Driver App: Create trip assignment UI (features/driver/TripAssignment.js).

- Backend (Team Member 2):
  - APIs for user management, service listings, and trip assignments.

#### Week 5-6: Advanced Features

- Frontend (You):
  - Admin Panel: Category management (CategoryManagement.js), query handling (QueryHandler.js).
  - Super Admin Panel: System configuration (SystemConfig.js), audit logs (AuditLogs.js).
  - Worker App: Availability toggle, job management (JobManagement.js), in-app chat.
  - Driver App: Live tracking (LiveTracking.js), earnings summary (Earnings.js).

- Backend (Team Member 2):
  - APIs for payments, notifications, and location tracking.

#### Week 7-8: Testing and Integration

- Frontend (You): Test UI with backend APIs, fix bugs, ensure role-based access control.
- Backend (Team Member 2): Stabilize APIs, handle errors.

#### Week 9-10: Finalization

- Frontend (You): Conduct user acceptance testing, prepare for deployment.
- Backend (Team Member 2): Finalize and deploy APIs.

#### Week 11-12: Deployment

- Frontend (You):
  - Deploy web panels to subdomains (admin.urbango.ca, superadmin.urbango.ca) using AWS/Vercel.
  - Prepare mobile apps for Google Play Store and Apple App Store submission.

- Backend (Team Member 2): Deploy backend services.

## Getting Started
### Admin Panel (React)

- Setup:
  - Run `npx create-react-app admin-panel`.
  - Install dependencies: `npm install react-router-dom tailwindcss axios`.
  - Initialize Tailwind CSS: `npx tailwindcss init`.
  - Set up folder structure as outlined.

- Authentication:
  - Create auth/AdminLogin.js for admin-specific login, integrating with backend JWT/OAuth API.
  - Redirect to login if not authenticated.

- UI and Features:
  - Build layouts/AdminLayout.js with a sidebar for navigation to dashboard, user management, categories, and queries.
  - Implement features/admin/Dashboard.js with KPIs using Chart.js (chartjs.org).
  - Develop UserManagement.js, CategoryManagement.js, and QueryHandler.js.

- Deployment:
  - Build: `npm run build`.
  - Deploy to admin.urbango.ca using Vercel or AWS.

### Super Admin Panel (React)

- Setup:
  - Run `npx create-react-app super-admin-panel`.
  - Install dependencies as above.
  - Set up folder structure.

- Authentication:
  - Create auth/SuperAdminLogin.js for super admin login.

- UI and Features:
  - Build layouts/SuperAdminLayout.js with navigation for admin management, settings, and logs.
  - Implement features/superadmin/AdminManagement.js, SystemConfig.js, AuditLogs.js, ReportExport.js.

- Deployment:
  - Deploy to superadmin.urbango.ca.

### Worker App (React Native)

- Setup:
  - Run `npx react-native init WorkerApp`.
  - Install dependencies: `npm install @react-navigation/native @react-navigation/stack native-base axios`.
  - Set up folder structure.

- Authentication:
  - Create auth/WorkerLogin.js for worker-specific login.

- UI and Features:
  - Build layouts/WorkerLayout.js with navigation for profile, services, jobs, and earnings.
  - Implement features/worker/Profile.js, ServiceList.js, Availability.js, JobManagement.js, Chat.js, Earnings.js.

- Testing:
  - Test on Android/iOS emulators using Android Studio/Xcode.

### Driver App (React Native)

- Setup:
  - Run `npx react-native init DriverApp`.
  - Install dependencies as above.
  - Set up folder structure.

- Authentication:
  - Create auth/DriverLogin.js for driver-specific login.

- UI and Features:
  - Build layouts/DriverLayout.js with navigation for trips, tracking, and earnings.
  - Implement features/driver/TripAssignment.js, LiveTracking.js (using Google Maps API), BookingHistory.js, Earnings.js.

- Testing:
  - Test on emulators/devices.

## Tools and Libraries

- React Native: React Navigation (reactnavigation.org), NativeBase (nativebase.io), Axios (axios-http.com).
- React: React Router (reactrouter.com), Tailwind CSS (tailwindcss.com), Chart.js (chartjs.org).
- Version Control: Git (e.g., GitHub).
- API Testing: Postman (postman.com).

## Collaboration

- Weekly Sync-Ups: Coordinate with Team Member 2 to align on API availability and specifications.
- API Integration: Use core/api.js to call backend endpoints, ensuring role-based data access.
- Version Control: Use Git for code management, with separate repositories for each project.

## Deployment Strategy

- Web Panels: Deploy to subdomains using Vercel or AWS, configuring DNS for admin.urbango.ca and superadmin.urbango.ca.
- Mobile Apps: Follow Google Play Store (developer.android.com) and Apple App Store (developer.apple.com) guidelines for submission.
- Testing: Use Jest (jestjs.io) for unit testing, React Testing Library for components, and manual testing for user flows.

## Sample Code Snippets
Below are example snippets to illustrate the structure and implementation:

### Admin Panel: Authentication and Layout
```javascript
// src/app/auth/AdminLogin.js
import React, { useState } from 'react';
import axios from 'axios';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleLogin = async () => {
    try {
      const response = await axios.post('https://api.urbango.ca/admin/login', credentials);
      localStorage.setItem('token', response.data.token);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="p-6 bg-white shadow-md rounded">
        <h2 className="text-2xl mb-4">Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="mb-4 p-2 border rounded w-full"
          onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          className="mb-4 p-2 border rounded w-full"
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        />
        <button onClick={handleLogin} className="bg-blue-500 text-white p-2 rounded w-full">
          Login
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;

// src/app/layouts/AdminLayout.js
import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex">
      <div className="w-64 bg-gray-800 text-white h-screen p-4">
        <h2 className="text-xl mb-4">Admin Panel</h2>
        <nav>
          <Link to="/dashboard" className="block py-2 px-4 hover:bg-gray-700">Dashboard</Link>
          <Link to="/users" className="block py-2 px-4 hover:bg-gray-700">User Management</Link>
          <Link to="/categories" className="block py-2 px-4 hover:bg-gray-700">Categories</Link>
          <Link to="/queries" className="block py-2 px-4 hover:bg-gray-700">Queries</Link>
        </nav>
      </div>
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
```

### Worker App: Profile Creation
```javascript
// src/app/features/worker/Profile.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import axios from 'axios';

const Profile = () => {
  const [profile, setProfile] = useState({ name: '', skills: '', documents: '' });

  const handleSave = async () => {
    try {
      await axios.post('https://api.urbango.ca/worker/profile', profile);
      alert('Profile saved successfully');
    } catch (error) {
      console.error('Profile save failed:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>Create Profile</Text>
      <TextInput
        placeholder="Name"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        onChangeText={(text) => setProfile({ ...profile, name: text })}
      />
      <TextInput
        placeholder="Skills"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        onChangeText={(text) => setProfile({ ...profile, skills: text })}
      />
      <TextInput
        placeholder="Documents"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        onChangeText={(text) => setProfile({ ...profile, documents: text })}
      />
      <Button title="Save Profile" onPress={handleSave} />
    </View>
  );
};

export default Profile;
```

## Conclusion
This plan provides a structured approach to developing the frontend for the Admin, Super Admin, Worker, and Driver interfaces, with role-specific logins and subdomain-based access for web panels. By leveraging the Angular-inspired structure, using React and React Native, and coordinating with the backend developer, you can deliver a scalable and user-friendly platform. Start with project setup and authentication, then build role-specific features, ensuring seamless API integration and thorough testing before deployment.