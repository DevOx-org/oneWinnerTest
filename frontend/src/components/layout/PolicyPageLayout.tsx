import React from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface PolicyPageLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const PolicyPageLayout: React.FC<PolicyPageLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Header />

      {/* Hero Banner */}
      <div className="relative overflow-hidden" style={{ paddingTop: '80px' }}>
        {/* Background layers */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,140,0,0.06) 0%, transparent 50%, rgba(0,240,255,0.03) 100%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '600px',
            height: '400px',
            top: '-100px',
            right: '-100px',
            background:
              'radial-gradient(ellipse, rgba(255,140,0,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Top accent line */}
        <div
          className="h-[1px] w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,140,0,0.4) 30%, rgba(0,240,255,0.2) 60%, transparent)',
          }}
        />

        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-14 sm:py-20 relative z-10 text-center">
          {/* Breadcrumb */}
          <nav className="flex justify-center items-center gap-2 mb-6 text-xs text-gray-600">
            <Link to="/" className="hover:text-gray-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span style={{ color: '#FF8C00' }}>{title}</span>
          </nav>

          <h1
            className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4"
            style={{ lineHeight: 1.1 }}
          >
            {title.split(' ').map((word, i, arr) =>
              i === arr.length - 1 ? (
                <span key={i} style={{ color: '#FF8C00' }}>
                  {' '}{word}
                </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h1>

          {subtitle && (
            <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-4">
              {subtitle}
            </p>
          )}

          {lastUpdated && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs"
              style={{
                background: 'rgba(255,140,0,0.08)',
                border: '1px solid rgba(255,140,0,0.2)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Last updated: {lastUpdated}
            </div>
          )}
        </div>

        {/* Bottom gradient fade */}
        <div
          className="h-[1px] w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)',
          }}
        />
      </div>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <div
          className="rounded-2xl p-6 sm:p-10"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyPageLayout;
