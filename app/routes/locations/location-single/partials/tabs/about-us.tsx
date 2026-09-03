import { OurMissionSection } from '~/routes/about/partials/mission.partial';
import { BeliefsSection } from '~/routes/about/partials/beliefs.partial';
import { ImpactSection } from '~/routes/about/partials/impact.partial';
import { CampusPastorsQuote } from '../../components/tabs-component/about-us/campus-pastors-quote';
import { ConnectWithUs } from '../../components/tabs-component/about-us/connect-with-us';

export const AboutUs = ({
  campusPastor,
  campusUrl,
  isSpanish,
  campusName,
  campusInstagram,
}: {
  campusPastor: {
    email: string;
    firstName: string;
    lastName: string;
    photo: string;
  };
  campusUrl?: string;
  isSpanish?: boolean;
  campusName: string;
  campusInstagram: string;
}) => {
  let englishPastorTitle: string;
  if (campusName === 'CF Everywhere' || campusName.includes('CF Everywhere')) {
    englishPastorTitle = 'Christ Fellowship Everywhere';
  } else if (campusName.includes('Christ Fellowship')) {
    englishPastorTitle = campusName;
  } else {
    englishPastorTitle = `Christ Fellowship ${campusName}`;
  }

  const pastorTitle = isSpanish
    ? 'Orgullosos de ser tu campus de Christ Fellowship más cercano'
    : englishPastorTitle;
  const pastorQuote = isSpanish
    ? 'Nuestros servicios principales de adoración son los domingos, y también nos reunimos como comunidad durante la semana a través de distintos eventos para conectar, crecer y servir juntos. Es un honor ser parte de esta comunidad y nos alegraría que nos acompañes en un servicio este domingo. Si estás buscando una iglesia cerca de ti, será un gusto recibirte, conocerte y caminar contigo.'
    : "We’re so glad you’re here! Christ Fellowship is a church for people at every stage of life and faith. We’re committed to helping people know God personally, grow in their relationships, discover their purpose, and impact their world. We gather every Sunday for worship and offer experiences all throughout the week through groups, classes, and events designed to help you take your next step in faith and build meaningful connections. Whether you're exploring faith or looking for a church home, there's a place for you here.";

  return (
    <div className='flex flex-col w-full'>
      <CampusPastorsQuote
        campusPastor={campusPastor}
        campusUrl={campusUrl}
        isSpanish={isSpanish}
        quote={pastorQuote}
        title={pastorTitle}
      />
      <OurMissionSection isSpanish={isSpanish} />
      <BeliefsSection
        hideChapelImage={true}
        isSpanish={isSpanish}
        background='inverted'
      />
      <ImpactSection isSpanish={isSpanish} />
      <ConnectWithUs
        isSpanish={isSpanish}
        campusName={campusName}
        campusInstagram={campusInstagram}
      />
    </div>
  );
};
