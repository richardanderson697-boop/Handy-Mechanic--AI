'use client';

import { useState } from 'react';
import { Car, Upload, Mic, Camera, CreditCard } from 'lucide-react';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">Handy Mechanic AI</h1>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </button>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-white leading-tight">
              AI-Powered Car Diagnostics
            </h2>
            <p className="text-xl text-slate-300">
              Get instant, accurate diagnostics for your vehicle using advanced AI technology.
              Upload photos, record sounds, or describe symptoms.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-3">
              <Camera className="h-10 w-10 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Photo Analysis</h3>
              <p className="text-sm text-slate-400">
                Upload images of your vehicle for visual inspection
              </p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-3">
              <Mic className="h-10 w-10 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Audio Recording</h3>
              <p className="text-sm text-slate-400">
                Record engine sounds for acoustic analysis
              </p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-3">
              <Upload className="h-10 w-10 text-blue-500 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Text Description</h3>
              <p className="text-sm text-slate-400">
                Describe the symptoms you're experiencing
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50">
            Start Diagnostic - $4.99
          </button>

          {/* Pricing Info */}
          <div className="flex items-center justify-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Single use: $4.99</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>3-pack: $9.99</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-slate-500 text-sm">
          <p>Powered by Claude AI • Accurate • Fast • Professional</p>
        </footer>
      </div>
    </div>
  );
}
