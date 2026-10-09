import type { MetaFunction } from 'react-router';
import { createMeta } from '~/lib/meta-utils';

export const meta: MetaFunction = () => {
  return createMeta({
    title: 'Dijiste sí – Devocional de 21 días',
    description:
      'Dijiste sí a Jesús y estamos muy emocionados por ti! Dentro de este devocional, descubrirás más sobre lo que significa seguir a Jesús. Cada día incluirá Escrituras para meditar e ideas para considerar al comenzar tu caminar con Dios. Juntos, analizaremos cómo es tener una relación con Jesús y cómo esa relación cambia nuestras vidas de adentro hacia afuera. Este devocional está organizado en 21 días, pero siéntete libre de seguir el ritmo que mejor te funcione. Esta es simplemente una herramienta que te ayudará a encontrar dirección y una plataforma de lanzamiento para iniciar conversaciones sobre lo que estás aprendiendo. Seguir a Jesús es un viaje en el que nunca tendrás que caminar solo. ¡Nos alegra poder hacer esto juntos!',
    path: '/dijiste-si',
  });
};
