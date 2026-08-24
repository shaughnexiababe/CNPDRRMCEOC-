/**
 * CN-PDRRMO Analytics Engine
 * Implements Predictive and Prescriptive logic for Camarines Norte
 */

import { MUNICIPALITY_DATA, MUNICIPALITIES } from './constants';

/** Susceptibility multipliers — synchronized with the Android app's
 *  GisViewModel.runProvincialAnalysis (0.45/0.30/0.15/0.05). */
export const SUSCEPTIBILITY_MULTIPLIERS = {
  'very_high': 0.45,
  'high': 0.30,
  'medium': 0.15,
  'moderate': 0.15,
  'low': 0.05,
  'none': 0
};

const HH_SIZE = 4.5; // PSA average household size used across the project

const SEVERITY_SCORE = { very_high: 85, high: 70, medium: 45, moderate: 45, low: 20, none: 0 };

/**
 * Baseline municipality statistics derived from the shared hazard profile.
 * Single source of truth for dashboard widgets that used to hardcode
 * fictional population and exposure numbers.
 */
export const deriveMunicipalityStats = () => {
  return MUNICIPALITIES.map(name => {
    const baseline = MUNICIPALITY_DATA[name];
    if (!baseline) return null;
    const hazards = baseline.hazards || {};
    const riskScore = Math.max(
      ...['flood', 'landslide', 'storm_surge', 'tsunami'].map(h => SEVERITY_SCORE[hazards[h]] ?? 0)
    );
    return {
      name,
      population: baseline.population,
      households: Math.round(baseline.population / HH_SIZE),
      riskScore
    };
  }).filter(Boolean);
};

/**
 * Household exposure per municipality & hazard type, derived from the
 * shared baseline. Used by dashboard charts (previously hardcoded).
 */
export const deriveHazardExposureData = () => {
  return MUNICIPALITIES.map(name => {
    const baseline = MUNICIPALITY_DATA[name];
    if (!baseline) return null;
    const hh = baseline.population / HH_SIZE;
    const m = (level) => SUSCEPTIBILITY_MULTIPLIERS[level] ?? 0;
    return {
      municipality: name,
      flood: Math.round(hh * m(baseline.hazards.flood)),
      landslide: Math.round(hh * m(baseline.hazards.landslide)),
      storm_surge: Math.round(hh * m(baseline.hazards.storm_surge))
    };
  }).filter(Boolean);
};

/**
 * Exposed households grouped by the severity of exposure.
 */
export const deriveSeverityDistribution = () => {
  const buckets = { low: 0, medium: 0, moderate: 0, high: 0, very_high: 0 };
  MUNICIPALITIES.forEach(name => {
    const baseline = MUNICIPALITY_DATA[name];
    if (!baseline) return;
    const hh = baseline.population / HH_SIZE;
    ['flood', 'landslide', 'storm_surge'].forEach(h => {
      const level = baseline.hazards[h];
      if (level && buckets[level] !== undefined) {
        buckets[level] += Math.round(hh * (SUSCEPTIBILITY_MULTIPLIERS[level] ?? 0));
      }
    });
  });
  return [
    { name: 'Low', value: buckets.low, color: '#22C55E' },
    { name: 'Moderate', value: buckets.moderate, color: '#F59E0B' },
    { name: 'High', value: buckets.high, color: '#F97316' },
    { name: 'Very High', value: buckets.very_high, color: '#EF4444' }
  ];
};

/**
 * PREDICTIVE ANALYTICS
 * Predicts potential hazard impacts based on forecast parameters
 */
export const predictHazardImpact = (forecast) => {
  const { rainfall24h, windSpeedKph, tideLevelMeters } = forecast;

  const predictions = MUNICIPALITIES.map(muniName => {
    const baseline = MUNICIPALITY_DATA[muniName];
    if (!baseline) return null;

    let floodProb = 0;
    let landslideProb = 0;
    let surgeProb = 0;

    // 1. Flood Prediction (Rainfall + Baseline Susceptibility)
    // Threshold: 100mm/24h triggers "High" risk in susceptible areas
    const rainFactor = Math.min(rainfall24h / 150, 1.2);
    const floodSuscMult = SUSCEPTIBILITY_MULTIPLIERS[baseline.hazards.flood] || 0;
    floodProb = rainFactor * (floodSuscMult / 0.45) * 100;

    // 2. Landslide Prediction (Heavy Rain + Slope/Baseline)
    const landslideSuscMult = SUSCEPTIBILITY_MULTIPLIERS[baseline.hazards.landslide] || 0;
    landslideProb = rainFactor * (landslideSuscMult / 0.45) * 100;

    // 3. Storm Surge (Wind Speed + Tide + Coastal Baseline)
    const windFactor = Math.min(windSpeedKph / 200, 1.0);
    const tideFactor = Math.min(tideLevelMeters / 3.0, 1.0);
    const surgeSusc = baseline.hazards.storm_surge !== 'none' ? 0.45 : 0;
    surgeProb = (windFactor + tideFactor) / 2 * (surgeSusc / 0.45) * 100;

    const maxRisk = Math.max(floodProb, landslideProb, surgeProb);
    let severity = 'low';
    if (maxRisk > 80) severity = 'very_high';
    else if (maxRisk > 60) severity = 'high';
    else if (maxRisk > 30) severity = 'moderate';

    // Synchronized Exposure calculation: Households = (Pop / 4.5) * Susceptibility Multiplier
    const hhExposed = Math.round((baseline.population / 4.5) * Math.max(floodSuscMult, landslideSuscMult));

    return {
      municipality: muniName,
      impactScore: Math.round(maxRisk),
      severity,
      primaryThreat: floodProb >= landslideProb && floodProb >= surgeProb ? 'Flood' : (landslideProb >= surgeProb ? 'Landslide' : 'Storm Surge'),
      exposedPopulation: Math.round(hhExposed * 4.5)
    };
  }).filter(p => p !== null);

  return predictions.sort((a, b) => b.impactScore - a.impactScore);
};

/**
 * PRESCRIPTIVE ANALYTICS
 * Recommends early actions based on predicted impact
 */
export const prescribeEarlyActions = (prediction) => {
  const actions = [];

  prediction.forEach(p => {
    if (p.severity === 'very_high' || p.severity === 'high') {
      actions.push({
        municipality: p.municipality,
        priority: 'critical',
        recommendation: `MANDATORY EVACUATION: Predicted ${p.primaryThreat} impact score ${p.impactScore} is above critical threshold.`,
        resources: 'Dispatch trucks, Pre-position SAR teams at local bridges.'
      });
    } else if (p.severity === 'moderate') {
      actions.push({
        municipality: p.municipality,
        priority: 'high',
        recommendation: `ADVISORY: Monitor ${p.primaryThreat} levels. Alert MDRRMO for possible pre-emptive evacuation.`,
        resources: 'Pre-position Family Food Packs at designated regional hubs.'
      });
    }
  });

  return actions;
};

/**
 * Real-time Data Endpoints for Camarines Norte
 */
export const ANALYTICS_DATA_SOURCES = [
  { name: "PAGASA Daet Station (5014)", type: "Synoptic", info: "Rainfall/Wind Monitoring" },
  { name: "DOST Daet Bridge WLMS", type: "Water Level", info: "Riverine Monitoring" },
  { name: "DOST Labo Bridge WLMS", type: "Water Level", info: "Riverine Monitoring" },
  { name: "DOST Jose Panganiban ARG", type: "Rainfall", info: "Precipitation Monitoring" },
  { name: "PSA 2020 Census", type: "Demographics", info: "Exposure Baseline" }
];
