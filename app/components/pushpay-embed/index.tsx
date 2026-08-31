declare global {
  interface Window {
    pushpayEmbeddedConfig?: {
      handle: string;
      wgc: string;
    };
    pushpayEmbeddedFallbackDone?: boolean;
  }
}

import { useEffect } from 'react';

const PUSHPAY_SCRIPT_SRC = 'https://embedded.pushpay.com?version=1.0.0';

export const PushpayEmbed = () => {
  useEffect(() => {
    window.pushpayEmbeddedConfig = {
      handle: 'christfellowship',
      wgc: 'eyJyYnUiOiJodHRwczovL3d3dy5jaHJpc3RmZWxsb3dzaGlwLmNodXJjaC8iLCJyYnQiOiJDaHJpc3QgRmVsbG93c2hpcCIsImFza2dwIjp0cnVlfTp0NWtuMzVaV0NNbXZfMzNMWEFzb0V6RnJ3aEk',
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = PUSHPAY_SCRIPT_SRC;

    const fallback = () => {
      if (!window.pushpayEmbeddedFallbackDone) {
        window.pushpayEmbeddedFallbackDone = true;
        const img = document.createElement('img');
        img.src =
          'https://pushpay.com/Content/Beacons/eb.gif?error=EmbeddedWidgetLoadFailed';
        img.style.cssText =
          'height:1px;width:1px;position:absolute;top:0;left:0;z-index:-1';
        document.body.appendChild(img);
      }
    };

    script.onload = () => {
      window.pushpayEmbeddedFallbackDone = true;
    };
    script.onerror = fallback;
    const timeoutId = window.setTimeout(fallback, 3000);

    document.head.appendChild(script);

    return () => {
      window.clearTimeout(timeoutId);
      script.remove();
    };
  }, []);

  return <div id='pushpay-embedded-giving-fallback' className='w-full' />;
};
