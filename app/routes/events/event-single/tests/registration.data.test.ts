import { describe, it, expect } from 'vitest';
import {
  getSubGroupTypeDescription,
  hasSubGroupTypes,
} from '../registration.data';

describe('getSubGroupTypeDescription', () => {
  it('returns the English description by default', () => {
    expect(getSubGroupTypeDescription('Two Days')).toBe(
      'The Journey is the starting point to learn about the heartbeat of Christ Fellowship. Join us for a two-week experience in which you will Know God, Grow in your Relationships, Discover your Purpose & partner with us as we Impact the World together.',
    );
  });

  it('returns the CFDP-4104 Spanish translation when isSpanish is true', () => {
    expect(getSubGroupTypeDescription('Two Days', true)).toBe(
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de dos sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo.',
    );
  });

  it('returns the English Three Days description by default', () => {
    expect(getSubGroupTypeDescription('Three Days')).toBe(
      'The Journey is the starting point to learn the heartbeat of Christ Fellowship. Join us for a three-part experience in which you will Know God, Grow in your Relationships, Discover your Purpose, & partner with us as we Impact the World together.',
    );
  });

  it('returns the Spanish Three Days translation when isSpanish is true', () => {
    expect(getSubGroupTypeDescription('Three Days', true)).toBe(
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de tres sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo.',
    );
  });

  it('returns the English Three Days with Dream Team Kickoff description', () => {
    expect(
      getSubGroupTypeDescription('Three Days with Dream Team Kickoff'),
    ).toBe(
      'Join us for a 3-Session Conversation where you will Know God, Grow in your Relationships, Discover your Purpose, & partner together as we Impact the World. Bonus: This class will include Dream Team Kickoff! Childcare is available through our regularly scheduled CFKids programming.',
    );
  });

  it('returns the Spanish Three Days with Dream Team Kickoff translation when isSpanish is true', () => {
    expect(
      getSubGroupTypeDescription('Three Days with Dream Team Kickoff', true),
    ).toBe(
      '¡Journey es el primer paso para conectarte a Christ Fellowship! Es una clase de tres sesiones donde aprenderás sobre la historia y el corazón de nuestra iglesia. Durante esta experiencia, nuestra oración es que conozcas a Dios, crezcas en tu relación personal con Él y con otros para que puedas descubrir tu propósito e impactar al mundo. ¡Bono! Esta clase incluirá Dream Team Kickoff. Hay cuidado de niños disponible a través de nuestra programación regular de CFKids.',
    );
  });
});

describe('hasSubGroupTypes', () => {
  it('keeps Journey on the event-type step because campuses offer multiple class formats', () => {
    expect(hasSubGroupTypes('Journey')).toBe(true);
  });

  it('skips the event-type step for Baptism because campuses only have At Campus', () => {
    // Prod's extra click is this step: one "Baptism At Campus" card after campus.
    expect(hasSubGroupTypes('Baptism')).toBe(false);
  });
});
