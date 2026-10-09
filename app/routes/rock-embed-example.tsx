import type { MetaFunction } from 'react-router';
import { RockEmbed } from '~/components';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Rock RMS Embed Example',
    description: 'Example of embedding Rock RMS content',
    noIndex: true,
  });
};

export default function RockEmbedExample() {
  // Example Rock RMS URLs - replace with your actual URLs
  const exampleUrls = [
    {
      title: 'Form Example',
      url: 'https://rock.christfellowship.church/page/4861?Group=9db9fbb3-348c-427b-8896-44bf52763b4e',
      description: 'A Rock RMS form or registration page',
    },
  ];

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-6xl mx-auto px-4'>
        <div className='bg-white rounded-lg shadow-lg p-6 mb-6'>
          <h1 className='text-3xl font-bold text-gray-900 mb-4'>
            Rock RMS Embed Examples
          </h1>
          <p className='text-gray-600 mb-6'>
            Examples of how to embed Rock RMS content in your React Router
            application.
          </p>
        </div>

        {exampleUrls.map((example, index) => (
          <div key={index} className='bg-white rounded-lg shadow-lg p-6 mb-6'>
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>
              {example.title}
            </h2>
            <p className='text-gray-600 mb-4'>{example.description}</p>

            <div className='border border-gray-300 rounded-md overflow-hidden'>
              <RockEmbed
                url={example.url}
                height={500}
                showLoading={true}
                useAdvancedProxy={true}
                className='w-full'
              />
            </div>

            <div className='mt-4 p-4 bg-gray-100 rounded-md'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>
                Code Example:
              </h3>
              <pre className='text-sm text-gray-600 overflow-x-auto'>
                {`<RockEmbed
  url="${example.url}"
  height={500}
  showLoading={true}
  useAdvancedProxy={true}
  className="w-full"
/>`}
              </pre>
            </div>
          </div>
        ))}

        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6'>
          <h3 className='text-lg font-semibold text-yellow-900 mb-3'>
            Implementation Notes
          </h3>
          <ul className='text-sm text-yellow-800 space-y-2'>
            <li>
              • Replace the example URLs with your actual Rock RMS page URLs
            </li>
            <li>• Ensure your Rock RMS site allows iframe embedding</li>
            <li>
              • Test with public pages first before trying authenticated content
            </li>
            <li>• Consider using Rock RMS API for better integration</li>
            <li>
              • The RockEmbed component handles loading states and errors
              automatically
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
