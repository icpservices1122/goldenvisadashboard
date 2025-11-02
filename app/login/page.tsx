'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface AdminUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminPasswords, setShowAdminPasswords] = useState<{[key: string]: boolean}>({});
  const router = useRouter();

  // Check for existing valid token on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      const adminData = localStorage.getItem('adminUser');
      const tokenExpiry = localStorage.getItem('adminTokenExpiry');
      
      if (adminData && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = new Date().getTime();
        
        if (currentTime < expiryTime) {
          // Token is still valid, redirect to dashboard
          console.log('Valid session found, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // Token expired, clear storage
          console.log('Session expired, clearing storage');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminTokenExpiry');
        }
      }
    };

    checkExistingSession();
  }, [router]);

  // Fetch admin users from Firestore
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const adminQuery = query(collection(db, 'adminlogin'));
        const querySnapshot = await getDocs(adminQuery);
        
        const admins: AdminUser[] = [];
        querySnapshot.forEach((doc) => {
          admins.push({
            id: doc.id,
            ...doc.data()
          } as AdminUser);
        });
        
        setAdminUsers(admins);
        console.log('Loaded admin users:', admins);
        
        toast.success('Admin users loaded successfully', {
          position: "top-right",
          autoClose: 3000,
        });
      } catch (error) {
        console.error('Error fetching admin users:', error);
        setError('Failed to load admin configuration');
        toast.error('Failed to load admin users', {
          position: "top-right",
          autoClose: 5000,
        });
      } finally {
        setIsLoadingAdmins(false);
      }
    };

    fetchAdminUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      toast.warning('Please enter both email and password', {
        position: "top-right",
        autoClose: 4000,
      });
      setLoading(false);
      return;
    }

    try {
      // Check if credentials match any admin user
      const matchedAdmin = adminUsers.find(admin => 
        admin.email.toLowerCase() === email.toLowerCase() && 
        admin.password === password
      );

      if (matchedAdmin) {
        // Calculate expiry time (30 days from now)
        const expiryTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
        
        // Store admin session with token expiry
        const adminSession = {
          email: matchedAdmin.email,
          name: matchedAdmin.name,
          role: matchedAdmin.role,
          loggedIn: true,
          loginTime: new Date().getTime(),
          token: generateToken()
        };

        localStorage.setItem('adminUser', JSON.stringify(adminSession));
        localStorage.setItem('adminTokenExpiry', expiryTime.toString());
        
        console.log('Login successful for:', matchedAdmin.email);
        
        toast.success(`Welcome back, ${matchedAdmin.name}!`, {
          position: "top-right",
          autoClose: 3000,
        });
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError('Invalid email or password');
        toast.error('Invalid email or password', {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      toast.error('An error occurred during login', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);

    if (!selectedAdmin) {
      toast.error('No admin selected for password change', {
        position: "top-right",
        autoClose: 5000,
      });
      setChangingPassword(false);
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning('Please fill all password fields', {
        position: "top-right",
        autoClose: 4000,
      });
      setChangingPassword(false);
      return;
    }

    if (currentPassword !== selectedAdmin.password) {
      toast.error('Current password is incorrect', {
        position: "top-right",
        autoClose: 5000,
      });
      setChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match', {
        position: "top-right",
        autoClose: 5000,
      });
      setChangingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('Password should be at least 6 characters long', {
        position: "top-right",
        autoClose: 5000,
      });
      setChangingPassword(false);
      return;
    }

    try {
      const adminDocRef = doc(db, 'adminlogin', selectedAdmin.id);
      await updateDoc(adminDocRef, {
        password: newPassword
      });

      // Update local state
      setAdminUsers(prev => 
        prev.map(admin => 
          admin.id === selectedAdmin.id 
            ? { ...admin, password: newPassword }
            : admin
        )
      );

      toast.success('Password changed successfully!', {
        position: "top-right",
        autoClose: 4000,
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setSelectedAdmin(null);

    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password. Please try again.', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const openChangePassword = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowChangePassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const cancelChangePassword = () => {
    setShowChangePassword(false);
    setSelectedAdmin(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.info('Password change cancelled', {
      position: "top-right",
      autoClose: 3000,
    });
  };

  // Toggle password visibility for login form
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle password visibility for admin list
  const toggleAdminPasswordVisibility = (adminId: string) => {
    setShowAdminPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  // Toggle password visibility for change password form
  const toggleCurrentPasswordVisibility = () => {
    setShowCurrentPassword(!showCurrentPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Generate a simple token (you can enhance this for production)
  const generateToken = (): string => {
    return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  };

  // Auto-fill for testing (remove in production)
  const autoFill = (admin: AdminUser) => {
    setEmail(admin.email);
    setPassword(admin.password);
    toast.info(`Credentials filled for ${admin.name}`, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  // Copy password to clipboard
  const copyPassword = (password: string, adminName: string) => {
    navigator.clipboard.writeText(password).then(() => {
      toast.success(`Password for ${adminName} copied to clipboard!`, {
        position: "top-right",
        autoClose: 3000,
      });
    }).catch(() => {
      toast.error('Failed to copy password', {
        position: "top-right",
        autoClose: 3000,
      });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your administrator account
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Stay logged in for 30 days
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 rounded-lg sm:px-10">
            {!showChangePassword ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white text-gray-900"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white text-gray-900 pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4 border border-red-200">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          {error}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading || isLoadingAdmins}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </div>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>

                {/* Signup Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Want to change the password?{' '}
                    

                      <button
        onClick={() => openChangePassword(adminUsers[0])}
                          className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-700 px-2 py-1 rounded transition-colors"
                          title="Change password"
                        >
                          Change PW
                      </button>
                  </p>
                </div>
              </form>
            ) : (
              /* Change Password Form */
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Change Password
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    For {selectedAdmin?.name} ({selectedAdmin?.email})
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="block w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm pr-10"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={toggleCurrentPasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm pr-10"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={toggleNewPasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm pr-10"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={cancelChangePassword}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {changingPassword ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Changing...
                        </div>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin Users List (for testing - remove in production) */}
            {adminUsers.length > 0 && process.env.NODE_ENV === 'development' && !showChangePassword && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Admin Accounts:</h3>
                <div className="space-y-2">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        <div className="text-xs text-gray-500">{admin.email}</div>
                        <div className="text-xs text-gray-400">Role: {admin.role}</div>
                        <div className="mt-1">
                          <div className="text-xs font-medium text-gray-700">Password:</div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className={`text-xs font-mono ${showAdminPasswords[admin.id] ? 'text-green-600' : 'text-gray-500'}`}>
                              {showAdminPasswords[admin.id] ? admin.password : '••••••••'}
                            </code>
                            <div className="flex gap-1">
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => autoFill(admin)}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                          title="Fill credentials"
                        >
                          Fill
                        </button>
                        <button
                          onClick={() => openChangePassword(admin)}
                          className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-700 px-2 py-1 rounded transition-colors"
                          title="Change password"
                        >
                          Change PW
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Secure admin access • 30-day automatic login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}