/**
 * Landing Page - AppAIHelp.com
 * Pixel-accurate implementation based on design screenshot
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignInModal } from '../components/auth/SignInModal';
import {
  Zap,
  Target,
  Heart,
  Languages,
  FileText,
  Sparkles,
  Mic,
  Edit3,
  Image as ImageIcon,
  BarChart3,
  Code2,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
} from 'lucide-react';

// ============================================
// Navigation Header Component
// ============================================

interface NavigationProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onSignIn, onGetStarted }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A1628] border-b border-slate-800/50">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">AppAIHelp.com</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-sm text-slate-300 hover:text-white transition-colors">
              Home
            </a>
            <a href="#translator" className="text-sm text-slate-300 hover:text-white transition-colors">
              Translator
            </a>
            <a href="#ai-apps" className="text-sm text-slate-300 hover:text-white transition-colors">
              AI Apps
            </a>
            <a href="#why-us" className="text-sm text-slate-300 hover:text-white transition-colors">
              Why Us
            </a>
            <a href="#contact" className="text-sm text-slate-300 hover:text-white transition-colors">
              Contact
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ============================================
// Hero Section Component
// ============================================

interface HeroSectionProps {
  onExploreTools: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onExploreTools }) => {
  return (
    <section className="relative pt-32 pb-20 px-6 lg:px-12 overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-slate-300">New Gen AI Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Empower Your Tasks with{' '}
              <span className="text-teal-400">Next-Gen AI Tools</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              All-in-one platform for practical AI applications starting with our revolutionary
              Multilingual Translator.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4 mb-12">
              <button
                onClick={onExploreTools}
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                Explore Tools
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
                Watch Demo
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div>
                <div className="text-3xl font-bold text-teal-400 mb-1">100+</div>
                <div className="text-sm text-slate-400">Languages</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-teal-400 mb-1">50K+</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-teal-400 mb-1">99.9%</div>
                <div className="text-sm text-slate-400">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-xs text-slate-400">AI Translation Dashboard</span>
              </div>

              {/* Translation Interface */}
              <div className="space-y-4">
                {/* Source Language */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">English</span>
                    <Languages className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-sm text-white">Hello, how are you today?</p>
                </div>

                {/* Translation Arrow */}
                <div className="flex justify-center">
                  <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-white rotate-90" />
                  </div>
                </div>

                {/* Target Language */}
                <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-teal-400">Spanish</span>
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-sm text-white">Hola, ¿cómo estás hoy?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// AI Translator Feature Section
// ============================================

interface TranslatorSectionProps {
  onTryTranslator: () => void;
}

const TranslatorSection: React.FC<TranslatorSectionProps> = ({ onTryTranslator }) => {
  return (
    <section className="py-20 px-6 lg:px-12">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Feature Card */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Context-Aware</h3>
                <p className="text-sm text-teal-400">Smart Translation</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-8">
              Understands cultural nuances and context for accurate results.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <Zap className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-teal-400 mb-1">0.5s</div>
                <div className="text-xs text-slate-400">Response Time</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <Languages className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-teal-400 mb-1">100+</div>
                <div className="text-xs text-slate-400">Languages</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <Mic className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-teal-400 mb-1">Voice</div>
                <div className="text-xs text-slate-400">AI Support</div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-sm text-slate-300">Featured Product</span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              AI Multilingual <span className="text-teal-400">Translator</span>
            </h2>

            <p className="text-lg text-slate-400 mb-8">
              Experience translation like never before. Our AI-powered translator delivers context-aware,
              natural-sounding translations across 100+ languages in real-time.
            </p>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Context-Aware Translation</h4>
                  <p className="text-sm text-slate-400">
                    Advanced AI understands context, idioms, and cultural nuances for precise translations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Languages className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">100+ Languages Supported</h4>
                  <p className="text-sm text-slate-400">
                    From major languages to regional dialects, we've got you covered.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Edit3 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Natural-Sounding Output</h4>
                  <p className="text-sm text-slate-400">
                    Translations sound natural and fluent, just like a native speaker.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onTryTranslator}
              className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              Try it Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// AI Universe Section (Services Grid)
// ============================================

const AIUniverseSection: React.FC = () => {
  const services = [
    {
      icon: <Languages className="w-6 h-6" />,
      title: 'AI Translator',
      description: 'Context-aware multilingual translation in 100+ languages.',
      status: 'USE NOW',
      available: true,
    },
    {
      icon: <Edit3 className="w-6 h-6" />,
      title: 'AI Writing Assistant',
      description: 'Create compelling content with AI-powered writing suggestions.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      title: 'AI Image Generator',
      description: 'Generate stunning visuals from text descriptions instantly.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'AI Data Analyst',
      description: 'Transform raw data into actionable insights automatically.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <Code2 className="w-6 h-6" />,
      title: 'AI Code Assistant',
      description: 'Write, debug, and optimize code with intelligent AI support.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'AI Voice Synthesis',
      description: 'Convert text to natural-sounding speech in multiple voices.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'AI Document Parser',
      description: 'Extract and analyze data from documents automatically.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'AI Chatbot Builder',
      description: 'Create intelligent chatbots for customer support and engagement.',
      status: 'COMING SOON',
      available: false,
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-12">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-slate-300">Exploring Innovation</span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">Our AI Universe</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Discover a growing collection of specialized AI tools designed to streamline your workflow
            and boost productivity.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-6 hover:border-teal-500/30 transition-all"
            >
              <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center justify-center text-teal-400 mb-4">
                {service.icon}
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{service.title}</h3>
              <p className="text-sm text-slate-400 mb-4">{service.description}</p>

              <button
                className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
                  service.available
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700'
                }`}
              >
                {service.status}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// Performance Section
// ============================================

const PerformanceSection: React.FC = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Lightning Fast',
      description:
        'Get results in milliseconds. Our reliable AI models deliver instant responses without compromising quality.',
      metric: '0.5s',
      metricLabel: 'avg response',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Unmatched Accuracy',
      description:
        'Industry-leading precision powered by state-of-the-art machine learning models trained on billions of data points.',
      metric: '99.9%',
      metricLabel: 'accuracy rate',
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'User-Friendly Interface',
      description:
        'Intuitive design that anyone can use. No technical expertise required—just simple, powerful AI tools at your fingertips.',
      metric: '5★',
      metricLabel: 'user rating',
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-12">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-teal-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-slate-300">Why Choose Us</span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">Built for Performance & Precision</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            We combine cutting-edge AI technology with intuitive design to deliver exceptional results
            every time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                {feature.icon}
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 mb-6">{feature.description}</p>

              <div className="inline-flex flex-col">
                <span className="text-3xl font-bold text-teal-400 mb-1">{feature.metric}</span>
                <span className="text-sm text-slate-400">{feature.metricLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// Testimonials Section
// ============================================

const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      content: "Best translation tool I've used. Saves me hours.",
      rating: 5,
      avatar: 'SC',
    },
    {
      name: 'Marcus Johnson',
      role: 'Entrepreneur',
      content: 'Incredibly accurate and fast. A game-changer for my business.',
      rating: 5,
      avatar: 'MJ',
    },
  ];

  return (
    <section className="py-20 px-6 lg:px-12">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <h2 className="text-4xl font-bold text-white mb-4 text-center">
          Trusted by Thousands of Users Worldwide
        </h2>
        <p className="text-lg text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Join our growing community of professionals, students, and businesses who rely on
          AppAIHelp.com for their daily AI needs.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mb-12">
          <div>
            <div className="text-3xl font-bold text-teal-400 mb-1">50K+</div>
            <div className="text-sm text-slate-400">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-teal-400 mb-1">1M+</div>
            <div className="text-sm text-slate-400">Translations</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-teal-400 mb-1">150+</div>
            <div className="text-sm text-slate-400">Countries</div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-slate-400">{testimonial.role}</p>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{testimonial.content}</p>

              <div className="flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// Main Landing Page Component
// ============================================

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleSignInClick = () => {
    setIsSignInModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSignInModalOpen(false);
  };

  const handleLogin = async () => {
    // Mock login - authenticate user and redirect
    await login('demo@example.com', 'password');
    navigate('/translate');
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <Navigation onSignIn={handleSignInClick} onGetStarted={handleLogin} />
      <HeroSection onExploreTools={handleLogin} />
      <TranslatorSection onTryTranslator={handleLogin} />
      <AIUniverseSection />
      <PerformanceSection />
      <TestimonialsSection />

      {/* Sign In Modal */}
      <SignInModal isOpen={isSignInModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default LandingPage;
