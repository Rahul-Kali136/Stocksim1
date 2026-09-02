import { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, Calendar, LogOut, KeyRound, BadgeCheck, Terminal, Fingerprint, Lock, Eye, EyeOff, Copy, CheckCircle, Database, Settings, ShieldAlert, Cpu, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui';
import { apiFetch } from '@/lib/api';

export default function ProfilePage() {
  const { user, session, signOut } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'developer'>('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('user_avatar') || null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
        
        apiFetch(`api/profile/?email=${currentEmail}`, {
          method: 'PUT',
          body: JSON.stringify({ avatar: base64 }),
        }).then(() => {
          setAvatar(base64);
          localStorage.setItem('user_avatar', base64);
          success('Profile picture updated successfully.');
        }).catch((err) => {
          console.error("Failed to upload avatar", err);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return;
    }
    if (newPassword !== confirmPassword) {
      return;
    }
    const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
    apiFetch('api/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        email: currentEmail,
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
      .then(() => {
        success('Password updated in database successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(localStorage.getItem('user_first_name') || '');
  const [lastName, setLastName] = useState(localStorage.getItem('user_last_name') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('user_email') || user?.email || '—');
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('user_phone_number') || '');
  const [username, setUsername] = useState(localStorage.getItem('user_username') || '');

  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
    apiFetch<any>(`api/profile/?email=${currentEmail}`)
      .then((data) => {
        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setUserEmail(data.email || '');
          setPhoneNumber(data.phone_number || '');
          setUsername(data.username || '');
          
          if (data.avatar) {
            setAvatar(data.avatar);
            localStorage.setItem('user_avatar', data.avatar);
          }

          localStorage.setItem('user_first_name', data.first_name || '');
          localStorage.setItem('user_last_name', data.last_name || '');
          localStorage.setItem('user_display_name', `${data.first_name} ${data.last_name}`);
          localStorage.setItem('user_email', data.email || '');
          localStorage.setItem('user_phone_number', data.phone_number || '');
          localStorage.setItem('user_username', data.username || '');
        }
      });
  }, [user]);

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  const handleSendOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      return;
    }
    apiFetch('api/profile/send-otp/', {
      method: 'POST',
      body: JSON.stringify({ email: newEmail }),
    })
      .then(() => {
        setOtpSent(true);
        setOtpTimer(60);
        success(`Verification OTP sent to ${newEmail}`);
      })
      .catch((err: any) => {
        console.error(err);
      });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      return;
    }
    const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
    apiFetch(`api/profile/?email=${currentEmail}`, {
      method: 'PUT',
      body: JSON.stringify({
        email: newEmail,
        username: newEmail,
        otp: otpCode,
      }),
    }).then(() => {
      localStorage.setItem('user_email', newEmail);
      setUserEmail(newEmail);
      success(`Email updated to ${newEmail} in database successfully!`);
      setOtpSent(false);
      setNewEmail('');
      setOtpCode('');
    }).catch((err: any) => {
      console.error(err);
    });
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
    apiFetch(`api/profile/?email=${currentEmail}`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        username: username,
      }),
    }).then(() => {
      localStorage.setItem('user_first_name', firstName);
      localStorage.setItem('user_last_name', lastName);
      localStorage.setItem('user_phone_number', phoneNumber);
      localStorage.setItem('user_username', username);
      const fullName = `${firstName} ${lastName}`;
      localStorage.setItem('user_display_name', fullName);
      setIsEditing(false);
      success('Profile updated in database successfully.');
    });
  };

  const handleSignOut = async () => {
    await signOut();
    success('Signed out successfully.');
    navigate('/');
  };

  const userName = localStorage.getItem('user_display_name') || (firstName && lastName ? `${firstName} ${lastName}` : null) || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const lastSignIn = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : '—';
  const provider = user?.app_metadata?.provider ?? 'email';
  const userId = user?.id ?? '—';
  
  const mockApiKey = import.meta.env.VITE_API_KEY || "indus_demo_api_key_84Nb90XpKzW";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setCopied(true);
    success('API Key copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageHeader 
        title="Account Center" 
        subtitle="Manage user credentials, security standards, and API integrations" 
        icon={<User className="w-5 h-5 text-slate-800" />} 
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Glassmorphic Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300">
            {/* Header Gradient */}
            <div className="h-28 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 relative">
              <span className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">
                Active
              </span>
            </div>
            
            {/* Profile Avatar Frame */}
            <div className="px-6 pb-6 relative">
              <div className="flex justify-center -mt-10 mb-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.email?.[0]?.toUpperCase() ?? 'U'
                    )}
                  </div>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute -bottom-1 -right-1 bg-white hover:bg-slate-50 text-slate-700 w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center shadow-md cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-650" />
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
              
              {/* User Meta */}
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-850 flex items-center justify-center gap-1.5">
                  {userName}
                  <BadgeCheck className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                </h2>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <span className="text-[9px] font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-sky-100/50">
                  Administrator
                </span>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-emerald-100/50">
                  {provider} Auth
                </span>
              </div>

              {/* Status List */}
              <div className="border-t border-slate-50 mt-6 pt-5 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Access Group</span>
                  <span className="font-bold text-slate-700">Root Admin</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Active Plan</span>
                  <Link to="/dashboard/plans" className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-250 hover:bg-indigo-100 transition-colors">
                    Medium Plan
                  </Link>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Engine Status</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button 
                onClick={handleSignOut} 
                className="mt-6 w-full flex items-center justify-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs"
              >
                <LogOut className="w-4 h-4" /> Sign Out Account
              </button>

            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Settings Interface */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            
            {/* Dynamic Tabs */}
            <div className="flex flex-wrap border-b border-slate-100 gap-6 mb-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                <User className="w-4 h-4" /> Credentials
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'security' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                <ShieldCheck className="w-4 h-4" /> Security
              </button>
              <button 
                onClick={() => setActiveTab('developer')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${activeTab === 'developer' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                <Cpu className="w-4 h-4" /> Integrations
              </button>
            </div>

            {/* Tab Contents */}
            <div>
              
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Account Overview</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Primary identifier variables associated with your profile</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditing(!isEditing);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Pencil className="w-3 h-3" /> {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                  </div>
                  
                  {isEditing ? (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">First Name</label>
                          <input 
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="input w-full"
                            placeholder="John"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Last Name</label>
                          <input 
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="input w-full"
                            placeholder="Doe"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Username</label>
                          <input 
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input w-full"
                            placeholder="Username"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Phone Number</label>
                          <input 
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="input w-full"
                            placeholder="10-digit number"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                      >
                        Save Changes
                      </button>
                    </form>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <DetailBlock icon={<Mail className="w-4.5 h-4.5 text-sky-600" />} label="Email Address" value={userEmail} />
                      <DetailBlock icon={<User className="w-4.5 h-4.5 text-sky-600" />} label="Username" value={username} />
                      <DetailBlock icon={<User className="w-4.5 h-4.5 text-sky-600" />} label="First Name" value={firstName} />
                      <DetailBlock icon={<User className="w-4.5 h-4.5 text-sky-600" />} label="Last Name" value={lastName} />
                      <DetailBlock icon={<Pencil className="w-4.5 h-4.5 text-sky-600" />} label="Phone Number" value={phoneNumber || '—'} />
                    </div>
                  )}

                  {/* Secure Email Change via OTP */}
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Update Email Address (Secure OTP)</h4>
                    <p className="text-xs text-slate-400 mb-4">Verification code will be generated to validate your new address</p>
                    
                    <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-md">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input 
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="input w-full"
                            placeholder="new-email@example.com"
                            disabled={otpSent}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpSent && otpTimer > 0}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl text-xs transition-colors shadow-xs shrink-0"
                        >
                          {otpSent ? `Resend (${otpTimer}s)` : 'Send OTP'}
                        </button>
                      </div>

                      {otpSent && (
                        <div className="space-y-3 animate-fadeIn">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">6-Digit Verification OTP Code</label>
                            <input 
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              className="input w-full font-mono text-center tracking-widest text-lg"
                              placeholder="000000"
                              required
                            />
                          </div>
                          <button 
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                          >
                            Verify & Update Email
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* Tab 2: Security */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Active Session Security</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Cryptographic signature states validating this browser session</p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DetailBlock icon={<Lock className="w-4.5 h-4.5 text-emerald-600" />} label="Auth Protocol" value="Secure JWT Session" />
                    <DetailBlock icon={<KeyRound className="w-4.5 h-4.5 text-emerald-600" />} label="Sign-In Method" value={provider === 'email' ? 'Email & Password Store' : provider} />
                    <DetailBlock icon={<Terminal className="w-4.5 h-4.5 text-emerald-600" />} label="Last Activity Timestamp" value={lastSignIn} />
                    <DetailBlock icon={<ShieldAlert className="w-4.5 h-4.5 text-emerald-600" />} label="Access Permissions" value="Root Administrator" />
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-800 text-sm mb-4">Change Account Password</h4>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Current Password</label>
                          <input 
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                        <div className="relative">
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">New Password</label>
                          <input 
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
                          >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Confirm New Password</label>
                          <input 
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input w-full pr-10"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-7 text-slate-400 hover:text-slate-650"
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                          </button>
                        </div>
                        <div className="flex items-end pb-[2px]">
                          <button 
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Update Password
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Tab 3: Developer */}
              {activeTab === 'developer' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Automated Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Use this token to feed simulated outputs directly into enterprise ERP ledgers</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
                      <div className="flex-1 overflow-hidden truncate">
                        <span className="text-slate-400 select-none mr-2 font-bold text-[10px] tracking-wider uppercase">API TOKEN:</span>
                        <span className="text-slate-800 font-bold select-all">
                          {showApiKey ? mockApiKey : "•".repeat(mockApiKey.length)}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-2.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors border border-slate-200/50 bg-white shadow-xs"
                          title={showApiKey ? "Hide Token" : "Show Token"}
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={handleCopyKey}
                          className="p-2.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors border border-slate-200/50 bg-white shadow-xs flex items-center gap-1.5"
                          title="Copy Token"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>API Server endpoint connected: <code>https://api.stocksimm.io/v1</code></span>
                      </div>
                      <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-mono">v1.2.0-stable</span>
                    </div>
                  </div>
                </div>
              )}


            </div>

          </div>
        </div>

      </div>
    </>
  );
}

function DetailBlock({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-start gap-3.5 hover:border-slate-200 hover:bg-white hover:shadow-xs transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 leading-none">{label}</div>
        <div className={`text-xs font-bold text-slate-700 truncate leading-relaxed ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
