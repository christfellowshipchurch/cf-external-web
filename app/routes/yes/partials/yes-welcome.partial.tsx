// import { useNavigate } from "react-router-dom";
import { Button } from '~/primitives/button/button.primitive';
import { Video } from '~/primitives/video/video.primitive';

export const YesWelcomePartial = ({ isSpanish }: { isSpanish?: boolean }) => {
  // const _navigate = useNavigate();

  return (
    <section className='w-full content-padding'>
      {/* Confetti animation */}
      <Video
        src='/assets/confetti-animation.webm'
        className='pointer-events-none w-full h-screen object-cover absolute top-0 left-0 z-2'
        autoPlay
        loop
        muted
        controls={false}
      />

      {/* Page Content */}
      <div className='relative z-4 mx-auto flex flex-col items-center text-center gap-6 w-full max-w-[900px] text-white mt-16 mb-28 lg:mt-32 lg:mb-50 xl:mt-48 xl:mb-82'>
        <h1 className='text-[40px] lg:text-[52px] font-extrabold text-dark-navy leading-tight'>
          {isSpanish ? (
            <>
              <span className='text-white'>¡Felicitaciones!</span> Acabas de
              tomar <br />
              la mejor decisión de tu vida.
            </>
          ) : (
            <>
              <span className='text-white'>Congratulations!</span> You just made{' '}
              <br />
              the best decision ever.
            </>
          )}
        </h1>
        <p className='lg:text-lg'>
          {isSpanish
            ? 'Al comenzar tu camino con Jesús, queremos que sepas que estamos aquí para caminar junto a ti. Solo completa este breve formulario para que podamos ayudarte a comenzar.'
            : 'As you begin your journey with Jesus, we want you to know that we are here to walk alongside you! Simply fill out this short form so we can help you get started!'}
        </p>

        <Button
          className='w-fit text-navy mt-4 border-none relative z-4'
          intent='white'
          href={isSpanish ? '/dijiste-si/acerca-de-ti' : '/yes/about-you'}
          prefetch='viewport'
        >
          {isSpanish ? '¡Empecemos!' : "Let's get started!"}
        </Button>
      </div>
    </section>
  );
};

export default YesWelcomePartial;
