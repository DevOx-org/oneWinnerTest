import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'BattleXGround';
const DOMAIN = 'https://battlexground.com';
const DEFAULT_OG_IMAGE = `${DOMAIN}/images/battlexground-logo.png`;

interface SEOHeadProps {
    /** Page title — will be suffixed with " | BattleXGround" (omit suffix for homepage) */
    title: string;
    /** Meta description — 150-160 chars ideal */
    description: string;
    /** Canonical path, e.g. "/tournaments" (without domain). Defaults to "/" */
    path?: string;
    /** Override OG image URL */
    ogImage?: string;
    /** OG type — defaults to "website" */
    ogType?: string;
    /** Additional JSON-LD structured data */
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
    /** If true, add noindex directive (for protected/private pages) */
    noIndex?: boolean;
}

/**
 * SEOHead — Drop-in <head> management for every page.
 *
 * Usage:
 * ```tsx
 * <SEOHead
 *   title="Live Tournaments"
 *   description="Join daily PUBG, Free Fire, Valorant & COD tournaments..."
 *   path="/tournaments"
 * />
 * ```
 */
const SEOHead: React.FC<SEOHeadProps> = ({
    title,
    description,
    path = '/',
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    jsonLd,
    noIndex = false,
}) => {
    const canonicalUrl = `${DOMAIN}${path}`;
    const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;

    // Normalize JSON-LD to array
    const jsonLdArray = jsonLd
        ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
        : [];

    return (
        <Helmet>
            {/* Primary */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noIndex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="en_IN" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* JSON-LD Structured Data */}
            {jsonLdArray.map((data, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify(data)}
                </script>
            ))}
        </Helmet>
    );
};

export default SEOHead;
