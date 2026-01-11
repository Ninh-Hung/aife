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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800/50 bg-[#0A1628]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">AppAIHelp.com</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm text-slate-300 transition-colors hover:text-white">
              Home
            </a>
            <a
              href="#translator"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Translator
            </a>
            <a
              href="#ai-apps"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              AI Apps
            </a>
            <a href="#why-us" className="text-sm text-slate-300 transition-colors hover:text-white">
              Why Us
            </a>
            <a
              href="#contact"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Contact
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="rounded-lg bg-teal-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
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
    <section className="relative overflow-hidden px-6 pb-20 pt-32 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-800/50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-slate-300">New Gen AI Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="mb-6 text-5xl font-bold leading-tight text-white lg:text-6xl">
              Empower Your Tasks with <span className="text-teal-400">Next-Gen AI Tools</span>
            </h1>

            {/* Subheading */}
            <p className="mb-8 text-lg leading-relaxed text-slate-400">
              All-in-one platform for practical AI applications starting with our revolutionary
              Multilingual Translator.
            </p>

            {/* CTA Buttons */}
            <div className="mb-12 flex items-center gap-4">
              <button
                onClick={onExploreTools}
                className="flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
              >
                Explore Tools
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800">
                Watch Demo
                <Play className="h-4 w-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8">
              <div>
                <div className="mb-1 text-3xl font-bold text-teal-400">100+</div>
                <div className="text-sm text-slate-400">Languages</div>
              </div>
              <div>
                <div className="mb-1 text-3xl font-bold text-teal-400">50K+</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
              <div>
                <div className="mb-1 text-3xl font-bold text-teal-400">99.9%</div>
                <div className="text-sm text-slate-400">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 backdrop-blur-sm">
              {/* Dashboard Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-xs text-slate-400">AI Translation Dashboard</span>
              </div>

              {/* Translation Interface */}
              <div className="space-y-4">
                {/* Source Language */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-slate-400">English</span>
                    <Languages className="h-4 w-4 text-teal-400" />
                  </div>
                  <p className="text-sm text-white">Hello, how are you today?</p>
                </div>

                {/* Translation Arrow */}
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500">
                    <ArrowRight className="h-5 w-5 rotate-90 text-white" />
                  </div>
                </div>

                {/* Target Language */}
                <div className="rounded-lg border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-teal-400">Spanish</span>
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
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
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left - Feature Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8">
            {/* Card Header */}
            <div className="mb-6 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Context-Aware</h3>
                <p className="text-sm text-teal-400">Smart Translation</p>
              </div>
            </div>

            <p className="mb-8 text-sm text-slate-400">
              Understands cultural nuances and context for accurate results.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                <Zap className="mx-auto mb-2 h-6 w-6 text-teal-400" />
                <div className="mb-1 text-2xl font-bold text-teal-400">0.5s</div>
                <div className="text-xs text-slate-400">Response Time</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                <Languages className="mx-auto mb-2 h-6 w-6 text-teal-400" />
                <div className="mb-1 text-2xl font-bold text-teal-400">100+</div>
                <div className="text-xs text-slate-400">Languages</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                <Mic className="mx-auto mb-2 h-6 w-6 text-teal-400" />
                <div className="mb-1 text-2xl font-bold text-teal-400">Voice</div>
                <div className="text-xs text-slate-400">AI Support</div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-800/50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-slate-300">Featured Product</span>
            </div>

            <h2 className="mb-6 text-4xl font-bold text-white">
              AI Multilingual <span className="text-teal-400">Translator</span>
            </h2>

            <p className="mb-8 text-lg text-slate-400">
              Experience translation like never before. Our AI-powered translator delivers
              context-aware, natural-sounding translations across 100+ languages in real-time.
            </p>

            {/* Features List */}
            <div className="mb-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10">
                  <CheckCircle2 className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-white">Context-Aware Translation</h4>
                  <p className="text-sm text-slate-400">
                    Advanced AI understands context, idioms, and cultural nuances for precise
                    translations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10">
                  <Languages className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-white">100+ Languages Supported</h4>
                  <p className="text-sm text-slate-400">
                    From major languages to regional dialects, we've got you covered.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10">
                  <Edit3 className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-white">Natural-Sounding Output</h4>
                  <p className="text-sm text-slate-400">
                    Translations sound natural and fluent, just like a native speaker.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onTryTranslator}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
            >
              Try it Now
              <ArrowRight className="h-4 w-4" />
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
      icon: <Languages className="h-6 w-6" />,
      title: 'AI Translator',
      description: 'Context-aware multilingual translation in 100+ languages.',
      status: 'USE NOW',
      available: true,
    },
    {
      icon: <Edit3 className="h-6 w-6" />,
      title: 'AI Writing Assistant',
      description: 'Create compelling content with AI-powered writing suggestions.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <ImageIcon className="h-6 w-6" />,
      title: 'AI Image Generator',
      description: 'Generate stunning visuals from text descriptions instantly.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'AI Data Analyst',
      description: 'Transform raw data into actionable insights automatically.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <Code2 className="h-6 w-6" />,
      title: 'AI Code Assistant',
      description: 'Write, debug, and optimize code with intelligent AI support.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: 'AI Voice Synthesis',
      description: 'Convert text to natural-sounding speech in multiple voices.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'AI Document Parser',
      description: 'Extract and analyze data from documents automatically.',
      status: 'COMING SOON',
      available: false,
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: 'AI Chatbot Builder',
      description: 'Create intelligent chatbots for customer support and engagement.',
      status: 'COMING SOON',
      available: false,
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-800/50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span className="text-sm text-slate-300">Exploring Innovation</span>
          </div>

          <h2 className="mb-4 text-4xl font-bold text-white">Our AI Universe</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Discover a growing collection of specialized AI tools designed to streamline your
            workflow and boost productivity.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all hover:border-teal-500/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400">
                {service.icon}
              </div>

              <h3 className="mb-2 text-lg font-semibold text-white">{service.title}</h3>
              <p className="mb-4 text-sm text-slate-400">{service.description}</p>

              <button
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  service.available
                    ? 'border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                    : 'border border-slate-700 bg-slate-800/50 text-slate-400'
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
      icon: <Zap className="h-8 w-8" />,
      title: 'Lightning Fast',
      description:
        'Get results in milliseconds. Our reliable AI models deliver instant responses without compromising quality.',
      metric: '0.5s',
      metricLabel: 'avg response',
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: 'Unmatched Accuracy',
      description:
        'Industry-leading precision powered by state-of-the-art machine learning models trained on billions of data points.',
      metric: '99.9%',
      metricLabel: 'accuracy rate',
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: 'User-Friendly Interface',
      description:
        'Intuitive design that anyone can use. No technical expertise required—just simple, powerful AI tools at your fingertips.',
      metric: '5★',
      metricLabel: 'user rating',
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-800/50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span className="text-sm text-slate-300">Why Choose Us</span>
          </div>

          <h2 className="mb-4 text-4xl font-bold text-white">Built for Performance & Precision</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            We combine cutting-edge AI technology with intuitive design to deliver exceptional
            results every time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                {feature.icon}
              </div>

              <h3 className="mb-3 text-xl font-bold text-white">{feature.title}</h3>
              <p className="mb-6 text-slate-400">{feature.description}</p>

              <div className="inline-flex flex-col">
                <span className="mb-1 text-3xl font-bold text-teal-400">{feature.metric}</span>
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
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header */}
        <h2 className="mb-4 text-center text-4xl font-bold text-white">
          Trusted by Thousands of Users Worldwide
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-slate-400">
          Join our growing community of professionals, students, and businesses who rely on
          AppAIHelp.com for their daily AI needs.
        </p>

        {/* Stats */}
        <div className="mb-12 flex items-center justify-center gap-12">
          <div>
            <div className="mb-1 text-3xl font-bold text-teal-400">50K+</div>
            <div className="text-sm text-slate-400">Active Users</div>
          </div>
          <div>
            <div className="mb-1 text-3xl font-bold text-teal-400">1M+</div>
            <div className="text-sm text-slate-400">Translations</div>
          </div>
          <div>
            <div className="mb-1 text-3xl font-bold text-teal-400">150+</div>
            <div className="text-sm text-slate-400">Countries</div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 font-semibold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                  <p className="text-sm text-slate-400">{testimonial.role}</p>
                </div>
              </div>

              <p className="mb-4 text-slate-300">{testimonial.content}</p>

              <div className="flex items-center gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
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
