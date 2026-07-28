import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://tansoura.in';
const SITE_NAME = 'Tansoura';
const DEFAULT_TITLE = 'Tansoura - सबसे सस्ते और भरोसेमंद ऑनलाइन शॉपिंग | Honest, Authentic & Affordable Products';
const DEFAULT_DESC = 'Tansoura पर पाएं सबसे सस्ते दामों पर 100% ऑथेंटिक प्रोडक्ट्स। स्किनकेयर, फैशन, इलेक्ट्रॉनिक्स, किराना और भी बहुत कुछ। फ्री डिलीवरी & ईज़ी रिटर्न।';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  keywords,
  noindex = false,
  breadcrumbs = [],
  locale = 'hi_IN',
  publishedTime,
  modifiedTime,
  author,
  product,
  articleSection,
}) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const pageDesc = description || DEFAULT_DESC;
  const pageCanonical = canonical || SITE_URL;
  const image = ogImage || DEFAULT_OG_IMAGE;

  // Build breadcrumb JSON-LD if provided
  const breadcrumbJsonLd = breadcrumbs.length > 0 && breadcrumbs.length < 9
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.item.startsWith('http') ? crumb.item : `${SITE_URL}${crumb.item}`,
        })),
      }
    : null;

  // Build Product JSON-LD
  const productJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.image,
        sku: product.sku,
        mpn: product.sku,
        brand: {
          '@type': 'Brand',
          name: product.brand || SITE_NAME,
        },
        offers: {
          '@type': 'Offer',
          url: pageCanonical,
          priceCurrency: 'INR',
          price: product.price,
          priceValidUntil: product.priceValidUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          itemCondition: 'https://schema.org/NewCondition',
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: SITE_NAME,
          },
        },
        aggregateRating: product.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewCount || 0,
            }
          : undefined,
      }
    : null;

  // Build Article JSON-LD
  const articleJsonLd =
    articleSection && publishedTime
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description: pageDesc,
          image: image,
          datePublished: publishedTime,
          dateModified: modifiedTime || publishedTime,
          author: {
            '@type': 'Person',
            name: author || SITE_NAME,
          },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/logo.png`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': pageCanonical,
          },
        }
      : null;

  const allJsonLd = [breadcrumbJsonLd, productJsonLd, articleJsonLd].filter(Boolean);

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      )}

      {/* Canonical */}
      <link rel="canonical" href={pageCanonical} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={pageCanonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={pageTitle} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content="en_IN" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageCanonical} />
      <meta name="twitter:site" content="@tansoura" />
      <meta name="twitter:creator" content="@tansoura" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={image} />

      {/* AI Search Optimization */}
      <meta name="chatgpt:title" content={pageTitle} />
      <meta name="chatgpt:description" content={pageDesc} />

      {/* Google / Bing / Yandex */}
      <meta name="googlebot" content={noindex ? 'noindex' : 'index, follow'} />
      <meta name="bingbot" content={noindex ? 'noindex' : 'index, follow'} />

      {/* JSON-LD */}
      {allJsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}