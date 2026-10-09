import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { RockEmbed } from '~/components';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Rock RMS Embed Test',
    description: 'Test page for embedding Rock RMS content',
    noIndex: true,
  });
};

export default function RockTestPage() {
  const [rockUrl, setRockUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [height, setHeight] = useState(600);
  const [showLoading, setShowLoading] = useState(true);
  const [useAdvancedProxy, setUseAdvancedProxy] = useState(true);

  const handleTestEmbed = () => {
    if (!rockUrl.trim()) return;

    setIsLoading(true);
    // Add some basic validation and URL formatting
    const formattedUrl = rockUrl.trim();

    // If it doesn't start with http, assume it's a relative path
    if (!formattedUrl.startsWith('http')) {
      // You might want to prepend your Rock RMS base URL here
      // formattedUrl = `${process.env.ROCK_BASE_URL || 'https://your-rock-site.com'}${formattedUrl}`;
    }

    // The RockProxyEmbed component will handle the proxy automatically

    setEmbedUrl(formattedUrl);
    setIsLoading(false);
  };

  const handleClear = () => {
    setRockUrl('');
    setEmbedUrl('');
  };

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-6xl mx-auto px-4'>
        <div className='bg-white rounded-lg shadow-lg p-6 mb-6'>
          <h1 className='text-3xl font-bold text-gray-900 mb-4'>
            Rock RMS Embed Test
          </h1>
          <p className='text-gray-600 mb-6'>
            Test embedding Rock RMS pages in your website. Enter a Rock RMS page
            URL below.
          </p>

          <div className='space-y-4'>
            <div>
              <label
                htmlFor='rock-url'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Rock RMS Page URL
              </label>
              <input
                id='rock-url'
                type='url'
                value={rockUrl}
                onChange={(e) => setRockUrl(e.target.value)}
                placeholder='Enter Rock RMS page URL (e.g., /page/123 or https://your-site.com/page/123)'
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>

            <div className='p-4 bg-green-50 border border-green-200 rounded-md'>
              <label className='flex items-center space-x-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={useAdvancedProxy}
                  onChange={(e) => setUseAdvancedProxy(e.target.checked)}
                  className='rounded'
                />
                <span className='text-sm text-green-800 font-medium'>
                  Use advanced proxy (bypasses CORS, loads CSS properly)
                </span>
              </label>
            </div>

            <div className='flex space-x-4'>
              <button
                onClick={handleTestEmbed}
                disabled={!rockUrl.trim() || isLoading}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
              >
                {isLoading ? 'Loading...' : 'Test Embed'}
              </button>

              <button
                onClick={handleClear}
                className='px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700'
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {embedUrl && (
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-900'>
                Embedded Content Preview
              </h2>
              <div className='flex flex-wrap items-center gap-4'>
                <label className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    checked={showLoading}
                    onChange={(e) => setShowLoading(e.target.checked)}
                    className='rounded'
                  />
                  <span className='text-sm text-gray-700'>
                    Show loading state
                  </span>
                </label>
                <label className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    checked={useAdvancedProxy}
                    onChange={(e) => setUseAdvancedProxy(e.target.checked)}
                    className='rounded'
                  />
                  <span className='text-sm text-gray-700'>
                    Use advanced proxy
                  </span>
                </label>
              </div>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Iframe Height (px)
              </label>
              <input
                type='number'
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min='200'
                max='1200'
                className='w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>

            <div className='border border-gray-300 rounded-md overflow-hidden'>
              <RockEmbed
                url={embedUrl}
                height={height}
                showLoading={showLoading}
                useAdvancedProxy={useAdvancedProxy}
                className='w-full'
              />
            </div>

            <div className='mt-4 p-4 bg-gray-100 rounded-md'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>
                Embed URL:
              </h3>
              <code className='text-sm text-gray-600 break-all'>
                {embedUrl}
              </code>
            </div>
          </div>
        )}

        <div className='mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-blue-900 mb-3'>
            Embedding Tips
          </h3>
          <ul className='text-sm text-blue-800 space-y-2'>
            <li>
              • <strong>Try the proxy option</strong> if you get "refused to
              connect" errors
            </li>
            <li>
              • <strong>Use advanced proxy</strong> if CSS isn't loading
              properly
            </li>
            <li>
              • Make sure your Rock RMS site allows iframe embedding (check
              X-Frame-Options header)
            </li>
            <li>
              • Some Rock RMS pages may require authentication - test with
              public pages first
            </li>
            <li>
              • Consider using Rock RMS API endpoints for better integration
            </li>
            <li>• Test responsive behavior on different screen sizes</li>
            <li>• Check for CORS issues if embedding from different domains</li>
          </ul>
        </div>

        <div className='mt-4 bg-green-50 border border-green-200 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-green-900 mb-3'>
            Troubleshooting
          </h3>
          <p className='text-sm text-green-800 mb-3'>
            If you're getting "refused to connect" errors, try these solutions:
          </p>
          <ul className='text-sm text-green-800 space-y-2'>
            <li>
              • <strong>Advanced proxy is automatically enabled</strong> - no
              configuration needed
            </li>
            <li>
              • <strong>CSS loads properly</strong> with the advanced proxy
            </li>
            <li>• Try different URL formats (with/without parameters)</li>
            <li>
              • The component handles all CORS and iframe restrictions
              automatically
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
