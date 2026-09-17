import type { MetaFunction } from 'react-router-dom';
import { createMeta } from '~/lib/meta-utils';
import { PushpayEmbed } from '~/components/pushpay-embed';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Give',
    description: 'Give to Christ Fellowship Church.',
    noIndex: true,
  });
};

export default function GiveEmbed() {
  return (
    <div className='w-full content-padding py-12'>
      <div className='w-full max-w-[420px] mx-auto'>
        <PushpayEmbed />
      </div>
    </div>
  );
}
