'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Car,
  Upload,
  Mic,
  Camera,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Wrench,
  Shield,
  CreditCard,
  History,
  Menu,
  X,
  PlayCircle,
  TrendingUp,
  FileText,
  LogOut,
} from 'lucide-react';

type Screen =
  | 'home'
  | 'auth'
  | 'vehicle'
  | 'symptoms'
  | 'analyzing'
  | 'results'
  | 'pricing'
  | 'vehicle-history'
  | 'insurance';

interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
}

interface DiagnosisResult {
  primaryDiagnosis: string;
  differential: string[];
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  safeToDrive: boolean;
  immediateAction?: string;
  repairUrgency: string;
  repairSteps: Array<{
    step: number;
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
  }>;
  partsNeeded: Array<{
    name: string;
    oemPartNumber?: string;
    estimatedPrice: { min: number; max: number; currency: string };
  }>;
  estimatedCost: {
    parts: { min: number; max: number };
    labor: { min: number; max: number };
    total: { min: number; max: number };
    diyPossible: boolean;
  };
  safetyWarnings: string[];
  youtubeVideos: Array<{
    title: string;
    url: string;
    thumbnailUrl: string;
  }>;
}

export default function HandyMechanicApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Vehicle info
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');

  // Symptoms
  const [symptomText, setSymptomText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Results
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    }
  }, []);

  // Fetch user data
  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user');
    }
  };

  // Auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setScreen('home');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Authentication failed');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setScreen('home');
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFiles(Array.from(e.target.files));
    }
  };

  // Submit diagnosis
  const handleSubmitDiagnosis = async () => {
    if (!token || !user) {
      setScreen('auth');
      return;
    }

    if (user.credits < 1) {
      setScreen('pricing');
      return;
    }

    setAnalyzing(true);
    setScreen('analyzing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('vehicleYear', vehicleYear);
      formData.append('vehicleMake', vehicleMake);
      formData.append('vehicleModel', vehicleModel);
      formData.append('symptomText', symptomText);

      if (vin) formData.append('vin', vin);
      if (mileage) formData.append('mileage', mileage);
      if (audioFile) formData.append('audioFile', audioFile);

      photoFiles.forEach((file, idx) => {
        formData.append(`photoFile${idx}`, file);
      });

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.diagnosis) {
        setDiagnosis(data.diagnosis);
        setUser((prev) => prev ? { ...prev, credits: data.creditsRemaining } : null);
        setScreen('results');
      } else {
        setError(data.error || 'Diagnosis failed');
        setScreen('symptoms');
      }
    } catch (err) {
      setError('Diagnosis failed');
      setScreen('symptoms');
    } finally {
      setAnalyzing(false);
    }
  };

  // Render header
  const renderHeader = () => (
    <header className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Car className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">Handy Mechanic AI</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <button onClick={() => setScreen('home')} className="text-sm text-muted-foreground hover:text-foreground">
                  Home
                </button>
                <button onClick={() => setScreen('vehicle-history')} className="text-sm text-muted-foreground hover:text-foreground">
                  Vehicle History
                </button>
                <button onClick={() => setScreen('insurance')} className="text-sm text-muted-foreground hover:text-foreground">
                  Insurance
                </button>
                <button onClick={() => setScreen('pricing')} className="text-sm text-muted-foreground hover:text-foreground">
                  Buy Credits
                </button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <CreditCard className="w-4 h-4" />
                  {user.credits} Credits
                </div>
                <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setScreen('auth')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Sign In
              </button>
            )}
          </nav>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  );

  // Render screens
  const renderHome = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-balance">
            AI-Powered Car Diagnostics in Minutes
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-pretty">
            Describe your car problem, upload audio of the noise, and get instant AI-powered diagnosis
            with repair instructions and cost estimates.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => {
                if (!user) {
                  setScreen('auth');
                } else {
                  setScreen('vehicle');
                }
              }}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90 inline-flex items-center gap-2"
            >
              Start Diagnosis
              <Car className="w-5 h-5" />
            </button>
            <button
              onClick={() => setScreen('pricing')}
              className="px-8 py-4 bg-secondary text-secondary-foreground rounded-lg text-lg font-semibold hover:bg-secondary/80"
            >
              View Pricing
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Audio Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Record the sound your car makes and our AI identifies the issue
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Diagnosis</h3>
              <p className="text-sm text-muted-foreground">
                Get detailed repair steps, parts list, and cost estimates
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Safety First</h3>
              <p className="text-sm text-muted-foreground">
                Immediate alerts for critical safety issues
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  const renderAuth = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  const renderVehicle = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Vehicle Information</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <input
                    type="number"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2020"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Make</label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Toyota"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Camry"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">VIN (Optional)</label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="1HGBH41JXMN109186"
                  maxLength={17}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mileage (Optional)</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="75000"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>

              <button
                onClick={() => {
                  if (vehicleYear && vehicleMake && vehicleModel) {
                    setScreen('symptoms');
                  }
                }}
                disabled={!vehicleYear || !vehicleMake || !vehicleModel}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  const renderSymptoms = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 px-4 py-16">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-2">Describe the Problem</h2>
            <p className="text-muted-foreground mb-6">
              {vehicleYear} {vehicleMake} {vehicleModel}
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">What's happening with your vehicle?</label>
                <textarea
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="Describe the symptoms... e.g., 'High-pitched whine from engine bay that gets louder with RPM'"
                  rows={5}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">Record Audio (Optional)</label>
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 animate-pulse"
                    >
                      <Mic className="w-5 h-5" />
                      Stop Recording
                    </button>
                  )}
                  {audioFile && (
                    <span className="text-sm text-muted-foreground">Audio recorded</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">Upload Photos (Optional)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-md cursor-pointer hover:border-primary">
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload photos
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {photoFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {photoFiles.length} photo(s) selected
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmitDiagnosis}
                disabled={!symptomText || analyzing}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get Diagnosis (1 Credit)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Vehicle...</h2>
          <p className="text-muted-foreground">
            AI is processing symptoms, audio, and knowledge base
          </p>
        </div>
      </main>
    </div>
  );

  const renderResults = () => {
    if (!diagnosis) return null;

    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'critical':
          return 'text-destructive';
        case 'high':
          return 'text-warning';
        case 'medium':
          return 'text-yellow-500';
        default:
          return 'text-success';
      }
    };

    return (
      <div className="min-h-screen flex flex-col">
        {renderHeader()}
        <main className="flex-1 px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Safety Alert */}
            {!diagnosis.safeToDrive && (
              <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-destructive mb-2">
                      CRITICAL: DO NOT DRIVE
                    </h3>
                    <p className="text-destructive">{diagnosis.immediateAction}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis Summary */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Diagnosis</h2>
                  <p className="text-muted-foreground">
                    {vehicleYear} {vehicleMake} {vehicleModel}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getSeverityColor(diagnosis.severity)}`}>
                    {diagnosis.severity.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(diagnosis.confidence * 100)}% confidence
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-lg font-semibold mb-2">Primary Issue</h3>
                <p className="text-foreground mb-4">{diagnosis.primaryDiagnosis}</p>

                {diagnosis.differential.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                      Alternative Possibilities:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
                      {diagnosis.differential.map((alt, idx) => (
                        <li key={idx}>{alt}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {diagnosis.safetyWarnings.length > 0 && (
                <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-md">
                  <h4 className="font-semibold text-warning mb-2">Safety Warnings:</h4>
                  <ul className="space-y-1">
                    {diagnosis.safetyWarnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-warning">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Cost Estimate */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Estimate
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Parts</div>
                  <div className="text-lg font-semibold">
                    ${diagnosis.estimatedCost.parts.min} - ${diagnosis.estimatedCost.parts.max}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Labor</div>
                  <div className="text-lg font-semibold">
                    ${diagnosis.estimatedCost.labor.min} - ${diagnosis.estimatedCost.labor.max}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total</div>
                  <div className="text-lg font-semibold">
                    ${diagnosis.estimatedCost.total.min} - ${diagnosis.estimatedCost.total.max}
                  </div>
                </div>
              </div>
              {diagnosis.estimatedCost.diyPossible && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-md">
                  <p className="text-sm text-success">
                    DIY repair is possible and could save on labor costs
                  </p>
                </div>
              )}
            </div>

            {/* Repair Steps */}
            {diagnosis.repairSteps.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Repair Steps
                </h3>
                <div className="space-y-4">
                  {diagnosis.repairSteps.map((step) => (
                    <div key={step.step} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-primary">Step {step.step}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {step.difficulty}
                        </span>
                        <span className="text-xs text-muted-foreground">{step.estimatedTime}</span>
                      </div>
                      <h4 className="font-semibold mb-1">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts Needed */}
            {diagnosis.partsNeeded.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Parts Needed</h3>
                <div className="space-y-3">
                  {diagnosis.partsNeeded.map((part, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                      <div>
                        <div className="font-semibold">{part.name}</div>
                        {part.oemPartNumber && (
                          <div className="text-xs text-muted-foreground font-mono">
                            OEM #{part.oemPartNumber}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${part.estimatedPrice.min} - ${part.estimatedPrice.max}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Videos */}
            {diagnosis.youtubeVideos.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Repair Videos
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {diagnosis.youtubeVideos.slice(0, 4).map((video, idx) => (
                    <a
                      key={idx}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 p-3 rounded-md border border-border hover:border-primary transition-colors"
                    >
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-24 h-18 object-cover rounded flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setScreen('vehicle');
                  setDiagnosis(null);
                  setSymptomText('');
                  setAudioFile(null);
                  setPhotoFiles([]);
                }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90"
              >
                New Diagnosis
              </button>
              <button
                onClick={() => setScreen('insurance')}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md font-semibold hover:bg-secondary/80"
              >
                Get Insurance Quotes
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  };

  const renderPricing = () => (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      <main className="flex-1 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Pay per diagnosis. No subscriptions. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">Single Diagnosis</h3>
              <div className="text-3xl font-bold mb-4">
                $4.99
                <span className="text-base font-normal text-muted-foreground">/diagnosis</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  AI-powered diagnosis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Audio analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Repair instructions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Cost estimates
                </li>
              </ul>
              <button
                onClick={() => {
                  if (!user) {
                    setScreen('auth');
                  } else {
                    // Implement Stripe checkout
                    alert('Stripe checkout not yet implemented in demo');
                  }
                }}
                className="w-full py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary hover:text-primary-foreground"
              >
                Buy Now
              </button>
            </div>

            <div className="bg-card border-2 border-primary rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                BEST VALUE
              </div>
              <h3 className="text-lg font-bold mb-2">3-Pack</h3>
              <div className="text-3xl font-bold mb-4">
                $9.99
                <span className="text-base font-normal text-muted-foreground">/3 diagnoses</span>
              </div>
              <div className="text-sm text-success mb-4">Save $5</div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Everything in Single
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  3 diagnoses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  $3.33 per diagnosis
                </li>
              </ul>
              <button
                onClick={() => {
                  if (!user) {
                    setScreen('auth');
                  } else {
                    alert('Stripe checkout not yet implemented in demo');
                  }
                }}
                className="w-full py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90"
              >
                Buy Now
              </button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">10-Pack</h3>
              <div className="text-3xl font-bold mb-4">
                $29.99
                <span className="text-base font-normal text-muted-foreground">/10 diagnoses</span>
              </div>
              <div className="text-sm text-success mb-4">Save $20</div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Everything in Single
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  10 diagnoses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  $3.00 per diagnosis
                </li>
              </ul>
              <button
                onClick={() => {
                  if (!user) {
                    setScreen('auth');
                  } else {
                    alert('Stripe checkout not yet implemented in demo');
                  }
                }}
                className="w-full py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary hover:text-primary-foreground"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // Render current screen
  switch (screen) {
    case 'home':
      return renderHome();
    case 'auth':
      return renderAuth();
    case 'vehicle':
      return renderVehicle();
    case 'symptoms':
      return renderSymptoms();
    case 'analyzing':
      return renderAnalyzing();
    case 'results':
      return renderResults();
    case 'pricing':
      return renderPricing();
    default:
      return renderHome();
  }
}
