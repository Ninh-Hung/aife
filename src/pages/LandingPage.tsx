import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Coins,
  CreditCard,
  Database,
  ImageIcon,
  KeyRound,
  Languages,
  MessageSquare,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { SignInModal } from '../components/auth/SignInModal';
import { useAuth } from '../contexts/AuthContext';

const tokenBenefits = [
  {
    title: 'Unused tokens stay with you',
    description:
      'Remaining tokens from plan changes, cancellations, or deactivated plans move into your wallet.',
    Icon: Wallet,
  },
  {
    title: 'Transparent token refunds',
    description:
      'Refunds, adjustments, and manual grants keep their source history so balances are easy to audit.',
    Icon: RefreshCw,
  },
  {
    title: 'Top up only when needed',
    description:
      'Wallet tokens cover peak usage when your plan tokens are not enough, without forcing an immediate upgrade.',
    Icon: CreditCard,
  },
];

const agentUseCases = [
  'Customer support by product, brand, or branch',
  'Internal assistants for operations, knowledge, and workflows',
  'Specialized agents for sales, translation, RAG, or analysis',
  'Dedicated tenant agents for SaaS and platform businesses',
];

const integrationSteps = [
  {
    label: 'Create agents',
    detail: 'Configure persona, knowledge, and tool permissions.',
    Icon: Bot,
  },
  {
    label: 'Issue API keys',
    detail: 'Limit scope by one agent, many agents, or builder actions.',
    Icon: KeyRound,
  },
  {
    label: 'Call from your app',
    detail: 'Your third-party backend calls the AppAIHelp runtime.',
    Icon: MessageSquare,
  },
  {
    label: 'Track usage',
    detail: 'Tokens are attributed to the owner, agent, API key, and external tenant.',
    Icon: Database,
  },
];

const apiServices = [
  {
    title: 'Multilingual translation',
    description:
      'Call translation services through an API key and let agents localize support, sales, or knowledge workflows.',
    Icon: Languages,
  },
  {
    title: 'Image generation',
    description:
      'Generate campaign visuals, product concepts, social assets, and agent-assisted image outputs from your app.',
    Icon: ImageIcon,
  },
  {
    title: 'Voice to text',
    description:
      'Convert audio into text for agent conversations, call summaries, notes, and searchable customer records.',
    Icon: Mic,
  },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAnonymous } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsSignInModalOpen(true);
  };

  const handlePrimaryAction = () => {
    if (isAuthenticated && !isAnonymous) {
      navigate('/new-chat');
      return;
    }

    openAuthModal('signup');
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <section className="relative min-h-[94vh] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#07111f] [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <header className="relative z-20 flex items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-base font-semibold">AppAIHelp</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('signin')}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-white/40 hover:bg-white/10"
            >
              Sign in
            </button>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Home
            </Link>
          </div>
        </header>

        <main className="relative z-20 px-5 pb-20 pt-14 md:px-8">
          <div className="mx-auto grid min-h-[calc(94vh-88px)] w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,1.1fr)]">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm font-medium text-teal-100">
                <Sparkles size={16} />
                Flexible tokens, purpose-built agents, integration-ready
              </div>
              <h1 className="text-5xl font-bold leading-tight md:text-7xl">AppAIHelp</h1>
              <p className="mt-6 text-lg leading-8 text-slate-200 md:text-xl">
                Create multiple AI agents for different jobs, keep token usage fair, and bring those
                agents into third-party products while staying in control of quota, cost, and usage.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handlePrimaryAction}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200"
                >
                  Start building agents
                  <ArrowRight size={18} />
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
                >
                  Try chat now
                  <MessageSquare size={18} />
                </Link>
              </div>
            </div>

            <div className="hidden rounded-lg border border-white/10 bg-[#0d1728]/80 shadow-2xl shadow-black/40 backdrop-blur lg:block">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-xs uppercase text-teal-200">Owner workspace</div>
                  <div className="mt-1 text-lg font-semibold">Agent runtime control</div>
                </div>
                <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                  Live quota guard
                </div>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {['Salon support agent', 'Sales advisor', 'Internal knowledge bot'].map(
                    (agent, index) => (
                      <div
                        key={agent}
                        className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-400/15 text-teal-200">
                              <Bot size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{agent}</div>
                              <div className="text-xs text-slate-400">
                                API ready / tenant attribution
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-300">
                            {index === 0 ? '42k' : index === 1 ? '18k' : '9k'} tokens
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-[#07111f]/70 p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Coins size={16} className="text-amber-300" />
                    Token wallet
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Package remaining</span>
                      <span>128,400</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Carry-over</span>
                      <span className="text-teal-200">36,000</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Refunded</span>
                      <span className="text-amber-200">8,500</span>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-teal-300" />
                  </div>
                  <div className="mt-5 rounded-lg border border-sky-300/20 bg-sky-400/10 p-3 text-xs text-sky-100">
                    Requests are checked before provider calls, so spend stays predictable.
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <KeyRound size={14} className="text-teal-200" />
                      Service API key
                    </div>
                    <div className="grid gap-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Languages size={14} className="text-indigo-200" />
                        Translation
                      </div>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-amber-200" />
                        Image generation
                      </div>
                      <div className="flex items-center gap-2">
                        <Mic size={14} className="text-rose-200" />
                        Voice to text
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>

      <section className="border-y border-slate-200 bg-white text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Token economy</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Keep what you have not used. Refund what should be returned.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              AppAIHelp keeps recurring plan tokens, wallet tokens, carry-over tokens, and refunded
              tokens clearly separated so users know what remains and where it came from.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {tokenBenefits.map(({ title, description, Icon }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-indigo-700">Agent workspace</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              One account can run many specialized agents.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Each agent can have its own persona, knowledge, and purpose. Users can test in
              AppAIHelp, then publish agents for internal workflows or external systems.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Natural use cases</h3>
                <p className="text-sm text-slate-500">
                  Split agents by real jobs instead of forcing everything into one bot.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {agentUseCases.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#101827] text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-amber-200">Third-party ready</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Bring agents into third-party products while billing stays with the owner.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              AppAIHelp fits SaaS and platform models: create agents, keep API keys on your backend,
              attach external tenant and user metadata, and review usage by agent.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {integrationSteps.map(({ label, detail, Icon }) => (
              <article
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold">{label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.85fr_1.15fr] md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700">Service APIs</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Call AI services with API keys, not manual handoffs.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Product teams can expose translation, image generation, and voice-to-text workflows
              behind scoped API keys while AppAIHelp keeps usage visible by owner, agent, and
              integration.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {apiServices.map(({ title, description, Icon }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold">Ready to make agents part of your product?</h2>
            <p className="mt-3 text-slate-600">
              Start with one agent, then expand across more use cases, customers, and integrations
              as demand grows.
            </p>
          </div>
          <button
            onClick={handlePrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Create your first agent
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <SignInModal
        isOpen={isSignInModalOpen}
        initialMode={authMode}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
