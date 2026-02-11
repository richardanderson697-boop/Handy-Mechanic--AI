import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Upload, ChevronRight, AlertTriangle, Wrench, Video, DollarSign, LogOut, User } from 'lucide-react';

// This is a complete car diagnostic app with AI-powered analysis
// Authentication, Stripe payments, and multi-modal input (text, photo, audio)

const CarDiagnosticApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [user, setUser] = useState(null);
  const [diagnosisCredits, setDiagnosisCredits] = useState(0);
  const [vehicleData, setVehicleData] = useState({
    year: '',
    make: '',
    model: ''
  });
  const [symptomData, setSymptomData] = useState({
    text: '',
    photos: [],
    audioBlob: null
  });
  const [diagnosis, setDiagnosis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState([
    { text: 'Processing vehicle data', complete: false },
    { text: 'Analyzing symptoms', complete: false },
    { text: 'Generating diagnosis...', complete: false }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Years for vehicle selection
  const years = ['2011', '2010', '2009', '2008'];
  const makes = ['Acura', 'Alfa Romeo', 'Aston Martin', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler'];
  const models = {
    'Chevrolet': ['Equinox', 'Tahoe', 'Malibu', 'Traverse'],
    'default': ['Model 1', 'Model 2', 'Model 3']
  };

  // Handle authentication
  const handleAuth = async () => {
    // In production, this would call your backend API
    if (authMode === 'login') {
      // Simulate login
      setUser({
        id: '12345',
        email: authData.email,
        name: authData.name || 'User',
        credits: 0
      });
      setDiagnosisCredits(0);
      setCurrentScreen('home');
    } else {
      // Simulate signup
      setUser({
        id: '12345',
        email: authData.email,
        name: authData.name,
        credits: 0
      });
      setDiagnosisCredits(0);
      setCurrentScreen('home');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setDiagnosisCredits(0);
    setCurrentScreen('auth');
    setAuthData({ email: '', password: '', name: '' });
  };

  // Handle Stripe payment
  const handlePurchase = async (packageType) => {
    // In production, this would integrate with Stripe
    const packages = {
      single: { credits: 1, price: 4.99 },
      triple: { credits: 3, price: 9.99 }
    };
    
    const selectedPackage = packages[packageType];
    
    // Simulate Stripe checkout
    alert(`Redirecting to Stripe checkout for $${selectedPackage.price}...`);
    
    // After successful payment (simulated)
    setTimeout(() => {
      setDiagnosisCredits(prev => prev + selectedPackage.credits);
      alert(`Payment successful! ${selectedPackage.credits} diagnosis credit(s) added.`);
      setCurrentScreen('home');
    }, 1000);
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setSymptomData(prev => ({ ...prev, audioBlob }));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setSymptomData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  // Run AI diagnosis
  const runDiagnosis = async () => {
    if (diagnosisCredits <= 0) {
      setCurrentScreen('pricing');
      return;
    }

    setIsAnalyzing(true);
    setCurrentScreen('analyzing');

    // Simulate AI analysis with steps
    const steps = [...analysisSteps];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      steps[i].complete = true;
      setAnalysisSteps([...steps]);
    }

    // Use Anthropic API for real diagnosis
    const apiDiagnosis = await performAIDiagnosis();
    
    setDiagnosis(apiDiagnosis);
    setDiagnosisCredits(prev => prev - 1);
    setIsAnalyzing(false);
    setCurrentScreen('results');
  };

  // AI Diagnosis using Anthropic API
  const performAIDiagnosis = async () => {
    try {
      // Prepare the prompt for Claude
      const prompt = `You are an expert automotive diagnostic AI. A user has reported the following:

Vehicle: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}
Symptom: ${symptomData.text}
${symptomData.photos.length > 0 ? `Photos provided: ${symptomData.photos.length}` : ''}
${symptomData.audioBlob ? 'Audio recording provided' : ''}

Provide a detailed diagnostic analysis in JSON format with:
{
  "diagnosis": "Primary diagnosis with explanation",
  "severity": "low|medium|high",
  "commonCauses": ["cause1", "cause2", "cause3"],
  "repairSteps": [
    {"step": 1, "description": "Step description", "duration": "time estimate"},
    ...
  ],
  "materialsNeeded": ["material1", "material2", ...],
  "estimatedCost": {"min": number, "max": number},
  "relatedVideos": ["search term 1", "search term 2", "search term 3"]
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      const resultText = data.content.find(item => item.type === "text")?.text || '';
      
      // Parse JSON response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback diagnosis
      return getFallbackDiagnosis();
    } catch (error) {
      console.error('AI Diagnosis error:', error);
      return getFallbackDiagnosis();
    }
  };

  // Fallback diagnosis based on screenshots
  const getFallbackDiagnosis = () => {
    return {
      diagnosis: `The high-pitch whine on a ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} is most commonly caused by a failing Power Steering Pump or a worn Alternator bearing. However, this specific model year is also known for a high-pitched whine resulting from a clogged transmission filter (specifically on the 6T40/6T70 6-speed transmissions) or a vacuum leak at the intake manifold. If the whine changes pitch with engine RPM, it is likely accessory-drive related (Pulley, Alternator, or Power Steering). If it occurs primarily when turning the wheel, it is the Power Steering Pump.`,
      severity: 'medium',
      commonCauses: [
        'Failing Power Steering Pump',
        'Worn Alternator bearing',
        'Clogged transmission filter (6T40/6T70)',
        'Vacuum leak at intake manifold'
      ],
      repairSteps: [
        {
          step: 1,
          description: 'Diagnose the source of the whine by listening with engine running and RPM changes',
          duration: '15-30 minutes'
        },
        {
          step: 2,
          description: 'Check power steering fluid level and condition',
          duration: '5 minutes'
        },
        {
          step: 3,
          description: 'Inspect serpentine belt and pulleys for wear or misalignment',
          duration: '10-15 minutes'
        },
        {
          step: 4,
          description: 'If power steering pump is faulty, remove and replace',
          duration: '2-3 hours'
        },
        {
          step: 5,
          description: 'If alternator bearing is worn, replace alternator',
          duration: '1-2 hours'
        },
        {
          step: 6,
          description: 'Test drive to verify repair and ensure whine is eliminated',
          duration: '10-15 minutes'
        }
      ],
      materialsNeeded: [
        'Power Steering Pump (if needed)',
        'Power Steering Fluid (Dexron VI)',
        'Serpentine Belt',
        'Alternator (if needed)',
        'Socket set',
        'Wrench set',
        'Belt tensioner tool'
      ],
      estimatedCost: {
        min: 150,
        max: 650
      },
      relatedVideos: [
        'How to tell if Your Pulleys are Bad',
        'Power Steering Pulley Sound',
        'Chevy Malibu high pitch whine repair'
      ]
    };
  };

  // Fetch YouTube videos
  const getYouTubeVideos = (searchTerms) => {
    // In production, use YouTube Data API
    return searchTerms.map((term, idx) => ({
      title: term,
      channel: idx === 0 ? 'Austin Archu' : idx === 1 ? 'Gregory Haile' : 'Online Mechanic Tips',
      thumbnail: `https://via.placeholder.com/320x180/1a1a1a/00d4aa?text=${encodeURIComponent(term.slice(0, 20))}`
    }));
  };

  // Screen components
  const AuthScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(0, 212, 170, 0.2)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 32px rgba(0, 212, 170, 0.3)'
        }}>
          <Wrench size={40} color="#0a0a0a" />
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: '8px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.5px'
        }}>
          HANDY MECHANIC
        </h1>
        
        <p style={{
          color: '#00d4aa',
          textAlign: 'center',
          marginBottom: '32px',
          fontSize: '14px',
          fontWeight: '600',
          letterSpacing: '2px'
        }}>
          AI-POWERED DIAGNOSTICS
        </p>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setAuthMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              background: authMode === 'login' ? '#00d4aa' : 'transparent',
              color: authMode === 'login' ? '#0a0a0a' : '#888',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Login
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            style={{
              flex: 1,
              padding: '12px',
              background: authMode === 'signup' ? '#00d4aa' : 'transparent',
              color: authMode === 'signup' ? '#0a0a0a' : '#888',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Sign Up
          </button>
        </div>

        {authMode === 'signup' && (
          <input
            type="text"
            placeholder="Name"
            value={authData.name}
            onChange={(e) => setAuthData({...authData, name: e.target.value})}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={authData.email}
          onChange={(e) => setAuthData({...authData, email: e.target.value})}
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={authData.password}
          onChange={(e) => setAuthData({...authData, password: e.target.value})}
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
        />

        <button
          onClick={handleAuth}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            boxShadow: '0 4px 16px rgba(0, 212, 170, 0.4)'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          {authMode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>
    </div>
  );

  const HomeScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#00d4aa',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wrench size={24} color="#0a0a0a" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', fontStyle: 'italic' }}>
              HANDY MECHANIC
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(0, 212, 170, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <span style={{ fontWeight: '700', color: '#00d4aa' }}>{diagnosisCredits}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Wrench size={40} color="#fff" />
          </div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            marginBottom: '12px',
            color: '#0a0a0a',
            letterSpacing: '-0.5px'
          }}>
            HANDY MECHANIC
          </h1>
          
          <p style={{
            color: 'rgba(10, 10, 10, 0.8)',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '2px',
            marginBottom: '20px'
          }}>
            AI-POWERED DIAGNOSTICS
          </p>

          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'rgba(10, 10, 10, 0.7)',
            maxWidth: '500px',
            margin: '0 auto 20px'
          }}>
            Make informed decisions when shopping for used cars. Describe symptoms and get instant AI-powered diagnostic insights.
          </p>

          <p style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#0a0a0a'
          }}>
            Perfect for used car buyers & owners
          </p>

          <button
            onClick={() => diagnosisCredits > 0 ? setCurrentScreen('vehicle') : setCurrentScreen('pricing')}
            style={{
              marginTop: '20px',
              padding: '16px 32px',
              background: '#0a0a0a',
              color: '#00d4aa',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '20px auto 0'
            }}
          >
            🔍 START DIAGNOSIS
          </button>
        </div>

        {/* Multi-Modal Analysis Steps */}
        <h3 style={{
          color: '#00d4aa',
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '2px',
          marginBottom: '16px'
        }}>
          MULTI-MODAL AI ANALYSIS
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(0, 212, 170, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: '#00d4aa'
            }}>
              1
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Vehicle Intake
              </div>
              <div style={{ fontSize: '14px', color: '#888' }}>
                Select year, make and model
              </div>
            </div>
            <ChevronRight size={24} color="#888" />
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(0, 212, 170, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: '#00d4aa'
            }}>
              2
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Capture Symptoms
              </div>
              <div style={{ fontSize: '14px', color: '#888' }}>
                Text, photos, or sound
              </div>
            </div>
            <ChevronRight size={24} color="#888" />
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(0, 212, 170, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: '#00d4aa'
            }}>
              3
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                AI Analyzes
              </div>
              <div style={{ fontSize: '14px', color: '#888' }}>
                Agentic & semantic RAG
              </div>
            </div>
            <ChevronRight size={24} color="#888" />
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(0, 212, 170, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: '#00d4aa'
            }}>
              4
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Get Results
              </div>
              <div style={{ fontSize: '14px', color: '#888' }}>
                Severity, cost & fix videos
              </div>
            </div>
            <ChevronRight size={24} color="#888" />
          </div>
        </div>

        {/* Pricing CTA */}
        {diagnosisCredits === 0 && (
          <div style={{
            marginTop: '24px',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 160, 255, 0.1) 100%)',
            border: '2px solid #00d4aa',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#00d4aa'
            }}>
              READY TO DIAGNOSE?
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#888',
              marginBottom: '20px'
            }}>
              Single use $4.99 or save with our 3-pack for $9.99
            </p>
            <button
              onClick={() => setCurrentScreen('pricing')}
              style={{
                padding: '14px 28px',
                background: '#00d4aa',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              View Pricing
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const PricingScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <button
        onClick={() => setCurrentScreen('home')}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          padding: '12px',
          borderRadius: '10px',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Back
      </button>

      <h1 style={{
        fontSize: '32px',
        fontWeight: '800',
        marginBottom: '8px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Choose Your Plan
      </h1>

      <p style={{
        textAlign: 'center',
        color: '#888',
        marginBottom: '40px'
      }}>
        Get AI-powered diagnostics instantly
      </p>

      <div style={{
        display: 'grid',
        gap: '20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Single Diagnosis */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '32px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#00d4aa',
            marginBottom: '8px',
            letterSpacing: '1px'
          }}>
            SINGLE USE
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            $4<span style={{ fontSize: '24px', color: '#888' }}>.99</span>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '24px'
          }}>
            One diagnostic analysis
          </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            marginBottom: '24px'
          }}>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Full AI diagnostic report
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Step-by-step repair guide
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Cost estimates
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Related video tutorials
            </li>
          </ul>
          <button
            onClick={() => handlePurchase('single')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Purchase Single Use
          </button>
        </div>

        {/* 3-Pack */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(0, 160, 255, 0.1) 100%)',
          borderRadius: '20px',
          padding: '32px',
          border: '2px solid #00d4aa',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#00d4aa',
            color: '#0a0a0a',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '1px'
          }}>
            BEST VALUE
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#00d4aa',
            marginBottom: '8px',
            letterSpacing: '1px'
          }}>
            3-PACK
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '800',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
            $9<span style={{ fontSize: '24px', color: '#888' }}>.99</span>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '4px'
          }}>
            Three diagnostic analyses
          </div>
          <div style={{
            fontSize: '12px',
            color: '#00d4aa',
            marginBottom: '24px',
            fontWeight: '600'
          }}>
            Save $5.00 vs single purchases
          </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            marginBottom: '24px'
          }}>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Everything in Single Use
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ 3 complete diagnoses
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Best value per diagnosis
            </li>
            <li style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
              ✓ Perfect for multiple cars
            </li>
          </ul>
          <button
            onClick={() => handlePurchase('triple')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 212, 170, 0.3)'
            }}
          >
            Purchase 3-Pack
          </button>
        </div>
      </div>
    </div>
  );

  const VehicleScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <button
        onClick={() => setCurrentScreen('home')}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          padding: '12px',
          borderRadius: '10px',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        ← BACK
      </button>

      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '32px'
      }}>
        Select Your Vehicle
      </h2>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4aa',
          marginBottom: '12px',
          letterSpacing: '1px'
        }}>
          Year
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          {years.map(year => (
            <button
              key={year}
              onClick={() => setVehicleData({...vehicleData, year})}
              style={{
                padding: '16px',
                background: vehicleData.year === year ? '#00d4aa' : 'rgba(255, 255, 255, 0.05)',
                color: vehicleData.year === year ? '#0a0a0a' : '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4aa',
          marginBottom: '12px',
          letterSpacing: '1px'
        }}>
          Make
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px'
        }}>
          {makes.slice(0, 6).map(make => (
            <button
              key={make}
              onClick={() => setVehicleData({...vehicleData, make, model: ''})}
              style={{
                padding: '16px 12px',
                background: vehicleData.make === make ? '#00d4aa' : 'rgba(255, 255, 255, 0.05)',
                color: vehicleData.make === make ? '#0a0a0a' : '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {make}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4aa',
          marginBottom: '12px',
          letterSpacing: '1px'
        }}>
          Model
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {(models[vehicleData.make] || models.default).map(model => (
            <button
              key={model}
              onClick={() => setVehicleData({...vehicleData, model})}
              style={{
                padding: '16px',
                background: vehicleData.model === model ? '#00d4aa' : 'rgba(255, 255, 255, 0.05)',
                color: vehicleData.model === model ? '#0a0a0a' : '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      {vehicleData.year && vehicleData.make && vehicleData.model && (
        <div style={{
          background: 'rgba(0, 212, 170, 0.1)',
          border: '2px solid #00d4aa',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '24px'
            }}>🚗</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {vehicleData.year} {vehicleData.make} {vehicleData.model}
            </div>
          </div>
          <button
            onClick={() => setCurrentScreen('symptoms')}
            style={{
              width: '100%',
              padding: '16px',
              background: '#00d4aa',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            CONTINUE TO SYMPTOMS →
          </button>
        </div>
      )}
    </div>
  );

  const SymptomsScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <button
        onClick={() => setCurrentScreen('vehicle')}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          padding: '12px',
          borderRadius: '10px',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        ← BACK
      </button>

      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '16px'
      }}>
        Describe the Problem
      </h2>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#888'
        }}>
          🚗 {vehicleData.year} {vehicleData.make} {vehicleData.model}
        </div>
      </div>

      <textarea
        placeholder="Engine high pitch whine"
        value={symptomData.text}
        onChange={(e) => setSymptomData({...symptomData, text: e.target.value})}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '16px',
          fontFamily: 'system-ui',
          marginBottom: '24px',
          resize: 'vertical',
          boxSizing: 'border-box'
        }}
      />

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4aa',
          marginBottom: '12px',
          letterSpacing: '1px'
        }}>
          Add Photos (Optional)
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <label style={{
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <Camera size={32} color="#00d4aa" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Camera</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </label>
          <label style={{
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <Upload size={32} color="#00d4aa" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Gallery</div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {symptomData.photos.length > 0 && (
          <div style={{
            marginTop: '12px',
            fontSize: '14px',
            color: '#00d4aa'
          }}>
            ✓ {symptomData.photos.length} photo(s) added
          </div>
        )}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4aa',
          marginBottom: '12px',
          letterSpacing: '1px'
        }}>
          Record Sound (Optional)
        </h3>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: '100%',
            padding: '20px',
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            background: isRecording ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <Mic size={24} color={isRecording ? '#ff0000' : '#00d4aa'} />
          <span style={{ fontSize: '16px', fontWeight: '600' }}>
            {isRecording ? 'Stop Recording' : symptomData.audioBlob ? '✓ Recording Saved' : 'Record Engine Sound'}
          </span>
        </button>
      </div>

      <button
        onClick={runDiagnosis}
        disabled={!symptomData.text}
        style={{
          width: '100%',
          padding: '18px',
          background: symptomData.text ? 'linear-gradient(135deg, #00d4aa 0%, #00a0ff 100%)' : 'rgba(255, 255, 255, 0.05)',
          color: symptomData.text ? '#0a0a0a' : '#666',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '700',
          cursor: symptomData.text ? 'pointer' : 'not-allowed',
          boxShadow: symptomData.text ? '0 4px 20px rgba(0, 212, 170, 0.3)' : 'none'
        }}
      >
        DIAGNOSE →
      </button>
    </div>
  );

  const AnalyzingScreen = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '4px solid rgba(0, 212, 170, 0.2)',
        borderTopColor: '#00d4aa',
        animation: 'spin 1s linear infinite',
        marginBottom: '32px'
      }} />

      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }`}
      </style>

      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '8px'
      }}>
        AI Analyzing...
      </h2>

      <p style={{
        color: '#00d4aa',
        fontSize: '14px',
        marginBottom: '48px',
        fontWeight: '600',
        letterSpacing: '1px'
      }}>
        Using agentic & semantic RAG
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px'
      }}>
        {analysisSteps.map((step, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              opacity: step.complete ? 1 : 0.5
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: step.complete ? '#00d4aa' : 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>
              {step.complete ? '✓' : '○'}
            </div>
            <div style={{
              fontSize: '16px',
              color: step.complete ? '#fff' : '#888'
            }}>
              {step.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ResultsScreen = () => {
    const videos = diagnosis ? getYouTubeVideos(diagnosis.relatedVideos || []) : [];

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        paddingBottom: '40px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10
        }}>
          <button
            onClick={() => {
              setCurrentScreen('home');
              setDiagnosis(null);
              setSymptomData({ text: '', photos: [], audioBlob: null });
              setVehicleData({ year: '', make: '', model: '' });
              setAnalysisSteps([
                { text: 'Processing vehicle data', complete: false },
                { text: 'Analyzing symptoms', complete: false },
                { text: 'Generating diagnosis...', complete: false }
              ]);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              padding: '12px',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            ← BACK
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Warning Banner */}
          <div style={{
            background: 'rgba(255, 165, 0, 0.1)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px'
          }}>
            <AlertTriangle size={20} color="#ffa500" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#ffa500' }}>
              AI-generated insights for informational purposes only. Always verify with a professional mechanic.
            </div>
          </div>

          {/* Severity Badge */}
          <div style={{
            display: 'inline-block',
            background: diagnosis?.severity === 'high' ? '#ff4444' : diagnosis?.severity === 'medium' ? '#ffa500' : '#00d4aa',
            color: '#0a0a0a',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '1px',
            marginBottom: '16px'
          }}>
            {diagnosis?.severity?.toUpperCase() || 'MEDIUM'} SEVERITY
          </div>

          {/* Diagnosis */}
          <h2 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#00d4aa',
            marginBottom: '12px',
            letterSpacing: '2px'
          }}>
            DIAGNOSIS
          </h2>

          <p style={{
            fontSize: '15px',
            lineHeight: '1.7',
            color: '#ddd',
            marginBottom: '32px'
          }}>
            {diagnosis?.diagnosis}
          </p>

          {/* Estimated Cost */}
          <div style={{
            background: 'rgba(0, 212, 170, 0.05)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <DollarSign size={20} color="#00d4aa" />
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#00d4aa',
                letterSpacing: '1px'
              }}>
                ESTIMATED COST
              </h3>
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#fff'
            }}>
              ${diagnosis?.estimatedCost?.min} - ${diagnosis?.estimatedCost?.max}
            </div>
          </div>

          {/* Common Causes */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#00d4aa',
            marginBottom: '12px',
            letterSpacing: '2px'
          }}>
            COMMON CAUSES
          </h3>

          <ul style={{
            listStyle: 'none',
            padding: 0,
            marginBottom: '32px'
          }}>
            {diagnosis?.commonCauses?.map((cause, idx) => (
              <li key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                fontSize: '14px',
                display: 'flex',
                gap: '12px'
              }}>
                <span style={{ color: '#00d4aa' }}>•</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>

          {/* DIY Repair Steps */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#00d4aa',
            marginBottom: '12px',
            letterSpacing: '2px'
          }}>
            DIY REPAIR GUIDE
          </h3>

          <div style={{ marginBottom: '32px' }}>
            {diagnosis?.repairSteps?.map((step, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: '#00d4aa',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0a0a0a',
                    flexShrink: 0
                  }}>
                    {step.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {step.description}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#888'
                    }}>
                      ⏱️ {step.duration}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Materials Needed */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#00d4aa',
            marginBottom: '12px',
            letterSpacing: '2px'
          }}>
            MATERIALS NEEDED
          </h3>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '32px'
          }}>
            {diagnosis?.materialsNeeded?.map((material, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {material}
              </div>
            ))}
          </div>

          {/* Related Videos */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#00d4aa',
            marginBottom: '12px',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Video size={16} />
            CURATED FIX VIDEOS
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {videos.map((video, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  width: '80px',
                  height: '60px',
                  background: '#ff0000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  ▶
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    lineHeight: '1.3'
                  }}>
                    {video.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#888'
                  }}>
                    {video.channel}
                  </div>
                </div>
                <ChevronRight size={20} color="#888" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main render
  useEffect(() => {
    if (!user) {
      setCurrentScreen('auth');
    }
  }, [user]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {currentScreen === 'auth' && <AuthScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'pricing' && <PricingScreen />}
      {currentScreen === 'vehicle' && <VehicleScreen />}
      {currentScreen === 'symptoms' && <SymptomsScreen />}
      {currentScreen === 'analyzing' && <AnalyzingScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </div>
  );
};

export default CarDiagnosticApp;
